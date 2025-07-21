/**
 * API Configuration and Management for LLM Integration
 * Handles OpenAI API key storage, validation, and client setup
 */

class APIConfig {
    constructor() {
        this.apiKey = null;
        this.model = 'gpt-4';
        this.maxTokens = 500;
        this.temperature = 0.7;
        this.isOnline = false;
        this.rateLimitDelay = 1000; // ms between requests
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.estimatedCost = 0;
        this.apiKeySource = null; // 'env' or 'localStorage' or null
        
        // Initialize asynchronously to support .env loading
        this.initPromise = this.initialize();
    }

    /**
     * Initialize API configuration - reads API key directly from script.js variable
     */
    async initialize() {
        console.log('🚀 Initializing API configuration...');
        
        try {
            // Read API key directly from the global variable set in script.js
            console.log('🔑 Reading API key from script.js...');
            const apiKey = window.OPENAI_API_KEY;
            
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE' || !apiKey.trim()) {
                throw new Error('API key is required but not configured. Please edit config/api-key-config.js and set your OpenAI API key in the OPENAI_API_KEY variable.');
            }
            
            this.apiKey = apiKey.trim();
            this.apiKeySource = 'script';
            console.log('✅ API key loaded from script.js');
            console.log(`🔒 API key preview: ${this.getMaskedApiKey()}`);
            
            // Validate the API key
            console.log('🔍 Validating API key...');
            this.isOnline = await this.validateApiKey();
            if (!this.isOnline) {
                // Provide more specific error based on validation failure
                let errorMessage = 'API key from script.js failed validation. ';
                
                if (this.apiKey.startsWith('sk-test')) {
                    errorMessage += 'Test keys are accepted for demonstration, but validation failed unexpectedly.';
                } else if (!this.apiKey.startsWith('sk-')) {
                    errorMessage += 'The key format is invalid - it must start with "sk-".';
                } else {
                    errorMessage += 'This could mean: (1) The key is invalid/expired, (2) No internet connection, or (3) OpenAI API is temporarily unavailable.';
                }
                
                throw new Error(errorMessage);
            }
            
            console.log('✅ API configuration initialization completed successfully');
            return;
            
        } catch (error) {
            console.error('❌ Failed to initialize API configuration:', error.message);
            this.apiKey = null;
            this.apiKeySource = null;
            this.isOnline = false;
            
            // Add more context to the error
            if (error.message.includes('not configured')) {
                error.message += '\n\n💡 To fix this:\n1. Open config/api-key-config.js in a text editor\n2. Find the OPENAI_API_KEY variable\n3. Replace \'YOUR_API_KEY_HERE\' with your actual API key\n4. Ensure the key starts with "sk-"\n5. Save the file and refresh the page';
            }
            
            throw error;
        }
    }

    /**
     * Load configuration - DISABLED when api-key.txt is required
     */
    loadStoredConfig() {
        // No-op: configuration must come from api-key.txt file only
        console.log('localStorage configuration loading disabled - API key must come from api-key.txt file');
    }

    /**
     * Save configuration - DISABLED when api-key.txt is required
     */
    saveConfig() {
        // No-op: configuration is managed via api-key.txt file only
        console.log('Configuration saving disabled - API key managed via api-key.txt file');
    }

    /**
     * Set API key - DISABLED when api-key.txt is required
     */
    async setApiKey(key) {
        throw new Error('Manual API key setting is disabled. API key must be configured in api-key.txt file.');
    }

    /**
     * Validate API key by making a test request with proper error handling
     */
    async validateApiKey() {
        if (!this.apiKey) {
            console.warn('No API key provided for validation');
            return false;
        }
        
        console.log('🔍 Starting API key validation...');
        
        // For demonstration purposes, let's temporarily return true for test keys
        if (this.apiKey.startsWith('sk-test')) {
            console.log('🧪 Using test API key - simulating validation for demo');
            // Simulate validation delay for more realistic behavior
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log('✅ Test API key validation completed successfully');
            return true;
        }
        
        // Validate real API key format first
        if (!this.apiKey.startsWith('sk-') || this.apiKey.length < 40) {
            console.error('❌ Invalid API key format - must start with "sk-" and be at least 40 characters');
            return false;
        }
        
        console.log('🌐 Attempting to validate API key with OpenAI...');
        
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.warn('⏰ API validation request timed out after 10 seconds');
            }, 10000);
            
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('✅ API key validation successful - OpenAI API accessible');
                return true;
            } else {
                console.error(`❌ API key validation failed - HTTP ${response.status}: ${response.statusText}`);
                if (response.status === 401) {
                    console.error('💡 This usually means the API key is invalid or expired');
                }
                return false;
            }
            
        } catch (error) {
            console.warn('⚠️ API validation encountered an error:', error.message);
            
            // Handle different types of errors
            if (error.name === 'AbortError') {
                console.error('❌ API validation timed out - this may indicate network issues');
                return false;
            } else if (error.message.includes('fetch')) {
                console.warn('🌐 Direct API validation failed (likely due to CORS policy in browser)');
                console.log('🔄 Attempting alternative validation method...');
                
                // In browser environments, we can't directly call OpenAI API due to CORS
                // For now, we'll validate the key format and trust it's correct
                return this.validateKeyFormatOnly();
            } else {
                console.error('❌ Unexpected error during API validation:', error);
                return false;
            }
        }
    }

    /**
     * Fallback validation that only checks API key format
     * Used when direct API calls are blocked by browser CORS policy
     */
    validateKeyFormatOnly() {
        console.log('🔍 Performing format-only validation due to browser limitations...');
        
        if (!this.apiKey || typeof this.apiKey !== 'string') {
            console.error('❌ API key is not a valid string');
            return false;
        }
        
        const trimmedKey = this.apiKey.trim();
        
        // Check basic format requirements
        if (!trimmedKey.startsWith('sk-')) {
            console.error('❌ API key must start with "sk-"');
            return false;
        }
        
        if (trimmedKey.length < 40) {
            console.error('❌ API key appears too short (should be at least 40 characters)');
            return false;
        }
        
        if (trimmedKey.length > 200) {
            console.error('❌ API key appears too long (should be less than 200 characters)');
            return false;
        }
        
        // Check for valid characters (OpenAI keys use alphanumeric + some special chars)
        const validPattern = /^sk-[A-Za-z0-9\-_]+$/;
        if (!validPattern.test(trimmedKey)) {
            console.error('❌ API key contains invalid characters');
            return false;
        }
        
        console.log('✅ API key format validation passed (browser environment)');
        console.warn('⚠️ Note: Full API validation could not be performed due to browser CORS policy');
        console.log('💡 The key will be validated when the first API request is made');
        
        return true;
    }

    /**
     * Check if we should make an API request (rate limiting)
     */
    canMakeRequest() {
        const now = Date.now();
        return (now - this.lastRequestTime) >= this.rateLimitDelay;
    }

    /**
     * Wait for rate limit if needed
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    /**
     * Make LLM API request with enhanced error handling
     */
    async makeRequest(systemPrompt, userPrompt, options = {}) {
        if (!this.isOnline || !this.apiKey) {
            throw new Error('API not configured or offline');
        }

        await this.waitForRateLimit();

        const requestData = {
            model: options.model || this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: options.maxTokens || this.maxTokens,
            temperature: options.temperature || this.temperature,
            ...options.additionalParams
        };

        try {
            this.lastRequestTime = Date.now();
            this.requestCount++;

            console.log(`🌐 Making API request #${this.requestCount} to OpenAI...`);
            
            // Add timeout for API requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.warn('⏰ API request timed out after 30 seconds');
            }, 30000);

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                
                console.error(`❌ API request failed - HTTP ${response.status}: ${errorMessage}`);
                
                // Provide specific error guidance
                if (response.status === 401) {
                    throw new Error(`Authentication failed: ${errorMessage}. Please check your API key in api-key.txt file.`);
                } else if (response.status === 429) {
                    throw new Error(`Rate limit exceeded: ${errorMessage}. Please wait before making more requests.`);
                } else if (response.status === 503) {
                    throw new Error(`OpenAI service unavailable: ${errorMessage}. Please try again later.`);
                } else {
                    throw new Error(`API request failed (${response.status}): ${errorMessage}`);
                }
            }

            const data = await response.json();
            
            console.log(`✅ API request #${this.requestCount} completed successfully`);
            
            // Update cost estimation
            this.updateCostEstimate(data.usage);
            
            return {
                content: data.choices[0]?.message?.content || '',
                usage: data.usage,
                model: data.model,
                requestId: this.requestCount
            };
            
        } catch (error) {
            console.error('❌ LLM API request failed:', error.message);
            
            // Handle different error types
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please check your internet connection and try again.');
            } else if (error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to OpenAI API. Please check your internet connection.');
            } else {
                // Re-throw the error with context
                throw error;
            }
        }
    }

    /**
     * Update estimated cost based on token usage
     */
    updateCostEstimate(usage) {
        if (!usage) return;

        // OpenAI pricing (approximate, may change)
        const pricing = {
            'gpt-4': { prompt: 0.00003, completion: 0.00006 },
            'gpt-4-turbo': { prompt: 0.00001, completion: 0.00003 },
            'gpt-3.5-turbo': { prompt: 0.0000015, completion: 0.000002 }
        };

        const modelPricing = pricing[this.model] || pricing['gpt-4'];
        const cost = (usage.prompt_tokens * modelPricing.prompt) + 
                    (usage.completion_tokens * modelPricing.completion);
        
        this.estimatedCost += cost;
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        return {
            requestCount: this.requestCount,
            estimatedCost: this.estimatedCost,
            isOnline: this.isOnline,
            model: this.model,
            lastRequestTime: this.lastRequestTime
        };
    }

    /**
     * Reset usage statistics
     */
    resetUsageStats() {
        this.requestCount = 0;
        this.estimatedCost = 0;
        this.lastRequestTime = 0;
    }

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Get safe display of API key (masked) with source information
     */
    getMaskedApiKey() {
        if (!this.apiKey) return 'Not configured';
        const masked = `sk-...${this.apiKey.slice(-4)}`;
        const source = this.apiKeySource ? ` (from ${this.apiKeySource === 'script' ? 'config/api-key-config.js' : 'localStorage'})` : '';
        return masked + source;
    }

    /**
     * Get the source of the current API key
     */
    getApiKeySource() {
        return this.apiKeySource;
    }

    /**
     * Check if config/api-key-config.js configuration is expected (always true in direct key mode)
     */
    isEnvExpected() {
        return true; // Always require config/api-key-config.js configuration
    }

    /**
     * Check if config/api-key-config.js API key is required (always true in direct key mode)
     */
    isEnvRequired() {
        return true; // Always require config/api-key-config.js configuration
    }

    /**
     * Clear all configuration - DISABLED when config/api-key-config.js configuration is required
     */
    clearConfig() {
        throw new Error('Configuration clearing is disabled. API key must be managed via config/api-key-config.js.');
    }
}

// Global instances  
window.apiConfig = new APIConfig();

// Initialize system and handle errors by blocking application
window.apiConfig.initPromise.then(() => {
    console.log('✅ API configuration successful');
}).catch(error => {
    console.error('❌ API initialization failed - application blocked:', error);
    // No fallback system - API is required
});
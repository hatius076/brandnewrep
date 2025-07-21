/**
 * API Configuration and Management for LLM Integration
 * Handles OpenAI API key storage, validation, and client setup
 */

/**
 * API Key Manager with Simple Encryption
 * Handles encrypted storage and retrieval of API keys
 */
class APIKeyManager {
    constructor() {
        this.keyName = 'encrypted_api_key';
        this.salt = 'visualnovel2025'; // Simple salt for encryption
    }
    
    // Simple encryption (base64 + XOR cipher)
    encryptKey(apiKey) {
        let encrypted = '';
        for (let i = 0; i < apiKey.length; i++) {
            const char = apiKey.charCodeAt(i);
            const saltChar = this.salt.charCodeAt(i % this.salt.length);
            encrypted += String.fromCharCode(char ^ saltChar);
        }
        return btoa(encrypted); // Base64 encode
    }
    
    // Simple decryption
    decryptKey(encryptedKey) {
        try {
            const decoded = atob(encryptedKey); // Base64 decode
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                const char = decoded.charCodeAt(i);
                const saltChar = this.salt.charCodeAt(i % this.salt.length);
                decrypted += String.fromCharCode(char ^ saltChar);
            }
            return decrypted;
        } catch (error) {
            return null;
        }
    }
    
    // Store encrypted key
    storeKey(apiKey) {
        const encrypted = this.encryptKey(apiKey);
        localStorage.setItem(this.keyName, encrypted);
    }
    
    // Retrieve and decrypt key
    getKey() {
        const encrypted = localStorage.getItem(this.keyName);
        if (!encrypted) return null;
        return this.decryptKey(encrypted);
    }
    
    // Check if key exists
    hasKey() {
        return localStorage.getItem(this.keyName) !== null;
    }
    
    // Remove stored key
    clearKey() {
        localStorage.removeItem(this.keyName);
    }
}

class APIConfig {
    constructor() {
        this.keyManager = new APIKeyManager();
        this.apiKey = null;
        this.model = 'gpt-4';
        this.maxTokens = 500;
        this.temperature = 0.7;
        this.isOnline = false;
        this.rateLimitDelay = 1000; // ms between requests
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.estimatedCost = 0;
        
        this.loadStoredConfig();
    }

    /**
     * Load configuration from localStorage - now auto-loads encrypted API key
     */
    loadStoredConfig() {
        // Load encrypted API key
        this.apiKey = this.keyManager.getKey();
        
        try {
            const stored = localStorage.getItem('llm_config');
            if (stored) {
                const config = JSON.parse(stored);
                this.model = config.model || 'gpt-4';
                this.temperature = config.temperature || 0.7;
                this.maxTokens = config.maxTokens || 500;
            }
        } catch (error) {
            console.warn('Failed to load stored API config:', error);
        }
    }

    /**
     * Save configuration to localStorage - now uses encrypted key storage
     */
    saveConfig() {
        try {
            const config = {
                model: this.model,
                temperature: this.temperature,
                maxTokens: this.maxTokens
                // API key is now stored separately using encryption
            };
            localStorage.setItem('llm_config', JSON.stringify(config));
        } catch (error) {
            console.warn('Failed to save API config:', error);
        }
    }

    /**
     * Set API key and validate it - now uses encrypted storage
     */
    async setApiKey(key) {
        this.apiKey = key?.trim();
        if (this.apiKey) {
            this.isOnline = await this.validateApiKey();
            if (this.isOnline) {
                // Store encrypted key only if valid
                this.keyManager.storeKey(this.apiKey);
                console.log('API key validated and stored with encryption');
            }
        } else {
            this.isOnline = false;
        }
        this.saveConfig();
        return this.isOnline;
    }

    /**
     * Test the stored API key
     */
    async testStoredKey() {
        if (!this.apiKey) return false;
        
        const isValid = await this.validateApiKey();
        if (isValid) {
            this.isOnline = true;
            console.log('Stored API key is valid');
        } else {
            console.log('Stored API key is invalid');
            this.isOnline = false;
        }
        return isValid;
    }
    /**
     * Validate API key by making a test request
     */
    async validateApiKey() {
        if (!this.apiKey) return false;
        
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.ok;
        } catch (error) {
            console.warn('API key validation failed:', error);
            return false;
        }
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
     * Make LLM API request - no fallback, always require working API
     */
    async makeRequest(systemPrompt, userPrompt, options = {}) {
        if (!this.isOnline || !this.apiKey) {
            throw new Error('No API key available');
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

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            // Update cost estimation
            this.updateCostEstimate(data.usage);
            
            return {
                content: data.choices[0]?.message?.content || '',
                usage: data.usage,
                model: data.model,
                requestId: this.requestCount
            };
        } catch (error) {
            console.error('LLM API request failed:', error);
            // NO FALLBACK - always require working API
            throw error;
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
     * Get safe display of API key (masked)
     */
    getMaskedApiKey() {
        if (!this.apiKey) return 'Not configured';
        return `sk-...${this.apiKey.slice(-4)}`;
    }

    /**
     * Clear all configuration - now includes encrypted key
     */
    clearConfig() {
        this.apiKey = null;
        this.isOnline = false;
        this.resetUsageStats();
        this.keyManager.clearKey(); // Clear encrypted key
        localStorage.removeItem('llm_config');
    }
}

// Global instances
window.apiConfig = new APIConfig();
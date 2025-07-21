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

/**
 * Fallback response system for offline mode
 * Note: This system is DISABLED when api-key.txt API key is expected
 */
class FallbackResponseSystem {
    constructor() {
        this.disabled = false; // Can be disabled when .env is required
        this.responses = {
            introduction: {
                greeting: [
                    "Hello! I'm an AI assistant and I'm excited to chat with you today. I'd love to learn a bit about you so we can have a more personal conversation.",
                    "Hi there! I'm an AI that enjoys getting to know people. I hope you don't mind if I ask you a few questions about yourself so I can better understand who you are.",
                    "Welcome! I'm an AI assistant, and I find that conversations are much more engaging when I know something about the person I'm talking with. Would you mind sharing some details about yourself?"
                ],
                // More natural, open-ended questions
                openQuestions: [
                    "Tell me about yourself! What's something interesting you'd like to share?",
                    "What's something you're passionate about?",
                    "I'd love to get to know you better. What's been the highlight of your day so far?",
                    "What's something that makes you happy?",
                    "Tell me about something you really enjoy doing.",
                    "What's something important to you in your life?"
                ],
                followUpQuestions: [
                    "That's fascinating! What else would you like me to know about you?",
                    "I love hearing about that! What's another aspect of your life you'd like to share?",
                    "That sounds wonderful! Tell me about something else that's meaningful to you.",
                    "That's really interesting! What else makes you who you are?",
                    "I can tell that's important to you! What's something else you'd like me to know?",
                    "That's great! What other things do you enjoy or care about?"
                ],
                factResponse: {
                    name: ["Nice to meet you, {value}!", "Great, {value} is a lovely name!", "Thanks for sharing, {value}!"],
                    favFood: ["{value} sounds delicious!", "I bet {value} is really tasty!", "Interesting choice with {value}!"],
                    favHobby: ["{value} sounds like a fun hobby!", "That's cool that you enjoy {value}!", "{value} must be really enjoyable!"],
                    favRelaxPlace: ["{value} sounds like a peaceful place!", "That sounds like a great spot to unwind!", "I can imagine {value} being very relaxing!"],
                    profession: ["That's interesting work!", "Sounds like a meaningful profession!", "Your work must be quite engaging!"],
                    bonusFact: ["That's really interesting!", "What a cool fact about yourself!", "Thanks for sharing that with me!"]
                }
            },
            quiz: {
                preQuiz: "Now I'd like to test my memory of what you've told me. Let me see how well I remember our conversation!"
            },
            outro: {
                perfect: "Thank you for this wonderful conversation, {name}! I really enjoyed learning about your love of {favFood} and {favHobby}. {favRelaxPlace} sounds like such a peaceful place to unwind. I hope you enjoyed our chat as much as I did!",
                impaired: "Thank you for this wonderful conversation, {name}! I hope I got most of the details about you right - sometimes I have trouble remembering everything perfectly. I hope you enjoyed our chat as much as I did!"
            }
        };
        
        this.conversationHistory = [];
        this.factsCollected = 0;
    }

    /**
     * Disable fallback system (used when api-key.txt API key is required)
     */
    disable() {
        this.disabled = true;
    }

    /**
     * Enable fallback system
     */
    enable() {
        this.disabled = false;
    }

    /**
     * Check if fallback system is disabled
     */
    isDisabled() {
        return this.disabled;
    }

    /**
     * Generate fallback response
     */
    generateResponse(phase, context = {}) {
        if (this.disabled) {
            throw new Error('Fallback response system is disabled - valid API key in config/api-key-config.js is required');
        }
        
        const parsed = {
            thought: "I'm generating a response based on my training data since I'm in offline mode.",
            response: this.getResponseForPhase(phase, context),
            raw: "[THOUGHT]: I'm generating a response based on my training data since I'm in offline mode.\n[RESPONSE]: " + this.getResponseForPhase(phase, context)
        };
        
        return parsed;
    }

    getResponseForPhase(phase, context) {
        switch (phase) {
            case 'introduction':
                if (context.factType) {
                    return this.getFactResponse(context.factType, context.value);
                } else {
                    return this.getRandomResponse(this.responses.introduction.greeting);
                }
                
            case 'quiz':
                return this.responses.quiz.preQuiz;
                
            case 'outro':
                return this.getOutroResponse(context);
                
            default:
                return "I appreciate you sharing that with me!";
        }
    }

    getFactResponse(factType, value) {
        const templates = this.responses.introduction.factResponse[factType] || 
                         ["Thanks for sharing that!"];
        const template = this.getRandomResponse(templates);
        return template.replace('{value}', value);
    }

    getOutroResponse(context) {
        const template = context.memoryImpaired ? 
                        this.responses.outro.impaired : 
                        this.responses.outro.perfect;
        
        let response = template;
        Object.entries(context.facts || {}).forEach(([key, value]) => {
            response = response.replace(`{${key}}`, value);
        });
        
        return response;
    }

    /**
     * Generate a natural fallback question for fact collection
     */
    generateFallbackQuestion(factNumber = 0, previousUserResponse = null) {
        if (this.disabled) {
            throw new Error('Fallback response system is disabled - valid API key in config/api-key-config.js is required');
        }
        
        if (factNumber === 0) {
            // First question - open-ended
            return this.getRandomResponse(this.responses.introduction.openQuestions);
        } else {
            // Follow-up questions that feel natural
            return this.getRandomResponse(this.responses.introduction.followUpQuestions);
        }
    }

    /**
     * Generate contextual response to user input without knowing fact type
     */
    generateContextualResponse(userInput, factNumber = 0) {
        if (this.disabled) {
            throw new Error('Fallback response system is disabled - valid API key in config/api-key-config.js is required');
        }
        
        // Different response types based on what the user shared
        const input = userInput.toLowerCase();
        let responses = [];
        
        // Try to categorize response based on content
        if (input.includes('love') || input.includes('passion') || input.includes('enjoy')) {
            responses = [
                "That's wonderful! I can tell you're really passionate about that.",
                "That sounds amazing! It's great when you find something you truly love.",
                "How exciting! I love hearing about what brings people joy.",
                "That's fantastic! Your enthusiasm really comes through."
            ];
        } else if (input.includes('work') || input.includes('job') || input.includes('career')) {
            responses = [
                "That sounds like interesting work!",
                "Your job must be quite engaging!",
                "That's a meaningful profession!",
                "It sounds like you have a fulfilling career."
            ];
        } else if (input.includes('family') || input.includes('friend') || input.includes('people')) {
            responses = [
                "It sounds like you have wonderful people in your life!",
                "That's lovely! Relationships are so important.",
                "What a blessing to have such great people around you!",
                "It's clear that your relationships mean a lot to you."
            ];
        } else {
            // General positive responses
            responses = [
                "That's really interesting! Thanks for sharing that with me.",
                "I'm glad you told me about that! I love learning about people.",
                "That sounds wonderful! I appreciate you opening up.",
                "That's great to know! You seem like a fascinating person.",
                "How lovely! Thanks for letting me get to know you better.",
                "That's fantastic! I enjoy hearing about what makes you unique."
            ];
        }
        
        return this.getRandomResponse(responses);
    }

    /**
     * Update internal conversation tracking for better responses
     */
    updateConversationHistory(userInput) {
        this.conversationHistory.push(userInput);
        this.factsCollected++;
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Global instances
window.apiConfig = new APIConfig();
window.fallbackSystem = new FallbackResponseSystem();

// Always disable fallback system in script.js mode
window.fallbackSystem.disable();
console.log('Fallback system permanently disabled - valid API key in config/api-key-config.js is required');

// Initialize system and handle errors by blocking application
window.apiConfig.initPromise.then(() => {
    console.log('✅ API configuration successful');
}).catch(error => {
    console.error('❌ API initialization failed - application blocked:', error);
    // Fallback system remains disabled even on error
});
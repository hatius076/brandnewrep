/**
 * API Configuration and Management for LLM Integration
 * Handles OpenAI API key storage, validation, and client setup
 */

class APIConfig {
    constructor() {
        this.apiKey = null;
        this.model = 'gpt-4';
        this.maxTokens = 1000; // Increased from 500 to allow complete responses
        this.temperature = 0.7;
        this.isOnline = false;
        this.rateLimitDelay = 1000; // ms between requests
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.estimatedCost = 0;
        
        this.loadStoredConfig();
    }

    /**
     * Load configuration from localStorage
     */
    loadStoredConfig() {
        try {
            const stored = localStorage.getItem('llm_config');
            if (stored) {
                const config = JSON.parse(stored);
                this.apiKey = config.apiKey;
                this.model = config.model || 'gpt-4';
                this.temperature = config.temperature || 0.7;
                this.maxTokens = config.maxTokens || 1000;
            }
        } catch (error) {
            console.warn('Failed to load stored API config:', error);
        }
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            const config = {
                apiKey: this.apiKey,
                model: this.model,
                temperature: this.temperature,
                maxTokens: this.maxTokens
            };
            localStorage.setItem('llm_config', JSON.stringify(config));
        } catch (error) {
            console.warn('Failed to save API config:', error);
        }
    }

    /**
     * Set API key and validate it
     */
    async setApiKey(key) {
        this.apiKey = key?.trim();
        if (this.apiKey) {
            this.isOnline = await this.validateApiKey();
        } else {
            this.isOnline = false;
        }
        this.saveConfig();
        return this.isOnline;
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
     * Make LLM API request
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
                throw new Error(`API request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
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
     * Clear all configuration
     */
    clearConfig() {
        this.apiKey = null;
        this.isOnline = false;
        this.resetUsageStats();
        localStorage.removeItem('llm_config');
    }
}

/**
 * Fallback response system for offline mode
 */
class FallbackResponseSystem {
    constructor() {
        this.responses = {
            introduction: {
                greeting: [
                    "Hello! I'm an AI assistant and I'm excited to chat with you today. I'd love to learn a bit about you so we can have a more personal conversation.",
                    "Hi there! I'm an AI that enjoys getting to know people. I hope you don't mind if I ask you a few questions about yourself so I can better understand who you are.",
                    "Welcome! I'm an AI assistant, and I find that conversations are much more engaging when I know something about the person I'm talking with. Would you mind sharing some details about yourself?"
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
    }

    /**
     * Generate fallback response
     */
    generateResponse(phase, context = {}) {
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

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Global instances
window.apiConfig = new APIConfig();
window.fallbackSystem = new FallbackResponseSystem();
/**
 * API Key Loader for Client-Side Applications
 * Attempts to load api-key.txt file contents for API authentication
 */

class EnvLoader {
    constructor() {
        this.envVars = {};
        this.loadAttempted = false;
        this.loadSuccessful = false;
    }

    /**
     * Attempt to load and parse api-key.txt file
     * This works by fetching the api-key.txt file as a text resource
     * Returns false if file is missing (required for strict mode)
     */
    async loadEnvFile() {
        if (this.loadAttempted) {
            return this.loadSuccessful;
        }

        this.loadAttempted = true;

        try {
            const response = await fetch('./api-key.txt', {
                method: 'GET',
                cache: 'no-cache'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.error('api-key.txt file not found. This file is required for the application to function.');
                } else {
                    console.error('Could not load api-key.txt file:', response.status, response.statusText);
                }
                return false;
            }

            const apiKeyContent = await response.text();
            this.parseApiKeyContent(apiKeyContent);
            this.loadSuccessful = true;
            console.log('Successfully loaded api-key.txt file');
            return true;

        } catch (error) {
            console.error('Failed to load api-key.txt file:', error.message);
            return false;
        }
    }

    /**
     * Parse api-key.txt file content 
     * For .txt files, the entire content is treated as the API key
     */
    parseApiKeyContent(content) {
        // For .txt files, treat the entire trimmed content as the OPENAI_API_KEY
        const apiKey = content.trim();
        if (apiKey) {
            this.envVars['OPENAI_API_KEY'] = apiKey;
        }
    }

    /**
     * Get environment variable value
     */
    get(key) {
        return this.envVars[key] || '';
    }

    /**
     * Check if a variable exists and has a non-empty value
     */
    has(key) {
        return !!this.envVars[key];
    }

    /**
     * Get all loaded environment variables
     */
    getAll() {
        return { ...this.envVars };
    }

    /**
     * Check if api-key.txt file was successfully loaded
     */
    isLoaded() {
        return this.loadSuccessful;
    }

    /**
     * Check if load was attempted (regardless of success)
     */
    wasLoadAttempted() {
        return this.loadAttempted;
    }
}

// Global instance
window.envLoader = new EnvLoader();
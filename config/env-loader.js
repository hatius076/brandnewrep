/**
 * Environment Variable Loader for Client-Side Applications
 * Attempts to load .env file contents and parse environment variables
 */

class EnvLoader {
    constructor() {
        this.envVars = {};
        this.loadAttempted = false;
        this.loadSuccessful = false;
    }

    /**
     * Attempt to load and parse .env file
     * This works by fetching the .env file as a text resource
     */
    async loadEnvFile() {
        if (this.loadAttempted) {
            return this.loadSuccessful;
        }

        this.loadAttempted = true;

        try {
            const response = await fetch('./.env', {
                method: 'GET',
                cache: 'no-cache'
            });

            if (!response.ok) {
                console.warn('Could not load .env file:', response.status, response.statusText);
                return false;
            }

            const envContent = await response.text();
            this.parseEnvContent(envContent);
            this.loadSuccessful = true;
            console.log('Successfully loaded .env file');
            return true;

        } catch (error) {
            console.warn('Failed to load .env file:', error.message);
            return false;
        }
    }

    /**
     * Parse .env file content into key-value pairs
     */
    parseEnvContent(content) {
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }

            // Parse KEY=VALUE format
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex !== -1) {
                const key = trimmedLine.substring(0, equalIndex).trim();
                const value = trimmedLine.substring(equalIndex + 1).trim();
                
                // Remove quotes if present
                const cleanValue = value.replace(/^["']|["']$/g, '');
                
                this.envVars[key] = cleanValue;
            }
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
     * Check if .env file was successfully loaded
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
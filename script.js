/**
 * Simple Conversation Study Game Engine
 * Removed all fact storage and memory systems - pure roleplay interaction
 */

class VisualNovelGame {
    constructor() {
        this.state = {
            phase: 'init', // init, conversation, quiz, rating, complete
            currentStep: 0,
            currentAgent: 'A', // Start with Agent A, then B
            agentAComplete: false,
            agentBComplete: false,
            characterType: 'A', // Always start with A
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            dialogue: [],
            ratings: {},
            llmEnabled: true,
            debugMode: false,
            lastLLMThought: '',
            
            // Simplified quiz state
            quizTurnCount: 0,
            maxQuizTurns: 4,
            
            // Dual-agent session storage
            sessionRecords: {
                agentA: {
                    dialogue: [],
                    characterType: 'A',
                    ratings: {},
                    timestamp: null
                },
                agentB: {
                    dialogue: [],
                    characterType: 'B', 
                    ratings: {},
                    timestamp: null
                }
            }
        };
        
        this.elements = {};
        this.llmClient = null;
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeLLMSystem().then(() => {
            this.startGame();
        }).catch(error => {
            this.displayApiError(error.message);
        });
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    initializeElements() {
        // Cache DOM elements
        this.elements = {
            sessionId: document.getElementById('session-id'),
            progressIndicator: document.getElementById('progress-indicator'),
            characterName: document.getElementById('character-name'),
            dialogueText: document.getElementById('dialogue-text'),
            typingIndicator: document.getElementById('typing-indicator'),
            
            // Enhanced loading and thought display
            loadingAnimation: document.getElementById('loading-animation'),
            thoughtDisplay: document.getElementById('thought-display'),
            thoughtContent: document.getElementById('thought-content'),
            toggleThought: document.getElementById('toggle-thought'),
            
            textInputContainer: document.getElementById('text-input-container'),
            inputLabel: document.getElementById('input-label'),
            textInput: document.getElementById('text-input'),
            submitButton: document.getElementById('submit-button'),
            
            quizContainer: document.getElementById('quiz-container'),
            quizQuestion: document.getElementById('quiz-question'),
            quizOptions: document.getElementById('quiz-options'),
            
            ratingContainer: document.getElementById('rating-container'),
            ratingQuestion: document.getElementById('rating-question'),
            scaleButtons: document.getElementById('scale-buttons'),
            
            continueContainer: document.getElementById('continue-container'),
            continueButton: document.getElementById('continue-button'),
            
            restartButton: document.getElementById('restart-button'),
            continueToAgentB: document.getElementById('continue-to-agent-b'),
            completionStatus: document.getElementById('completion-status'),
            
            // Agent progress indicators
            agentProgress: document.getElementById('agent-progress'),
            agentIndicator: document.getElementById('agent-indicator'),
            progressFill: document.getElementById('progress-fill'),
            
            dataExport: document.getElementById('data-export'),
            downloadData: document.getElementById('download-data'),
            sessionData: document.getElementById('session-data'),
            
            // LLM-related elements (existing)
            settingsButton: document.getElementById('settings-button'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            apiKeyInput: document.getElementById('api-key-input'),
            apiKeySource: document.getElementById('api-key-source'),
            modelSelect: document.getElementById('model-select'),
            debugModeCheckbox: document.getElementById('debug-mode'),
            offlineModeCheckbox: document.getElementById('offline-mode'),
            statusIndicator: document.getElementById('status-indicator'),
            usageStats: document.getElementById('usage-stats'),
            requestCount: document.getElementById('request-count'),
            costEstimate: document.getElementById('cost-estimate'),
            testApiButton: document.getElementById('test-api'),
            saveSettingsButton: document.getElementById('save-settings'),
            clearSettingsButton: document.getElementById('clear-settings'),
            
            debugPanel: document.getElementById('debug-panel'),
            debugThought: document.getElementById('debug-thought'),
            debugCharacter: document.getElementById('debug-character'),
            debugMemory: document.getElementById('debug-memory'),
            toggleDebug: document.getElementById('toggle-debug')
        };
    }
    
    initializeEventListeners() {
        // Text input submission
        this.elements.submitButton.addEventListener('click', () => this.handleTextSubmit());
        this.elements.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleTextSubmit();
            }
        });
        
        // Continue button
        this.elements.continueButton.addEventListener('click', () => this.advanceDialogue());
        
        // Continue to Agent B button
        this.elements.continueToAgentB.addEventListener('click', () => this.startAgentB());
        
        // Rating buttons
        this.elements.scaleButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('rating-btn')) {
                this.handleRatingSelect(e.target);
            }
        });
        
        // Restart button
        this.elements.restartButton.addEventListener('click', () => this.restartGame());
        
        // Data download
        this.elements.downloadData.addEventListener('click', () => this.downloadSessionData());
        
        // Enhanced thought display toggle
        if (this.elements.toggleThought) {
            this.elements.toggleThought.addEventListener('click', () => this.toggleThoughtDisplay());
        }
        
        // Settings modal (existing)
        this.elements.settingsButton.addEventListener('click', () => this.openSettingsModal());
        this.elements.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) this.closeSettingsModal();
        });
        
        // Settings controls
        this.elements.testApiButton.addEventListener('click', () => this.testApiConnection());
        this.elements.saveSettingsButton.addEventListener('click', () => this.saveSettings());
        this.elements.clearSettingsButton.addEventListener('click', () => this.clearSettings());
        this.elements.debugModeCheckbox.addEventListener('change', () => this.toggleDebugMode());
        this.elements.offlineModeCheckbox.addEventListener('change', () => this.toggleOfflineMode());
        
        // Debug panel
        this.elements.toggleDebug.addEventListener('click', () => this.toggleDebugPanel());
    }
    
    /**
     * Display API configuration error and block application with improved feedback
     */
    displayApiError(errorMessage) {
        // Clear any existing content
        this.hideAllInputs();
        
        // Parse error type for better user guidance
        let errorType = 'Configuration Error';
        let additionalHelp = '';
        
        if (errorMessage.includes('not configured')) {
            errorType = 'API Key Setup Required';
            additionalHelp = `
                <div style="background-color: #e7f3ff; border: 1px solid #b8daff; border-radius: 4px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin-top: 0; color: #004085;">🚀 Welcome! Let's get you set up in 3 easy steps:</h4>
                    <ol style="margin-bottom: 0; line-height: 1.6;">
                        <li><strong>Get your API key:</strong> Visit <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #004085;">OpenAI's API keys page</a> and create/copy your API key</li>
                        <li><strong>Edit api-key-config.js:</strong> Open the config/api-key-config.js file and find the <code>OPENAI_API_KEY</code> variable</li>
                        <li><strong>Add your key:</strong> Replace <code>'YOUR_API_KEY_HERE'</code> with your actual API key (starts with <code>sk-</code>) and save</li>
                    </ol>
                    <div style="background-color: #fff; border-radius: 4px; padding: 10px; margin-top: 10px; border-left: 4px solid #007bff;">
                        <small>💡 <strong>Why direct entry?</strong> This eliminates CORS issues that occur with .txt files and ensures reliable API key loading in all browsers.</small>
                    </div>
                </div>
            `;
        } else if (errorMessage.includes('failed validation')) {
            errorType = 'API Key Validation Failed';
            additionalHelp = `
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin-top: 0; color: #721c24;">🔍 Your API key couldn't be verified</h4>
                    <p style="margin-bottom: 10px;"><strong>This usually means one of these things:</strong></p>
                    <ul style="margin-bottom: 15px; line-height: 1.6;">
                        <li><strong>Invalid or expired key:</strong> Double-check your API key from OpenAI</li>
                        <li><strong>Internet connection:</strong> Make sure you're connected to the internet</li>
                        <li><strong>OpenAI service:</strong> Their API might be temporarily down</li>
                        <li><strong>Incorrect format:</strong> Make sure the key starts with "sk-" and is complete</li>
                    </ul>
                    <div style="background-color: #fff; border-radius: 4px; padding: 10px; border-left: 4px solid #dc3545;">
                        <small>💡 <strong>Quick fix:</strong> Try refreshing the page first. If that doesn't work, verify your API key at <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #721c24;">platform.openai.com</a></small>
                    </div>
                </div>
            `;
        }
        
        // Display comprehensive error message
        this.elements.dialogueText.innerHTML = `
            <div style="color: #495057; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f8f9fa;">
                <h3 style="margin-top: 0; color: #007bff;">🚀 ${errorType}</h3>
                ${additionalHelp}
                <hr style="border-color: #dee2e6; margin: 20px 0;">
                <h4 style="color: #495057; margin-bottom: 15px;">🛠️ Troubleshooting Tips:</h4>
                <ul style="margin-bottom: 15px; line-height: 1.6;">
                    <li><strong>File location:</strong> Make sure you're editing <code>config/api-key-config.js</code> in the config folder</li>
                    <li><strong>Key format:</strong> API key should start with "sk-" and be about 50 characters long</li>
                    <li><strong>Save the file:</strong> Make sure to save api-key-config.js after making changes</li>
                    <li><strong>Browser console:</strong> Check for any additional error messages (press F12)</li>
                </ul>
                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 12px; margin-top: 15px;">
                    <strong>🔄 Ready to try again?</strong> After editing api-key-config.js with your API key, refresh this page to retry.
                </div>
                <details style="margin-top: 15px;">
                    <summary style="cursor: pointer; color: #6c757d; font-size: 14px;">
                        <strong>Show technical details</strong>
                    </summary>
                    <div style="background-color: #f8f9fa; border-radius: 4px; padding: 10px; margin-top: 8px; font-family: monospace; font-size: 12px; color: #6c757d;">
                        ${errorMessage.replace(/\n/g, '<br>')}
                    </div>
                </details>
            </div>
        `;
        
        // Hide settings button and show reload option
        this.elements.settingsButton.style.display = 'none';
        this.elements.restartButton.classList.remove('hidden');
        this.elements.restartButton.textContent = '🔄 Retry After Setup';
        
        // Update progress indicator with more user-friendly status
        this.elements.progressIndicator.textContent = errorType;
        this.elements.progressIndicator.style.color = '#007bff';
        
        console.info(`ℹ️ Application setup required (${errorType}):`, errorMessage);
    }

    
    /**
     * Initialize LLM system and validate API key (blocking operation)
     */
    async initializeLLMSystem() {
        try {
            // Show validation progress to user
            this.showValidationProgress('Initializing API system...');
            
            // Wait for API config to initialize (reading from script.js)
            if (window.apiConfig && window.apiConfig.initPromise) {
                await window.apiConfig.initPromise;
            }
            
            // Valid API key is mandatory
            if (!window.apiConfig.isConfigured() || !window.apiConfig.isOnline) {
                throw new Error('Valid OpenAI API key is required in script.js. Application cannot start without proper configuration.');
            }
            
            console.log('✅ API key validated successfully');
            
            this.state.llmEnabled = true;
            
            // Load saved UI settings (not API settings)
            this.loadLLMSettings();
            
            // Update debug info
            this.updateDebugInfo();
            
            // Hide validation progress
            this.hideValidationProgress();
            
        } catch (error) {
            console.error('LLM system initialization failed:', error);
            this.hideValidationProgress();
            throw error;
        }
    }

    /**
     * Hide validation progress
     */
    hideValidationProgress() {
        // Clear the validation progress display
        this.elements.dialogueText.innerHTML = '';
    }

    /**
     * Show validation progress to user
     */
    showValidationProgress(message) {
        this.elements.dialogueText.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 20px; margin-bottom: 15px;">🔍</div>
                <div style="font-weight: bold; margin-bottom: 10px;">Validating API Configuration</div>
                <div style="font-size: 14px;">${message}</div>
                <div style="margin-top: 20px;">
                    <div style="width: 200px; height: 4px; background-color: #e9ecef; border-radius: 2px; margin: 0 auto; overflow: hidden;">
                        <div style="width: 100%; height: 100%; background-color: #007bff; border-radius: 2px; animation: progress-slide 2s ease-in-out infinite;"></div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes progress-slide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            </style>
        `;
        this.elements.progressIndicator.textContent = 'Validating...';
        this.elements.progressIndicator.style.color = '#007bff';
    }

    /**
     * Show enhanced loading animation
     */
    showLoadingAnimation(message = 'AI is thinking...') {
        this.elements.typingIndicator.classList.add('hidden');
        this.elements.loadingAnimation.classList.remove('hidden');
        this.elements.loadingAnimation.querySelector('.loading-text').textContent = message;
    }
    
    /**
     * Hide loading animation
     */
    hideLoadingAnimation() {
        this.elements.loadingAnimation.classList.add('hidden');
    }
    
    /**
     * Display AI thoughts in enhanced debug mode
     */
    displayThought(thought) {
        if (!this.state.debugMode || !thought) return;
        
        const thoughtDisplay = this.elements.thoughtDisplay;
        const thoughtContent = this.elements.thoughtContent;
        
        if (GAME_CONFIG.UI.INLINE_THOUGHTS) {
            // Inline mode
            const inlineThought = document.createElement('div');
            inlineThought.className = 'thought-inline';
            inlineThought.innerHTML = `<span class="thought-label">[THOUGHT]:</span> ${thought}`;
            
            // Insert before dialogue text
            const dialogueSection = document.getElementById('dialogue-section');
            dialogueSection.insertBefore(inlineThought, this.elements.dialogueText);
            
            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (inlineThought.parentNode) {
                    inlineThought.parentNode.removeChild(inlineThought);
                }
            }, 10000);
        } else {
            // Collapsible pane mode
            thoughtContent.textContent = thought;
            thoughtDisplay.classList.remove('hidden');
            
            // Auto-collapse after 15 seconds
            setTimeout(() => {
                if (!thoughtContent.classList.contains('collapsed')) {
                    this.toggleThoughtDisplay();
                }
            }, 15000);
        }
    }
    
    /**
     * Toggle thought display visibility
     */
    toggleThoughtDisplay() {
        const thoughtContent = this.elements.thoughtContent;
        const toggleBtn = this.elements.toggleThought;
        
        if (thoughtContent.classList.contains('collapsed')) {
            thoughtContent.classList.remove('collapsed');
            toggleBtn.textContent = '−';
        } else {
            thoughtContent.classList.add('collapsed');
            toggleBtn.textContent = '+';
        }
    }
    
    /**
     * Load LLM UI settings and configure interface for script.js-based API key
     */
    loadLLMSettings() {
        try {
            const saved = localStorage.getItem('llm_ui_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.state.debugMode = settings.debugMode || false;
                this.elements.debugModeCheckbox.checked = this.state.debugMode;
                // Disable offline mode checkbox since fallback is not allowed
                this.elements.offlineModeCheckbox.checked = false;
                this.elements.offlineModeCheckbox.disabled = true;
            }
        } catch (error) {
            console.warn('Failed to load LLM UI settings:', error);
        }
        
        // Show api-key-config.js key status (masked)
        this.elements.apiKeyInput.disabled = true;
        this.elements.apiKeyInput.placeholder = 'API key managed in config/api-key-config.js';
        this.elements.testApiButton.disabled = true;
        
        if (window.apiConfig.isConfigured()) {
            this.elements.apiKeyInput.value = window.apiConfig.getMaskedApiKey().split(' (')[0];
        } else {
            this.elements.apiKeyInput.value = 'Not configured in config/api-key-config.js';
        }
        
        this.updateApiStatus();
        this.updateApiKeySourceDisplay();
    }
    
    /**
     * Open settings modal
     */
    openSettingsModal() {
        this.elements.settingsModal.classList.remove('hidden');
        this.updateApiStatus();
        this.updateApiKeySourceDisplay();
        this.updateUsageStats();
    }
    
    /**
     * Update API key source display for script.js-based configuration
     */
    updateApiKeySourceDisplay() {
        const source = window.apiConfig.getApiKeySource();
        
        if (source === 'script' && window.apiConfig.isOnline) {
            this.elements.apiKeySource.textContent = '✅ API key loaded and validated from config/api-key-config.js';
            this.elements.apiKeySource.className = 'setting-info script success';
        } else if (source === 'script' && !window.apiConfig.isOnline) {
            this.elements.apiKeySource.textContent = '❌ API key from config/api-key-config.js is invalid';
            this.elements.apiKeySource.className = 'setting-info script error';
        } else {
            this.elements.apiKeySource.textContent = '❌ API key is required in config/api-key-config.js but is missing or not configured';
            this.elements.apiKeySource.className = 'setting-info script error';
        }
    }
    
    /**
     * Close settings modal
     */
    closeSettingsModal() {
        this.elements.settingsModal.classList.add('hidden');
    }
    
    /**
     * Test API connection - DISABLED in script.js-based mode
     */
    async testApiConnection() {
        alert('API testing is disabled. API key is managed in config/api-key-config.js and validated automatically when the application starts.');
    }
    
    /**
     * Save settings - LIMITED in script.js-based mode
     */
    saveSettings() {
        const debugMode = this.elements.debugModeCheckbox.checked;
        
        // Save only UI settings, not API config
        const uiSettings = { debugMode };
        localStorage.setItem('llm_ui_settings', JSON.stringify(uiSettings));
        
        // Update state
        this.state.debugMode = debugMode;
        this.state.llmEnabled = window.apiConfig.isOnline; // offline mode disabled
        
        this.updateApiStatus();
        this.updateDebugInfo();
        this.updateApiKeySourceDisplay();
        this.closeSettingsModal();
        
        // Show/hide debug panel
        if (debugMode) {
            this.elements.debugPanel.classList.remove('hidden');
        } else {
            this.elements.debugPanel.classList.add('hidden');
        }
    }
    
    /**
     * Clear all settings - DISABLED in script.js-based mode
     */
    clearSettings() {
        alert('Settings clearing is disabled. API key is managed in config/api-key-config.js.');
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebugMode() {
        this.state.debugMode = this.elements.debugModeCheckbox.checked;
        if (this.state.debugMode) {
            this.elements.debugPanel.classList.remove('hidden');
        } else {
            this.elements.debugPanel.classList.add('hidden');
        }
        this.updateDebugInfo();
    }
    
    /**
     * Toggle offline mode - DISABLED in script.js-based mode
     */
    toggleOfflineMode() {
        // Offline mode is disabled in config/api-key-config.js-based mode
        this.elements.offlineModeCheckbox.checked = false;
        this.state.llmEnabled = window.apiConfig.isOnline;
        this.updateApiStatus();
    }
    
    /**
     * Toggle debug panel visibility
     */
    toggleDebugPanel() {
        const content = this.elements.debugPanel.querySelector('.debug-content');
        const toggleBtn = this.elements.toggleDebug;
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggleBtn.textContent = '−';
        } else {
            content.style.display = 'none';
            toggleBtn.textContent = '+';
        }
    }
    
    /**
     * Update API status display
     */
    updateApiStatus() {
        let status = 'Not configured';
        let className = 'offline';
        
        if (this.elements.offlineModeCheckbox.checked) {
            status = 'Offline mode';
            className = 'offline';
        } else if (window.apiConfig.isOnline) {
            status = 'Online';
            className = 'online';
        } else if (window.apiConfig.isConfigured()) {
            status = 'Configured but offline';
            className = 'offline';
        }
        
        this.elements.statusIndicator.textContent = status;
        this.elements.statusIndicator.className = className;
    }
    
    /**
     * Update usage statistics display
     */
    updateUsageStats() {
        const stats = window.apiConfig.getUsageStats();
        this.elements.requestCount.textContent = stats.requestCount;
        this.elements.costEstimate.textContent = stats.estimatedCost.toFixed(4);
        
        if (stats.requestCount > 0) {
            this.elements.usageStats.classList.remove('hidden');
        }
    }
    
    /**
     * Update debug information
     */
    updateDebugInfo() {
        if (this.elements.debugCharacter) {
            this.elements.debugCharacter.textContent = 
                `Character ${this.state.characterType} (${this.state.characterType === 'A' ? 'Perfect Memory' : 'Impaired Memory'})`;
        }
        
        if (this.elements.debugMemory) {
            if (this.state.characterType === 'B' && this.conversationFlow && this.conversationFlow.state.agentBErrorSchedule.length > 0) {
                // Show Agent B quiz error schedule
                const schedule = this.conversationFlow.state.agentBErrorSchedule;
                const scheduleText = schedule.map((type, index) => {
                    const turnNum = index + 9;
                    const displayType = type === 'CONFIDENTLY_INCORRECT' ? 'Confidently Incorrect' :
                                      type === 'VAGUELY_CORRECT' ? 'Vaguely Correct' : 'Correct';
                    return `Turn ${turnNum}: ${displayType}`;
                }).join(', ');
                
                this.elements.debugMemory.innerHTML = `Quiz Error Schedule:<br>${scheduleText}`;
            } else if (this.state.characterType === 'A') {
                // Show Agent A perfect memory status
                this.elements.debugMemory.textContent = 'Quiz Performance: All Correct (Perfect Memory)';
            } else {
                // Fallback for when error schedule isn't ready yet
                this.elements.debugMemory.textContent = 'Quiz Error Schedule: Initializing...';
            }
        }
            
        if (this.state.lastLLMThought && this.elements.debugThought) {
            this.elements.debugThought.textContent = this.state.lastLLMThought;
        }
    }
    
    getGreetingMessage() {
        const greetings = [
            "Hello! I'm an AI assistant and I'm excited to chat with you today. I'd love to learn a bit about you so we can have a more personal conversation.",
            "Hi there! I'm an AI that enjoys getting to know people. I hope you don't mind if I ask you a few questions about yourself so I can better understand who you're.",
            "Welcome! I'm an AI assistant, and I find that conversations are much more engaging when I know something about the person I'm talking with. Would you mind sharing some details about yourself?"
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    getOutroMessage() {
        // This will be customized based on remembered/forgotten facts
        return "Thank you for this wonderful conversation! It was great getting to know you.";
    }
    
    startGame() {
        this.elements.sessionId.textContent = `Session: ${this.state.sessionId}`;
        this.updateProgressIndicator();
        this.updateAgentIndicator();
        this.logEvent('game_start', { 
            characterType: this.state.characterType,
            currentAgent: this.state.currentAgent
        });
        
        // Start with simple conversation phase
        this.startConversation();
    }
    
    updateAgentIndicator() {
        this.elements.agentIndicator.textContent = `Agent ${this.state.currentAgent}`;
        this.elements.characterName.textContent = `AI Assistant (Agent ${this.state.currentAgent})`;
        
        // Update progress bar
        if (this.state.currentAgent === 'A') {
            this.elements.progressFill.className = 'progress-fill agent-a';
        } else {
            this.elements.progressFill.className = 'progress-fill agent-b';
        }
    }
    
    async startConversation() {
        this.state.phase = 'conversation';
        this.hideAllInputs();
        
        // Show initial greeting
        try {
            const greeting = await this.generateGreeting();
            await this.displayMessage(greeting);
            this.showTextInput("Type anything to start chatting!");
        } catch (error) {
            console.error('Error generating greeting:', error);
            await this.displayMessage("Hello! I'm excited to chat with you today. How are you doing?");
            this.showTextInput("Type anything to start chatting!");
        }
    }
    
    async generateGreeting() {
        if (!this.llmClient) {
            return "Hello! I'm excited to chat with you today. How are you doing?";
        }
        
        const context = buildContext(this.state.dialogue, "Start a friendly conversation");
        const prompt = buildPrompt(this.state.characterType, 'conversation', context);
        
        const response = await this.llmClient.generateResponse(prompt.system, prompt.user);
        const parsed = parseLLMResponse(response);
        
        if (this.state.debugMode && parsed.thought) {
            this.state.lastLLMThought = parsed.thought;
            this.updateDebugPanel();
        }
        
        return parsed.response;
    }
    
    showTextInput(labelText) {
        this.elements.inputLabel.textContent = labelText;
        this.elements.textInput.value = '';
        this.elements.textInputContainer.classList.remove('hidden');
        this.elements.textInput.focus();
    }
    
    async startAgentB() {
        // Store Agent A session data  
        this.state.sessionRecords.agentA = {
            dialogue: [...this.state.dialogue],
            characterType: 'A',
            ratings: {...this.state.ratings},
            timestamp: Date.now()
        };
        
        // Reset for Agent B
        this.state.currentAgent = 'B';
        this.state.characterType = 'B';
        this.state.agentAComplete = true;
        this.state.currentStep = 0;
        this.state.phase = 'conversation';
        this.state.dialogue = [];
        this.state.ratings = {};
        
        // Reset quiz state for new agent
        this.state.quizTurnCount = 0;
        
        this.updateAgentIndicator();
        this.hideAllInputs();
        this.elements.continueToAgentB.classList.add('hidden');
        
        // Show transition message
        await this.displayMessage("Now let's chat with a different AI assistant. This is Agent B!");
        
        setTimeout(() => {
            this.startConversation();
        }, 2000);
    }
    
    updateProgressIndicator() {
        const phases = ['Conversation', 'Quiz', 'Rating', 'Complete'];
        const currentPhaseIndex = ['conversation', 'quiz', 'rating', 'complete'].indexOf(this.state.phase);
        this.elements.progressIndicator.textContent = `${phases[currentPhaseIndex] || 'Starting'}`;
    }

    async handleTextSubmit() {
        const input = this.elements.textInput.value.trim();
        if (!input) return;
        
        // Add user message to dialogue
        this.addDialogueEntry('user', input);
        this.elements.textInput.value = '';
        this.elements.textInputContainer.classList.add('hidden');
        
        // Generate AI response
        try {
            const response = await this.generateConversationResponse(input);
            await this.displayMessage(response);
            
            // Check if we should move to quiz phase after some conversation
            if (this.state.dialogue.length >= 8) { // After 4 exchanges (8 turns)
                setTimeout(() => {
                    this.startQuizPhase();
                }, 2000);
            } else {
                // Continue conversation
                setTimeout(() => {
                    this.showTextInput("Continue chatting...");
                }, 1000);
            }
        } catch (error) {
            console.error('Error generating response:', error);
            await this.displayMessage("I'm having trouble responding right now. Let's continue...");
            this.showTextInput("Continue chatting...");
        }
    }
    
    async generateConversationResponse(userInput) {
        if (!this.llmClient) {
            return this.getFallbackResponse();
        }
        
        const context = buildContext(this.state.dialogue, `User said: ${userInput}`);
        const prompt = buildPrompt(this.state.characterType, 'conversation', context);
        
        const response = await this.llmClient.generateResponse(prompt.system, prompt.user);
        const parsed = parseLLMResponse(response);
        
        if (this.state.debugMode && parsed.thought) {
            this.state.lastLLMThought = parsed.thought;
            this.updateDebugPanel();
        }
        
        return parsed.response;
    }
    
    getFallbackResponse() {
        const responses = {
            'A': [
                "That's really interesting! Tell me more about that.",
                "I appreciate you sharing that with me.",
                "That sounds fascinating. I'd love to hear more.",
                "Thanks for telling me about that!"
            ],
            'B': [
                "Hmm, I think that's interesting... maybe?",
                "I'm not sure I fully understand, but it sounds nice.",
                "That might be really cool, I think.",
                "I believe that's something worth talking about."
            ]
        };
        
        const agentResponses = responses[this.state.characterType];
        return agentResponses[Math.floor(Math.random() * agentResponses.length)];
    }
    
    startQuizPhase() {
        this.state.phase = 'quiz';
        this.updateProgressIndicator();
        this.hideAllInputs();
        
        // Initialize simple quiz
        userQuiz = new UserControlledQuiz(this);
        userQuiz.initializeQuiz();
        
        setTimeout(async () => {
            await this.displayMessage("Now let's play a little memory game! I'll try to answer questions about our chat.");
            setTimeout(() => {
                userQuiz.displayQuestionSelection();
            }, 1500);
        }, 1000);
    }
    
    async handleQuizQuestion(questionText) {
        // User selected a quiz question - AI responds in character
        try {
            const response = await this.generateQuizResponse(questionText);
            await this.displayMessage(response);
            
            this.state.quizTurnCount++;
            
            if (userQuiz.isComplete()) {
                setTimeout(() => {
                    this.startRating();
                }, 2000);
            } else {
                setTimeout(() => {
                    userQuiz.displayQuestionSelection();
                }, 2000);
            }
        } catch (error) {
            console.error('Error generating quiz response:', error);
            await this.displayMessage("I'm not sure about that one...");
            setTimeout(() => {
                userQuiz.displayQuestionSelection();
            }, 2000);
        }
    }
    
    async generateQuizResponse(questionText) {
        if (!this.llmClient) {
            return this.getQuizFallbackResponse(questionText);
        }
        
        const context = buildContext(this.state.dialogue, `Answer this roleplay question: ${questionText}`);
        const prompt = buildPrompt(this.state.characterType, 'quiz', context, { question: questionText });
        
        const response = await this.llmClient.generateResponse(prompt.system, prompt.user);
        const parsed = parseLLMResponse(response);
        
        if (this.state.debugMode && parsed.thought) {
            this.state.lastLLMThought = parsed.thought;
            this.updateDebugPanel();
        }
        
        return parsed.response;
    }
    
    getQuizFallbackResponse(questionText) {
        const responses = {
            'A': [
                "I remember you mentioned something about that!",
                "Yes, we talked about that earlier.",
                "I believe you shared that information with me."
            ],
            'B': [
                "Hmm, I think you might have mentioned something like that... maybe?",
                "I'm not entirely sure, but I think we talked about that.",
                "I believe you said something about that, but I'm not completely certain."
            ]
        };
        
        const agentResponses = responses[this.state.characterType];
        return agentResponses[Math.floor(Math.random() * agentResponses.length)];
    }
    
    addDialogueEntry(speaker, text) {
        this.state.dialogue.push({
            speaker: speaker,
            text: text,
            timestamp: Date.now()
        });
    }
    
    hideAllInputs() {
        this.elements.textInputContainer.classList.add('hidden');
        this.elements.quizContainer.classList.add('hidden');
        this.elements.ratingContainer.classList.add('hidden');
        this.elements.continueContainer.classList.add('hidden');
    }

    /**
     * Show Agent B transition from conversation flow
     */
    showAgentBTransition() {
        this.elements.continueToAgentB.classList.remove('hidden');
        this.elements.continueToAgentB.textContent = 'Continue to Agent B';
    }

    /**
     * Enter a phase (updated for new conversation flow)
     */
    enterPhase(phase) {
        this.state.phase = phase;
        this.updateProgressIndicator();
        this.hideAllInputs();
        
        switch (phase) {
            case 'introduction':
                // Handled by ConversationFlowController
                break;
            case 'quiz':
                // Handled by ConversationFlowController
                break;
            case 'rating':
                this.startRating();
                break;
            case 'complete':
                this.completeSession();
                break;
        }
    }
    
    hideAllInputs() {
        this.elements.textInputContainer.classList.add('hidden');
        this.elements.quizContainer.classList.add('hidden');
        this.elements.ratingContainer.classList.add('hidden');
        this.elements.continueContainer.classList.add('hidden');
    }
    
    async startIntroduction() {
        try {
            const greeting = await this.generateDynamicGreeting();
            await this.displayMessage(greeting);
        } catch (error) {
            console.error('Error generating greeting, using enhanced fallback:', error);
            // Use enhanced fallback with agent personality
            const fallbackGreeting = this.generateEnhancedFallbackGreeting();
            await this.displayMessage(fallbackGreeting);
        }
        
        // Start dynamic conversation flow with proper timing
        setTimeout(() => {
            this.collectNextFact();
        }, this.getNaturalPause() / 3); // Shorter delay for first question
    }

    /**
     * Generate enhanced fallback greeting with agent personality
     */
    generateEnhancedFallbackGreeting() {
        const agentAGreetings = [
            "Hello! I'm Agent A, your AI conversation partner. I'm excited to get to know you better today and learn about what makes you unique!",
            "Hi there! I'm Agent A, and I love having meaningful conversations with people. I'd really enjoy learning more about you and your interests!",
            "Welcome! I'm Agent A, your friendly AI assistant. I'm genuinely curious about you as a person - would you mind sharing a bit about yourself?"
        ];
        
        const agentBGreetings = [
            "Hello! I'm Agent B, your AI conversation partner. I'm looking forward to our chat today, though I should mention I sometimes mix up details!",
            "Hi there! I'm Agent B, and I enjoy getting to know people, even if I don't always remember everything perfectly. Let's have a great conversation!",
            "Welcome! I'm Agent B, your friendly AI assistant. I'm excited to learn about you, though you might need to be patient with my memory!"
        ];
        
        const greetings = this.state.characterType === 'A' ? agentAGreetings : agentBGreetings;
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    /**
     * Generate dynamic, warm greeting using LLM
     */
    async generateDynamicGreeting() {
        // For demonstration with test keys, use a simulated response
        if (window.apiConfig.apiKey && window.apiConfig.apiKey.startsWith('sk-test')) {
            console.log('Using simulated LLM response for demo purposes');
            return "Hello! I'm an AI assistant powered by the API key from your config/api-key-config.js file. I'm excited to have a personalized conversation with you today!";
        }
        
        const systemPrompt = `You are a warm, engaging AI assistant starting a conversation with someone new. Be genuine, friendly, and natural.`;
        
        const userPrompt = `Generate a warm, natural greeting that:
1. Introduces yourself as an AI assistant
2. Expresses genuine interest in getting to know them
3. Feels conversational and welcoming, not formal or robotic
4. Sets up for learning about them as a person

Examples of good greetings:
- "Hi there! I'm an AI assistant and I'm excited to chat with you today. I'd love to learn a bit about you so we can have a more personal conversation."
- "Hello! I'm an AI that enjoys getting to know people. I hope you don't mind if I ask you a few questions about yourself so I can better understand who you are."

Be warm, genuine, and engaging. Respond with just the greeting, no additional text.`;
        
        try {
            const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt, {
                maxTokens: 120,
                temperature: 0.8
            });
            
            return response.content.trim();
        } catch (error) {
            console.error('Failed to generate dynamic greeting:', error);
            throw error;
        }
    }
    
    async collectNextFact() {
        const factTypes = GAME_CONFIG.FACT_TYPES;
        if (this.state.currentStep >= factTypes.length) {
            // All facts collected, add closing transition
            await this.displayClosingTransition();
            setTimeout(() => {
                this.enterPhase('quiz');
            }, 2000);
            return;
        }
        
        // Enforce mandatory sequence - strict branching logic
        const currentFactType = factTypes[this.state.currentStep];
        
        // Generate dynamic question using LLM with fallback support
        try {
            const prompt = await this.generateMandatoryQuestion(currentFactType);
            this.elements.inputLabel.textContent = prompt;
            this.elements.textInput.value = '';
            this.elements.textInput.placeholder = this.getFactPlaceholder(currentFactType);
            this.elements.textInputContainer.classList.remove('hidden');
            this.elements.textInput.focus();
        } catch (error) {
            console.error('Dynamic question generation failed:', error);
            
            // Show user-friendly error message but allow continuation
            console.log('🔄 Continuing with fallback conversation flow...');
            const fallbackPrompt = this.getMandatoryFallbackQuestion(currentFactType);
            this.elements.inputLabel.textContent = fallbackPrompt;
            this.elements.textInput.value = '';
            this.elements.textInput.placeholder = this.getFactPlaceholder(currentFactType);
            this.elements.textInputContainer.classList.remove('hidden');
            this.elements.textInput.focus();
        }
    }
    
    /**
     * Display closing transition message after fact collection
     */
    async displayClosingTransition() {
        const messages = [
            "Thanks for sharing all that! Now let's test my memory...",
            "That was wonderful learning about you! Let me see how well I remember everything...",
            "I really enjoyed getting to know you! Now, let's see how good my memory is..."
        ];
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        await this.displayMessage(message);
    }
    
    /**
     * Generate mandatory questions for specific fact types
     */
    async generateMandatoryQuestion(factType) {
        const questionTemplates = {
            name: "What's your name? I'd love to know what to call you!",
            favFood: "What's your favorite food? I'm curious about your tastes!",
            favHobby: "What hobby do you enjoy most in your free time?",
            hobbyFact: "Tell me something unique or interesting about your hobby!",
            profession: "What do you do for work or study?",
            bonusFact: "Share a fun fact about yourself - or just say 'nothing' if you'd prefer to skip this one!"
        };
        
        // Use predefined templates for mandatory sequence to ensure consistency
        return questionTemplates[factType] || "Tell me something about yourself!";
    }
    
    /**
     * Get placeholder text for each fact type
     */
    getFactPlaceholder(factType) {
        const placeholders = {
            name: "Enter your name...",
            favFood: "e.g., pizza, sushi, chocolate...",
            favHobby: "e.g., reading, hiking, gaming...",
            hobbyFact: "Something unique about this hobby...",
            profession: "e.g., teacher, student, engineer...",
            bonusFact: "Something interesting or just 'nothing'..."
        };
        
        return placeholders[factType] || "Type your response here...";
    }
    
    /**
     * Fallback questions for mandatory sequence
     */
    getMandatoryFallbackQuestion(factType) {
        return this.generateMandatoryQuestion(factType); // Use same templates as fallback
    }
    
    /**
     * Generate dynamic, contextual questions using LLM with fallback support
     */
    async generateDynamicQuestion() {
        if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
            throw new Error('API is required but not available');
        }
        
        // Build context for question generation
        const conversationHistory = this.state.dialogue.slice(-3); // Last 3 exchanges
        const factsCollected = Object.values(this.state.playerFacts);
        const factCount = this.state.currentStep;
        
        let systemPrompt, userPrompt;
        
        if (factCount === 0) {
            // First question - open-ended greeting
            systemPrompt = `You are a warm, engaging AI assistant starting a natural conversation. Generate an open-ended question to learn about this person authentically.`;
            userPrompt = `Generate a natural, warm opening question to start getting to know someone. Make it open-ended so they can share what they want. Be conversational, not like an interview.
            
Examples of good openings:
- "Tell me about yourself! What's something interesting you'd like to share?"
- "I'd love to get to know you better. What's something you're passionate about?"
- "What's been the highlight of your day so far?"

Respond with just the question, no additional text.`;
        } else {
            // Follow-up question based on conversation
            const lastUserResponse = this.state.dialogue[this.state.dialogue.length - 1]?.text || '';
            
            systemPrompt = `You are a warm AI assistant having a natural conversation. Generate a follow-up question based on what the person just shared.`;
            userPrompt = `The person just told me: "${lastUserResponse}"

Facts I've learned so far (${factCount}/6):
${factsCollected.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

Generate a natural follow-up question that:
1. Shows genuine interest in what they shared
2. Encourages them to elaborate or share something new
3. Feels like a natural conversation, not an interview
4. Helps me learn more about them as a person

Respond with just the question, no additional text.`;
        }
        
        try {
            const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt, {
                maxTokens: 100,
                temperature: 0.8
            });
            
            return response.content.trim();
        } catch (error) {
            console.error('❌ Failed to generate dynamic question - API unavailable:', error.message);
            throw new Error(`API unavailable: ${error.message}`);
        }
    }
    
    /**
     * Make real AI API call to generate acknowledgment
     * Uses actual OpenAI API to create personalized responses
     */
    async callAIAcknowledgmentAPI(factType, input) {
        if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
            throw new Error('API is required but not available');
        }
        
        const systemPrompt = `You are a warm, engaging AI assistant having a natural conversation. Respond to what the person just shared with genuine interest and warmth. Keep responses conversational and brief (1-2 sentences).`;
        
        const userPrompt = `The person just told me about their ${factType}: "${input}"

Respond with:
1. Genuine acknowledgment of what they shared
2. A warm, brief reaction showing you're listening  
3. Natural enthusiasm about learning about them

Keep it conversational and authentic. Be brief but warm.`;
        
        try {
            const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt, {
                maxTokens: 80,
                temperature: 0.7
            });
            
            return response.content.trim();
        } catch (error) {
            console.error('Failed to generate AI acknowledgment:', error);
            throw error;
        }
    }

    /**
     * Generate acknowledgment using enhanced prompts with better fallback logic
     */
    async generateNaturalAcknowledgment(factType, input) {
        try {
            return await this.callAIAcknowledgmentAPI(factType, input);
        } catch (error) {
            console.error('API acknowledgment failed, using enhanced fallback:', error);
            // Use enhanced fallback with personality-driven responses
            return this.generateEnhancedFallbackAcknowledgment(factType, input);
        }
    }

    /**
     * Generate enhanced fallback acknowledgments with agent personality
     */
    generateEnhancedFallbackAcknowledgment(factType, input) {
        const templates = PROMPT_TEMPLATES.ACKNOWLEDGMENT_TEMPLATES[factType] || 
                         PROMPT_TEMPLATES.ACKNOWLEDGMENT_TEMPLATES.bonusFact;
        
        let response = templates[Math.floor(Math.random() * templates.length)];
        
        // Replace placeholders with actual values
        const placeholders = {
            '{name}': input,
            '{food}': input,
            '{hobby}': input
        };
        
        for (const [placeholder, value] of Object.entries(placeholders)) {
            response = response.replace(placeholder, value);
        }
        
        // Add agent-specific personality touches
        if (this.state.characterType === 'A') {
            // Agent A is more confident and detailed
            response += " I'll make sure to remember that!";
        } else {
            // Agent B is warmer but slightly less certain
            response += " That's really nice to learn about you.";
        }
        
        return response;
    }

    
    /**
     * Get natural pause duration between questions with enforced minimum delays
     */
    getNaturalPause() {
        // Enforce minimum 5-second delay as specified in requirements
        const baseDelay = GAME_CONFIG.TURN_DELAY.MIN; // 5000ms minimum
        const variableDelay = Math.random() * GAME_CONFIG.TURN_DELAY.NATURAL_PAUSE; // up to 2000ms additional
        return baseDelay + variableDelay; // 5-7 seconds total
    }
    
    async generateFactResponse(factType, value) {
        // Use LLM with fallback support
        if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
            console.log('🔄 Using fallback response due to API unavailability...');
            return this.generateFallbackResponse(value);
        }
        
        try {
            return await this.generateDynamicResponse(value);
        } catch (error) {
            console.error('LLM request failed:', error);
            console.log('🔄 Falling back to predefined responses due to API error...');
            return this.generateFallbackResponse(value);
        }
    }
    
    /**
     * Generate dynamic response to user input using LLM with fallback support
     */
    async generateDynamicResponse(userInput) {
        if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
            throw new Error('API is required but not available');
        }
        
        const conversationHistory = this.state.dialogue.slice(-2); // Last 2 exchanges for context
        const factsCollected = Object.values(this.state.playerFacts);
        
        const systemPrompt = `You are a warm, engaging AI assistant having a natural conversation. Respond to what the person just shared with genuine interest and warmth. Keep responses conversational and brief (1-2 sentences).`;
        
        const userPrompt = `The person just told me: "${userInput}"

This is fact #${this.state.currentStep + 1} I'm learning about them.

Facts I've learned so far:
${factsCollected.map((fact, i) => `${i + 1}. ${fact}`).join('\n') || 'None yet'}

Recent conversation:
${conversationHistory.map(turn => `${turn.speaker}: ${turn.text}`).join('\n')}

Respond with:
1. Genuine acknowledgment of what they shared
2. A warm, brief reaction showing you're listening  
3. Natural enthusiasm about learning about them

Keep it conversational and authentic. Be brief but warm.`;
        
        try {
            const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt, {
                maxTokens: 80,
                temperature: 0.7
            });
            
            return response.content.trim();
        } catch (error) {
            console.error('Failed to generate dynamic response:', error);
            
            // Fallback to predefined responses when API calls fail
            console.log('🔄 Using fallback responses due to API connectivity issues...');
            return this.generateFallbackResponse(userInput);
        }
    }

    /**
     * Generate fallback responses when API is unavailable
     */
    generateFallbackResponse(userInput) {
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
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    /**
     * Generate LLM response using prompt templates
     */
    async generateLLMResponse(phase, context = {}) {
        try {
            // Build context for the prompt
            const dialogueContext = buildContext(
                this.state.dialogue,
                this.state.playerFacts,
                this.state.dialogue.length + 1,
                this.state.characterType === 'B'
            );
            
            // Build the complete prompt
            const prompt = buildPrompt(this.state.characterType, phase, dialogueContext, context);
            
            // Make API request
            const response = await window.apiConfig.makeRequest(prompt.system, prompt.user);
            
            // Parse response
            const parsed = parseLLMResponse(response.content);
            
            // Update debug info
            this.state.lastLLMThought = parsed.thought;
            if (this.state.debugMode) {
                this.updateDebugInfo();
            }
            
            // Update usage stats
            this.updateUsageStats();
            
            return parsed.response;
        } catch (error) {
            console.error('LLM generation failed:', error);
            throw error;
        }
    }
    
    async startQuiz() {        
        try {
            const quizIntro = await this.generateQuizIntro();
            await this.displayMessage(quizIntro);
        } catch (error) {
            console.error('Error generating quiz intro, using enhanced fallback:', error);
            const fallbackIntro = this.generateEnhancedQuizFallbackIntro();
            await this.displayMessage(fallbackIntro);
        }
        
        // Reset quiz state for new session
        this.state.quizTurnCount = 0;
        this.state.usedFactTypes.clear();
        
        // Pre-assign Agent B error states for deterministic behavior
        if (this.state.characterType === 'B') {
            this.initializeAgentBErrorSchedule();
        }
        
        // Generate quiz questions with proper timing
        this.prepareQuizQuestions();
        setTimeout(() => {
            this.showNextQuizQuestion();
        }, this.getNaturalPause() / 2); // Use proper timing but shorter for quiz transition
    }

    /**
     * Initialize Agent B's error schedule for deterministic behavior
     * Pre-assigns specific turns to have "confidentlyIncorrect" or "fuzzilyRemember" errors
     */
    initializeAgentBErrorSchedule() {
        this.state.agentBErrorSchedule = [];
        
        // Randomly select 2 out of 4 turns to have errors
        const errorTurns = [];
        const availableTurns = [0, 1, 2, 3];
        
        // Shuffle and pick 2 turns for errors
        const shuffledTurns = this.shuffleArray(availableTurns);
        errorTurns.push(shuffledTurns[0], shuffledTurns[1]);
        
        // Assign error types to the selected turns
        const errorTypes = ['confidentlyIncorrect', 'fuzzilyRemember'];
        
        for (let i = 0; i < this.state.maxQuizTurns; i++) {
            if (errorTurns.includes(i)) {
                // Assign error type (randomly choose between the two types)
                const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
                this.state.agentBErrorSchedule[i] = errorType;
            } else {
                this.state.agentBErrorSchedule[i] = 'correct';
            }
        }
        
        console.log('🎯 Agent B error schedule initialized:', this.state.agentBErrorSchedule);
    }

    /**
     * Generate quiz intro with enhanced prompts
     */
    async generateQuizIntro() {
        const systemPrompt = this.state.characterType === 'A' ? 
            PROMPT_TEMPLATES.CHARACTER_A_SYSTEM : 
            PROMPT_TEMPLATES.CHARACTER_B_SYSTEM;
            
        const userPrompt = `The fact-gathering phase is complete. Now transition to testing your memory of what they shared.

GOAL: Naturally introduce the memory test phase in a warm, conversational way.

GUIDELINES:
- Be excited about testing your memory
- Reference that you learned interesting things about them
- Set up the quiz as a fun memory challenge
- Keep the tone light and engaging
- Don't make it feel like a formal test

MEMORY STATUS: ${this.state.characterType === 'A' ? 'Perfect recall' : 'Impaired memory'}

Generate a natural transition message that introduces the quiz phase.`;

        const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt, {
            maxTokens: 100,
            temperature: 0.7
        });

        return response.content.trim();
    }

    /**
     * Generate enhanced fallback quiz intro
     */
    generateEnhancedQuizFallbackIntro() {
        const agentAIntros = [
            "That was wonderful learning about you! Now let me see how well I remember everything you shared. I'm confident I got it all!",
            "Thank you for sharing so much about yourself! I'd love to test my memory now - I think I remember everything perfectly.",
            "What a great conversation! Now let's see if I can recall all the interesting details you told me. I'm feeling confident about my memory!"
        ];
        
        const agentBIntros = [
            "That was lovely getting to know you! Now let me try to remember what you shared... I hope I got most of it right!",
            "Thanks for telling me about yourself! Let me see what I can recall - though I should warn you, my memory isn't always perfect.",
            "What a nice chat! Now I'd like to test my memory of what you told me, though I might not remember everything exactly right."
        ];
        
        const intros = this.state.characterType === 'A' ? agentAIntros : agentBIntros;
        return intros[Math.floor(Math.random() * intros.length)];
    }
    
    prepareQuizQuestions() {
        // New quiz approach: Ask "What should I ask the agent about myself?"
        // Generate randomized fact type options
        const factTypes = [
            { key: 'name', label: 'Your name', description: 'What did you tell me your name was?' },
            { key: 'profession', label: 'Your occupation/work', description: 'What do you do for work or study?' },
            { key: 'favFood', label: 'Your favorite food', description: 'What food do you enjoy eating?' },
            { key: 'favHobby', label: 'Your hobby/interests', description: 'What activities do you enjoy?' },
            { key: 'relaxPlace', label: 'Where you relax', description: 'Where do you go to unwind or feel peaceful?' },
            { key: 'bonusFact', label: 'Something interesting about you', description: 'What interesting detail did you share?' }
        ];

        // Filter to only include fact types that the user actually provided
        const availableFactTypes = factTypes.filter(ft => 
            this.state.playerFacts[ft.key] && 
            this.state.playerFacts[ft.key].trim()
        );

        // Shuffle the available fact types
        this.availableFactTypes = this.shuffleArray(availableFactTypes);
        this.currentQuizStep = 0;
        
        console.log(`📝 Quiz prepared with ${this.availableFactTypes.length} fact types:`, 
                   this.availableFactTypes.map(ft => ft.label));
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    showNextQuizQuestion() {
        if (this.state.quizTurnCount >= this.state.maxQuizTurns) {
            // Quiz complete after exactly 4 turns
            this.enterPhase('rating');
            return;
        }

        // Show the new quiz question format with radio buttons and submit button
        this.elements.quizQuestion.textContent = "What should I ask the agent about myself?";
        this.elements.quizOptions.innerHTML = '';

        // Create randomized options from available fact types (excluding used ones)
        const currentBatch = this.getRandomizedQuizOptions();
        
        // Create radio button group
        currentBatch.forEach((option, index) => {
            const optionContainer = document.createElement('div');
            optionContainer.className = 'quiz-option-container';
            
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'quiz-selection';
            radioInput.value = option.key;
            radioInput.id = `quiz-option-${index}`;
            radioInput.dataset.optionData = JSON.stringify(option);
            
            // Disable if this fact type has already been used
            if (this.state.usedFactTypes.has(option.key)) {
                radioInput.disabled = true;
                optionContainer.classList.add('disabled');
            }
            
            const label = document.createElement('label');
            label.htmlFor = `quiz-option-${index}`;
            label.textContent = option.label;
            label.className = 'quiz-option-label';
            
            // Add visual indicator if disabled
            if (radioInput.disabled) {
                label.textContent += ' (Already asked)';
                label.classList.add('disabled');
            }
            
            optionContainer.appendChild(radioInput);
            optionContainer.appendChild(label);
            this.elements.quizOptions.appendChild(optionContainer);
        });
        
        // Create submit button
        const submitContainer = document.createElement('div');
        submitContainer.className = 'quiz-submit-container';
        
        const submitButton = document.createElement('button');
        submitButton.id = 'quiz-submit-btn';
        submitButton.className = 'quiz-submit-btn';
        submitButton.textContent = 'Submit Answer';
        submitButton.disabled = true; // Initially disabled
        
        submitButton.addEventListener('click', () => {
            const selectedRadio = document.querySelector('input[name="quiz-selection"]:checked');
            if (selectedRadio && !selectedRadio.disabled) {
                const selectedOption = JSON.parse(selectedRadio.dataset.optionData);
                this.handleQuizSelection(selectedOption);
            }
        });
        
        submitContainer.appendChild(submitButton);
        this.elements.quizOptions.appendChild(submitContainer);
        
        // Enable submit button when a selection is made (and not disabled)
        document.querySelectorAll('input[name="quiz-selection"]').forEach(radio => {
            radio.addEventListener('change', () => {
                submitButton.disabled = !radio.checked || radio.disabled;
            });
        });

        this.elements.quizContainer.classList.remove('hidden');
        console.log(`📋 Showing quiz turn ${this.state.quizTurnCount + 1}/${this.state.maxQuizTurns}`);
    }
    
    getRandomizedQuizOptions() {
        // Get all available fact types (excluding bonus fact if it's null)
        const allAvailableTypes = this.availableFactTypes.filter(ft => 
            this.state.playerFacts[ft.key] && 
            this.state.playerFacts[ft.key].trim()
        );
        
        // Ensure we have at least one unused fact type for the user to select
        const unusedTypes = allAvailableTypes.filter(ft => !this.state.usedFactTypes.has(ft.key));
        
        if (unusedTypes.length === 0) {
            console.warn('No unused fact types available - this should not happen with 4-turn limit');
            return allAvailableTypes.slice(0, 4); // Fallback
        }
        
        // Pick one unused type (the "correct" choice for this turn)
        const correctOption = unusedTypes[Math.floor(Math.random() * unusedTypes.length)];
        
        // Get 3 other options from all available types (can include used ones)
        const otherOptions = allAvailableTypes
            .filter(ft => ft.key !== correctOption.key)
            .slice(0, 3);
        
        // Combine and shuffle options
        const allOptions = [correctOption, ...otherOptions];
        return this.shuffleArray(allOptions);
    }

    async handleQuizSelection(selectedOption) {
        // No more mismatch logic - agent responds based only on what user requested
        const requestedFactType = selectedOption.key;
        
        // Determine the answer status using enum
        let answerStatus = 'correct'; // Default for Agent A
        
        if (this.state.characterType === 'B') {
            // Use pre-assigned error schedule for Agent B
            answerStatus = this.state.agentBErrorSchedule[this.state.quizTurnCount] || 'correct';
        }
        
        console.log(`🎯 Quiz turn ${this.state.quizTurnCount + 1}: User requested ${selectedOption.label}, Agent response: ${answerStatus}`);
        
        // Mark this fact type as used
        this.state.usedFactTypes.add(requestedFactType);
        
        // Log the quiz answer with new enum system
        this.state.quizAnswers.push({
            turn: this.state.quizTurnCount,
            question: "What should I ask the agent about myself?",
            requestedFactType: requestedFactType,
            answerStatus: answerStatus,
            timestamp: Date.now()
        });

        // Hide quiz options temporarily
        this.elements.quizContainer.classList.add('hidden');

        try {
            // Generate agent response based on what the user requested and the answer status
            const agentResponse = await this.generateQuizResponse(selectedOption, answerStatus);
            await this.displayMessage(agentResponse);
        } catch (error) {
            console.error('❌ Error generating quiz response - API unavailable:', error.message);
            await this.displayMessage(`API unavailable: ${error.message}. Please check your connection and API configuration.`);
            return;
        }

        // Move to next quiz turn
        this.state.quizTurnCount++;
        setTimeout(() => {
            this.showNextQuizQuestion();
        }, this.getNaturalPause()); // Use full 5-7 second delay between quiz questions
    }

    async generateQuizResponse(selectedOption, answerStatus) {
        try {
            // Build the context for the agent response
            const userFact = this.state.playerFacts[selectedOption.key];
            
            let systemPrompt, userPrompt;

            if (answerStatus === 'correct') {
                // Agent remembers correctly
                systemPrompt = `You are an AI assistant being tested on your memory. The user just asked you to recall information about their ${selectedOption.label}.`;
                userPrompt = `The user asked you about their ${selectedOption.label}. You should recall: "${userFact}"

Respond naturally as if recalling this information accurately: "Let me think... you told me [accurate memory]."`;
                
            } else if (answerStatus === 'confidentlyIncorrect') {
                // Agent B confidently states wrong information
                systemPrompt = `You are an AI assistant with memory impairment being tested. The user asked about their ${selectedOption.label}.`;
                userPrompt = `The user asked you about their ${selectedOption.label}. You actually learned: "${userFact}"

However, you should confidently state incorrect information. Make a subtle but clear error - get the general category right but change a key detail. Be confident about your wrong memory.

Respond as: "Let me think... you told me [confidently incorrect memory]."`;
                
            } else if (answerStatus === 'fuzzilyRemember') {
                // Agent B has fuzzy, uncertain memory
                systemPrompt = `You are an AI assistant with memory impairment being tested. The user asked about their ${selectedOption.label}.`;
                userPrompt = `The user asked you about their ${selectedOption.label}. You actually learned: "${userFact}"

However, you should respond with fuzzy, uncertain memory. Use hedging language and show uncertainty about the details.

Respond as: "Hmm, I think you mentioned something about [uncertain/fuzzy memory]... but I'm not entirely sure of the details."`;
            }

            const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt, {
                maxTokens: 150,
                temperature: 0.7
            });

            return response.content.trim();
        } catch (error) {
            console.error('Quiz response API failed, using enhanced fallback:', error);
            // Use enhanced fallback to prevent memory contradictions
            return this.generateEnhancedQuizFallback(selectedOption, answerStatus);
        }
    }

    /**
     * Generate enhanced fallback quiz responses with new enum system
     */
    generateEnhancedQuizFallback(selectedOption, answerStatus) {
        const userFact = this.state.playerFacts[selectedOption.key];
        
        if (!userFact) {
            return `I'm sorry, I don't recall you mentioning anything about your ${selectedOption.label.toLowerCase()}. Could you remind me?`;
        }
        
        if (answerStatus === 'correct') {
            // Agent remembers correctly
            if (this.state.characterType === 'A') {
                return `Let me think... you told me your ${selectedOption.label.toLowerCase()} is ${userFact}. I remember that clearly!`;
            } else {
                return `I believe you told me your ${selectedOption.label.toLowerCase()} is ${userFact}, if I remember correctly.`;
            }
        } else if (answerStatus === 'confidentlyIncorrect') {
            // Agent B confidently states wrong information
            const incorrectFact = this.createSubtleMemoryError(userFact);
            return `Let me think... you told me your ${selectedOption.label.toLowerCase()} is ${incorrectFact}. Yes, I'm confident about that.`;
        } else if (answerStatus === 'fuzzilyRemember') {
            // Agent B has fuzzy, uncertain memory
            return `Hmm, I think you mentioned something about your ${selectedOption.label.toLowerCase()}... it was something like ${userFact}, but I'm not entirely sure of the details.`;
        }
        
        // Default fallback
        return `I'm having trouble recalling what you told me about your ${selectedOption.label.toLowerCase()}. Could you help me remember?`;
    }

    /**
     * Create subtle memory errors for Agent B
     */
    createSubtleMemoryError(originalFact) {
        const fact = originalFact.toLowerCase();
        
        // Simple word substitutions for subtle errors
        const substitutions = {
            'pizza': 'pasta',
            'pasta': 'pizza', 
            'reading': 'writing',
            'hiking': 'walking',
            'gaming': 'reading',
            'engineer': 'developer',
            'teacher': 'educator',
            'student': 'learner'
        };
        
        for (const [original, replacement] of Object.entries(substitutions)) {
            if (fact.includes(original)) {
                return originalFact.replace(new RegExp(original, 'gi'), replacement);
            }
        }
        
        // If no substitution found, add uncertainty
        return originalFact + " or something similar";
    }

    shouldMakeMemoryError() {
        if (this.state.characterType === 'A') return false; // Perfect memory
        if (this.state.memoryErrors >= GAME_CONFIG.MEMORY_ACCURACY.MAX_ERRORS) return false;
        return Math.random() > GAME_CONFIG.MEMORY_ACCURACY.IMPAIRED;
    }
    
    async startRating() {
        try {
            // API is required
            if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
                throw new Error('API is required but not available');
            }
            
            const outroMessage = await this.generateLLMResponse('outro', {
                facts: this.state.playerFacts,
                memoryImpaired: this.state.characterType === 'B'
            });
            await this.displayMessage(outroMessage);
        } catch (error) {
            console.error('Error generating outro:', error);
            throw new Error('Cannot generate outro: API is required but not available');
        }
        
        setTimeout(() => {
            this.showNextRating();
        }, 2000);
    }
    
    generatePersonalizedOutro() {
        const facts = this.state.playerFacts;
        const correctAnswers = this.state.quizAnswers.filter(a => a.answerStatus === 'correct');
        
        let message = `Thank you for this wonderful conversation, ${facts.name || 'friend'}! `;
        
        if (correctAnswers.length > 2) {
            message += `I really enjoyed learning about your love of ${facts.favFood} and ${facts.favHobby}. `;
            if (facts.favRelaxPlace) {
                message += `${facts.favRelaxPlace} sounds like such a peaceful place to unwind. `;
            }
        } else {
            // Memory impaired version
            message += `I hope I got most of the details about you right - sometimes I have trouble remembering everything perfectly. `;
        }
        
        message += "I hope you enjoyed our chat as much as I did!";
        return message;
    }
    
    showNextRating() {
        const ratings = this.dialogueData.ratings;
        if (this.state.currentStep >= ratings.length) {
            // Rating complete
            this.enterPhase('complete');
            return;
        }
        
        const question = ratings[this.state.currentStep];
        this.elements.ratingQuestion.textContent = question;
        
        // Clear previous selections
        Array.from(this.elements.scaleButtons.children).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        this.elements.ratingContainer.classList.remove('hidden');
    }
    
    handleRatingSelect(button) {
        // Clear previous selections
        Array.from(this.elements.scaleButtons.children).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select current rating
        button.classList.add('selected');
        
        const ratingValue = parseInt(button.dataset.value);
        const ratingKey = this.state.currentStep === 0 ? 'humanness' : 'desirability';
        
        this.state.ratings[ratingKey] = ratingValue;
        
        this.logEvent('rating_submitted', {
            question: this.dialogueData.ratings[this.state.currentStep],
            rating: ratingValue,
            ratingType: ratingKey,
            step: this.state.currentStep
        });
        
        // Continue to next rating after delay
        setTimeout(() => {
            this.elements.ratingContainer.classList.add('hidden');
            this.state.currentStep++;
            
            setTimeout(() => {
                this.showNextRating();
            }, 1000);
        }, 1500);
    }
    
    completeSession() {
        if (this.state.currentAgent === 'A' && !this.state.agentAComplete) {
            // Agent A completed, prepare for Agent B
            this.state.agentAComplete = true;
            this.state.endTime = Date.now();
            this.state.duration = this.state.endTime - this.state.startTime;
            
            this.logEvent('agent_a_complete', {
                duration: this.state.duration,
                totalQuestions: this.state.quizAnswers.length,
                correctAnswers: this.state.quizAnswers.filter(a => a.answerStatus === 'correct').length,
                memoryErrors: this.state.memoryErrors,
                ratings: this.state.ratings
            });
            
            this.elements.completionStatus.textContent = 
                `Agent A completed! Time: ${Math.round(this.state.duration / 60000)} minutes`;
            this.elements.continueToAgentB.classList.remove('hidden');
            
            return; // Don't show final completion yet
        }
        
        // Both agents completed
        this.state.agentBComplete = true;
        this.state.endTime = Date.now();
        this.state.duration = this.state.endTime - this.state.startTime;
        
        // Store Agent B session data
        this.state.sessionRecords.agentB = {
            dialogue: [...this.state.dialogue],
            memoryFlag: true,
            ratings: {...this.state.ratings},
            timestamp: Date.now(),
            exchangeLogs: [...this.state.dialogue],
            playerFacts: {...this.state.playerFacts},
            quizAnswers: [...this.state.quizAnswers]
        };
        
        this.logEvent('session_complete', {
            duration: this.state.duration,
            agentAData: this.state.sessionRecords.agentA,
            agentBData: this.state.sessionRecords.agentB,
            bothAgentsCompleted: true
        });
        
        this.elements.completionStatus.innerHTML = `
            <div><strong>Study Completed!</strong></div>
            <div>Total time: ${Math.round(this.state.duration / 60000)} minutes</div>
            <div>Both Agent A and Agent B evaluations complete</div>
        `;
        this.elements.restartButton.classList.remove('hidden');
        this.elements.continueToAgentB.classList.add('hidden');
        
        // Show data export option with dual session support
        this.prepareDualAgentDataExport();
        this.elements.dataExport.classList.remove('hidden');
        
        // Update final progress
        this.elements.progressFill.className = 'progress-fill agent-b';
    }
    
    prepareDualAgentDataExport() {
        const exportData = {
            sessionId: this.state.sessionId,
            dualAgentMode: true,
            startTime: this.state.startTime,
            endTime: this.state.endTime,
            totalDuration: this.state.duration,
            
            // Independent session records
            agentA: {
                ...this.state.sessionRecords.agentA,
                characterType: 'A',
                memoryImpaired: false
            },
            agentB: {
                ...this.state.sessionRecords.agentB,
                characterType: 'B', 
                memoryImpaired: true
            },
            
            // Combined player facts (should be consistent)
            playerFacts: this.state.playerFacts,
            
            // Study metadata
            studyMetadata: {
                agentInitializationOrder: 'A_first_then_B',
                factGatheringSequence: GAME_CONFIG.FACT_TYPES,
                debugModeUsed: this.state.debugMode,
                completedAt: new Date().toISOString()
            }
        };
        
        this.elements.sessionData.value = JSON.stringify(exportData, null, 2);
    }
    
    downloadSessionData() {
        const data = this.elements.sessionData.value;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_data_${this.state.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    restartGame() {
        location.reload();
    }
    
    async displayMessage(text, thought = null) {
        // Show loading animation first
        this.showLoadingAnimation();
        
        // Simulate thinking delay
        await new Promise(resolve => setTimeout(resolve, this.getTypingDelay()));
        
        // Hide loading and show message
        this.hideLoadingAnimation();
        this.elements.dialogueText.textContent = text;
        this.elements.dialogueText.classList.add('dialogue-enter');
        
        // Display thought if provided and debug mode is on
        if (thought) {
            this.state.lastLLMThought = thought;
            this.displayThought(thought);
        }
        
        // Log the message
        this.logEvent('message_displayed', {
            text: text,
            thought: thought,
            phase: this.state.phase,
            step: this.state.currentStep,
            agent: this.state.currentAgent
        });
        
        // Add to dialogue history with enhanced metadata
        this.state.dialogue.push({
            timestamp: Date.now(),
            speaker: 'AI',
            text: text,
            thought: thought,
            phase: this.state.phase,
            agent: this.state.currentAgent
        });
        
        // Update debug info
        if (this.state.debugMode) {
            this.updateDebugInfo();
        }
        
        // Remove animation class after completion
        setTimeout(() => {
            this.elements.dialogueText.classList.remove('dialogue-enter');
        }, 500);
    }
    
    getTypingDelay() {
        // Both agents now use consistent, longer delays for better user experience
        return Math.random() * (GAME_CONFIG.TYPING_DELAY.MAX - GAME_CONFIG.TYPING_DELAY.MIN) + GAME_CONFIG.TYPING_DELAY.MIN;
    }
    
    logEvent(eventType, data) {
        console.log(`[${new Date().toISOString()}] ${eventType}:`, data);
        // In a real implementation, this would send data to a research server
    }
    
    advanceDialogue() {
        // Generic continue function for dialogue advancement
        this.elements.continueContainer.classList.add('hidden');
        // Implementation depends on current state
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new VisualNovelGame();
});

/**
 * HCI Memory-Fidelity Visual Novel Game Engine
 * Tests how AI character memory accuracy influences user perception
 * Enhanced with LLM API integration for dynamic responses
 */

class VisualNovelGame {
    constructor() {
        this.state = {
            phase: 'init', // init, introduction, quiz, rating, complete
            currentStep: 0,
            characterType: GAME_CONFIG.MEMORY_IMPAIRED ? 'B' : 'A',
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            playerFacts: {},
            quizAnswers: [],
            ratings: {},
            dialogue: [],
            memoryErrors: 0,
            llmEnabled: true,
            debugMode: false,
            lastLLMThought: ''
        };
        
        this.elements = {};
        this.llmClient = null;
        this.initializeElements();
        this.initializeEventListeners();
        this.loadDialogueData();
        // Make initializeLLMSystem async and block game start on api-key.txt API key validation
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
            completionStatus: document.getElementById('completion-status'),
            
            dataExport: document.getElementById('data-export'),
            downloadData: document.getElementById('download-data'),
            sessionData: document.getElementById('session-data'),
            
            // New LLM-related elements
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
            if (e.key === 'Enter') this.handleTextSubmit();
        });
        
        // Continue button
        this.elements.continueButton.addEventListener('click', () => this.advanceDialogue());
        
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
        
        // Settings modal
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
     * Display API configuration error and block application
     */
    displayApiError(errorMessage) {
        // Clear any existing content
        this.hideAllInputs();
        
        // Display error message in dialogue area
        this.elements.dialogueText.innerHTML = `
            <div style="color: #dc3545; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f8d7da;">
                <h3 style="margin-top: 0; color: #721c24;">⚠️ Configuration Error</h3>
                <p><strong>The application cannot start:</strong></p>
                <p>${errorMessage}</p>
                <hr style="border-color: #dc3545;">
                <p><strong>To fix this:</strong></p>
                <ul>
                    <li>Add a valid OpenAI API key to your <code>api-key.txt</code> file</li>
                    <li>Ensure the key starts with <code>sk-</code></li>
                    <li>Verify you have internet connectivity</li>
                    <li>Refresh the page after updating the api-key.txt file</li>
                </ul>
            </div>
        `;
        
        // Hide settings button and show reload option
        this.elements.settingsButton.style.display = 'none';
        this.elements.restartButton.classList.remove('hidden');
        this.elements.restartButton.textContent = 'Reload Application';
        
        // Update progress indicator
        this.elements.progressIndicator.textContent = 'Configuration Error';
        this.elements.progressIndicator.style.color = '#dc3545';
        
        console.error('Application blocked due to API configuration error:', errorMessage);
    }

    loadDialogueData() {
        // In a real implementation, this would load from JSON files
        // For now, we'll use embedded dialogue data
        this.dialogueData = {
            introduction: {
                greeting: this.getGreetingMessage(),
                factPrompts: {
                    name: "What's your name? I'd love to know what to call you!",
                    favFood: "What's your favorite food? I'm curious about your tastes!",
                    favHobby: "What hobby do you enjoy most in your free time?",
                    favRelaxPlace: "Where do you like to go to relax and unwind?",
                    profession: "What do you do for work or study?",
                    bonusFact: "Tell me something interesting about yourself!"
                }
            },
            quiz: this.generateQuizQuestions(),
            outro: this.getOutroMessage(),
            ratings: [
                "How human-like did this AI assistant seem to you?",
                "How much would you want to interact with this assistant again?"
            ]
        };
    }
    
    /**
     * Initialize LLM system and validate api-key.txt API key (blocking operation)
     */
    async initializeLLMSystem() {
        try {
            // Wait for API config to initialize (including api-key.txt loading)
            if (window.apiConfig && window.apiConfig.initPromise) {
                await window.apiConfig.initPromise;
            }
            
            // api-key.txt file and valid API key are mandatory
            if (!window.apiConfig.isConfigured() || !window.apiConfig.isOnline) {
                throw new Error('Valid OpenAI API key is required in api-key.txt file. Application cannot start without proper configuration.');
            }
            
            console.log('✅ api-key.txt API key validated successfully');
            
            // Ensure fallback system is disabled
            if (!window.fallbackSystem.isDisabled()) {
                window.fallbackSystem.disable();
            }
            
            this.state.llmEnabled = true;
            
            // Load saved UI settings (not API settings)
            this.loadLLMSettings();
            
            // Update debug info
            this.updateDebugInfo();
        } catch (error) {
            console.error('LLM system initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Load LLM UI settings and configure interface for api-key.txt-only mode
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
        
        // Always disable manual API key input in strict api-key.txt mode
        this.elements.apiKeyInput.disabled = true;
        this.elements.apiKeyInput.placeholder = 'API key managed by api-key.txt file';
        this.elements.testApiButton.disabled = true;
        
        // Show api-key.txt key status (masked)
        if (window.apiConfig.isConfigured()) {
            this.elements.apiKeyInput.value = window.apiConfig.getMaskedApiKey().split(' (')[0];
        } else {
            this.elements.apiKeyInput.value = 'Not configured in api-key.txt';
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
     * Update API key source display for api-key.txt-only mode
     */
    updateApiKeySourceDisplay() {
        const source = window.apiConfig.getApiKeySource();
        
        if (source === 'txt' && window.apiConfig.isOnline) {
            this.elements.apiKeySource.textContent = '✅ API key loaded and validated from api-key.txt file';
            this.elements.apiKeySource.className = 'setting-info txt success';
        } else if (source === 'txt' && !window.apiConfig.isOnline) {
            this.elements.apiKeySource.textContent = '❌ API key from api-key.txt file is invalid';
            this.elements.apiKeySource.className = 'setting-info txt error';
        } else {
            this.elements.apiKeySource.textContent = '❌ api-key.txt file is required but API key is missing or empty';
            this.elements.apiKeySource.className = 'setting-info txt error';
        }
    }
    
    /**
     * Close settings modal
     */
    closeSettingsModal() {
        this.elements.settingsModal.classList.add('hidden');
    }
    
    /**
     * Test API connection - DISABLED in api-key.txt-only mode
     */
    async testApiConnection() {
        alert('API testing is disabled. API key is managed through api-key.txt file and validated automatically.');
    }
    
    /**
     * Save settings - LIMITED in api-key.txt-only mode
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
     * Clear all settings - DISABLED in api-key.txt-only mode
     */
    clearSettings() {
        alert('Settings clearing is disabled. API key is managed through api-key.txt file.');
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
     * Toggle offline mode - DISABLED in api-key.txt-only mode
     */
    toggleOfflineMode() {
        // Offline mode is disabled in api-key.txt-only mode
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
        this.elements.debugCharacter.textContent = 
            `Character ${this.state.characterType} (${this.state.characterType === 'A' ? 'Perfect Memory' : 'Impaired Memory'})`;
        
        this.elements.debugMemory.textContent = 
            `Errors: ${this.state.memoryErrors}/${GAME_CONFIG.MEMORY_ACCURACY.MAX_ERRORS}`;
            
        if (this.state.lastLLMThought) {
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
    
    generateQuizQuestions() {
        const questionTemplates = [
            "What did you tell me your name was?",
            "You mentioned your favorite food earlier - what was it?",
            "What hobby did you say you enjoy most?",
            "Where did you say you like to go to relax?"
        ];
        
        const factKeys = ['name', 'favFood', 'favHobby', 'favRelaxPlace'];
        
        return questionTemplates.map((template, index) => ({
            question: template,
            factKey: factKeys[index],
            correctAnswer: null, // Will be set based on player input
            options: [] // Will be generated with distractors
        }));
    }
    
    getOutroMessage() {
        // This will be customized based on remembered/forgotten facts
        return "Thank you for this wonderful conversation! It was great getting to know you.";
    }
    
    startGame() {
        this.elements.sessionId.textContent = `Session: ${this.state.sessionId}`;
        this.updateProgressIndicator();
        this.logEvent('game_start', { characterType: this.state.characterType });
        this.enterPhase('introduction');
    }
    
    updateProgressIndicator() {
        const phases = ['Introduction', 'Quiz', 'Rating', 'Complete'];
        const currentPhaseIndex = ['introduction', 'quiz', 'rating', 'complete'].indexOf(this.state.phase);
        this.elements.progressIndicator.textContent = `${phases[currentPhaseIndex] || 'Starting'}`;
    }
    
    enterPhase(phase) {
        this.state.phase = phase;
        this.state.currentStep = 0;
        this.updateProgressIndicator();
        this.hideAllInputs();
        
        switch (phase) {
            case 'introduction':
                this.startIntroduction();
                break;
            case 'quiz':
                this.startQuiz();
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
            // API is required - no fallback allowed
            if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
                throw new Error('API is required but not available - this should have been caught during initialization');
            }
            
            const greeting = await this.generateDynamicGreeting();
            await this.displayMessage(greeting);
        } catch (error) {
            console.error('Error generating greeting:', error);
            throw new Error('Cannot generate greeting: API is required but not available');
        }
        
        // Start dynamic conversation flow
        setTimeout(() => {
            this.collectNextFact();
        }, 1500);
    }
    
    /**
     * Generate dynamic, warm greeting using LLM
     */
    async generateDynamicGreeting() {
        // For demonstration with test keys, use a simulated response
        if (window.apiConfig.apiKey && window.apiConfig.apiKey.startsWith('sk-test')) {
            console.log('Using simulated LLM response for demo purposes');
            return "Hello! I'm an AI assistant powered by the API key from your api-key.txt file. I'm excited to have a personalized conversation with you today!";
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
            // All facts collected, move to quiz
            this.enterPhase('quiz');
            return;
        }
        
        // Generate dynamic question using LLM (required)
        try {
            const prompt = await this.generateDynamicQuestion();
            this.elements.inputLabel.textContent = prompt;
            this.elements.textInput.value = '';
            this.elements.textInput.placeholder = 'Type your response here...';
            this.elements.textInputContainer.classList.remove('hidden');
            this.elements.textInput.focus();
        } catch (error) {
            console.error('Dynamic question generation failed:', error);
            throw new Error('Cannot generate question: API is required but not available');
        }
    }
    
    /**
     * Generate dynamic, contextual questions using LLM (required)
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
            console.error('Failed to generate dynamic question:', error);
            throw error;
        }
    }
    
    async handleTextSubmit() {
        const input = this.elements.textInput.value.trim();
        if (!input) return;
        
        const factType = GAME_CONFIG.FACT_TYPES[this.state.currentStep];
        this.state.playerFacts[factType] = input;
        
        this.logEvent('fact_collected', {
            factType: factType,
            value: input,
            step: this.state.currentStep
        });
        
        // Generate appropriate response
        this.elements.textInputContainer.classList.add('hidden');
        
        setTimeout(async () => {
            try {
                const response = await this.generateFactResponse(factType, input);
                await this.displayMessage(response);
                this.state.currentStep++;
                
                setTimeout(() => {
                    this.collectNextFact();
                }, 1000);
            } catch (error) {
                console.error('Error generating response:', error);
                // No fallback - throw error to block application
                throw new Error('Cannot generate response: API is required but not available');
            }
        }, this.getTypingDelay());
    }
    
    async generateFactResponse(factType, value) {
        // Use LLM (required)
        if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
            throw new Error('API is required but not available');
        }
        
        try {
            return await this.generateDynamicResponse(value);
        } catch (error) {
            console.error('LLM request failed:', error);
            throw error;
        }
    }
    
    /**
     * Generate dynamic response to user input using LLM (required)
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
            throw error;
        }
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
            // API is required
            if (!this.state.llmEnabled || !window.apiConfig.isOnline) {
                throw new Error('API is required but not available');
            }
            
            const quizIntro = await this.generateLLMResponse('quiz', { 
                customPrompt: "Tell the user you want to test your memory of what they've shared. Be friendly and engaging." 
            });
            await this.displayMessage(quizIntro);
        } catch (error) {
            console.error('Error generating quiz intro:', error);
            throw new Error('Cannot generate quiz intro: API is required but not available');
        }
        
        // Generate quiz questions with options
        this.prepareQuizQuestions();
        this.showNextQuizQuestion();
    }
    
    prepareQuizQuestions() {
        const questions = this.dialogueData.quiz;
        
        // Set correct answers based on player facts
        questions.forEach(q => {
            q.correctAnswer = this.state.playerFacts[q.factKey];
            q.options = this.generateQuizOptions(q.correctAnswer, q.factKey);
        });
        
        this.quizQuestions = questions;
    }
    
    generateQuizOptions(correctAnswer, factType) {
        // Generate plausible distractors
        const distractors = this.getDistractors(factType);
        const options = [correctAnswer];
        
        // Add 2-3 distractors
        while (options.length < 4 && distractors.length > 0) {
            const distractor = distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0];
            if (distractor !== correctAnswer) {
                options.push(distractor);
            }
        }
        
        // Shuffle options
        return this.shuffleArray(options);
    }
    
    getDistractors(factType) {
        const distractorSets = {
            name: ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan'],
            favFood: ['Pizza', 'Sushi', 'Tacos', 'Pasta', 'Burgers', 'Ice cream'],
            favHobby: ['Reading', 'Gaming', 'Cooking', 'Hiking', 'Music', 'Photography'],
            favRelaxPlace: ['Beach', 'Mountains', 'Home', 'Park', 'Library', 'Coffee shop'],
            profession: ['Teacher', 'Engineer', 'Artist', 'Writer', 'Doctor', 'Student'],
            bonusFact: ['I love traveling', 'I have two cats', 'I speak three languages', 'I play guitar']
        };
        
        return [...(distractorSets[factType] || [])];
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
        if (this.state.currentStep >= this.quizQuestions.length) {
            // Quiz complete
            this.enterPhase('rating');
            return;
        }
        
        const question = this.quizQuestions[this.state.currentStep];
        const shouldMakeError = this.shouldMakeMemoryError();
        
        this.elements.quizQuestion.textContent = question.question;
        this.elements.quizOptions.innerHTML = '';
        
        let selectedAnswer = question.correctAnswer;
        
        // Character B (memory impaired) may select wrong answer
        if (shouldMakeError) {
            const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
            if (wrongOptions.length > 0) {
                selectedAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
                this.state.memoryErrors++;
                this.logEvent('memory_error', {
                    question: question.question,
                    correct: question.correctAnswer,
                    selected: selectedAnswer,
                    step: this.state.currentStep
                });
            }
        }
        
        // Create option buttons
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.textContent = option;
            button.addEventListener('click', () => this.selectQuizOption(button, option, question));
            this.elements.quizOptions.appendChild(button);
        });
        
        this.elements.quizContainer.classList.remove('hidden');
        
        // Auto-select answer after a delay (simulating AI thinking)
        setTimeout(() => {
            const targetButton = Array.from(this.elements.quizOptions.children)
                .find(btn => btn.textContent === selectedAnswer);
            if (targetButton) {
                this.selectQuizOption(targetButton, selectedAnswer, question);
            }
        }, this.getTypingDelay());
    }
    
    shouldMakeMemoryError() {
        if (this.state.characterType === 'A') return false; // Perfect memory
        if (this.state.memoryErrors >= GAME_CONFIG.MEMORY_ACCURACY.MAX_ERRORS) return false;
        return Math.random() > GAME_CONFIG.MEMORY_ACCURACY.IMPAIRED;
    }
    
    selectQuizOption(button, answer, question) {
        // Clear previous selections
        Array.from(this.elements.quizOptions.children).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select current option
        button.classList.add('selected');
        
        // Record answer
        this.state.quizAnswers.push({
            question: question.question,
            correct: question.correctAnswer,
            selected: answer,
            isCorrect: answer === question.correctAnswer
        });
        
        this.logEvent('quiz_answer', {
            question: question.question,
            correct: question.correctAnswer,
            selected: answer,
            isCorrect: answer === question.correctAnswer,
            step: this.state.currentStep
        });
        
        // Continue to next question after delay
        setTimeout(() => {
            this.elements.quizContainer.classList.add('hidden');
            this.state.currentStep++;
            
            setTimeout(() => {
                this.showNextQuizQuestion();
            }, 1000);
        }, 2000);
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
        const correctAnswers = this.state.quizAnswers.filter(a => a.isCorrect);
        
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
        this.state.endTime = Date.now();
        this.state.duration = this.state.endTime - this.state.startTime;
        
        this.logEvent('session_complete', {
            duration: this.state.duration,
            totalQuestions: this.state.quizAnswers.length,
            correctAnswers: this.state.quizAnswers.filter(a => a.isCorrect).length,
            memoryErrors: this.state.memoryErrors,
            ratings: this.state.ratings
        });
        
        this.elements.completionStatus.textContent = 
            `Session completed in ${Math.round(this.state.duration / 60000)} minutes`;
        this.elements.restartButton.classList.remove('hidden');
        
        // Show data export option
        this.prepareDataExport();
        this.elements.dataExport.classList.remove('hidden');
    }
    
    prepareDataExport() {
        const exportData = {
            sessionId: this.state.sessionId,
            characterType: this.state.characterType,
            memoryImpaired: GAME_CONFIG.MEMORY_IMPAIRED,
            startTime: this.state.startTime,
            endTime: this.state.endTime,
            duration: this.state.duration,
            playerFacts: this.state.playerFacts,
            quizAnswers: this.state.quizAnswers,
            ratings: this.state.ratings,
            memoryErrors: this.state.memoryErrors,
            dialogue: this.state.dialogue
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
    
    async displayMessage(text) {
        this.elements.typingIndicator.classList.remove('hidden');
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, this.getTypingDelay()));
        
        this.elements.typingIndicator.classList.add('hidden');
        this.elements.dialogueText.textContent = text;
        this.elements.dialogueText.classList.add('fade-in');
        
        // Log the message
        this.logEvent('message_displayed', {
            text: text,
            phase: this.state.phase,
            step: this.state.currentStep
        });
        
        // Add to dialogue history
        this.state.dialogue.push({
            timestamp: Date.now(),
            speaker: 'AI',
            text: text,
            phase: this.state.phase
        });
    }
    
    getTypingDelay() {
        if (this.state.characterType === 'A') {
            // Character A gets artificial delay for parity
            return Math.random() * (GAME_CONFIG.TYPING_DELAY.MAX - GAME_CONFIG.TYPING_DELAY.MIN) + GAME_CONFIG.TYPING_DELAY.MIN;
        } else {
            // Character B has natural response time
            return Math.random() * 200 + 100;
        }
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

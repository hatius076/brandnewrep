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
            llmEnabled: false,
            debugMode: false,
            lastLLMThought: ''
        };
        
        this.elements = {};
        this.llmClient = null;
        
        // Initialize new systems
        this.dynamicFacts = new DynamicFactSystem();
        this.wardenAI = new WardenAI(this);
        this.conversationFlow = new ConversationFlowController(this);
        this.userQuiz = null; // Will be initialized when needed
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadDialogueData();
        this.initializeLLMSystem();
        this.startGame();
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
            
            // User-controlled quiz elements
            userQuizContainer: document.getElementById('user-quiz-container'),
            availableQuestions: document.getElementById('available-questions'),
            selectedCount: document.getElementById('selected-count'),
            startQuizBtn: document.getElementById('start-quiz-btn'),
            quizProgress: document.getElementById('quiz-progress'),
            quizProgressFill: document.getElementById('quiz-progress-fill'),
            currentQuestion: document.getElementById('current-question'),
            totalQuestions: document.getElementById('total-questions'),
            
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
        // Text input submission - direct approach
        this.elements.submitButton.addEventListener('click', () => {
            const input = this.elements.textInput.value.trim();
            if (input) {
                this.processUserInput(input);
            }
        });
        
        this.elements.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = this.elements.textInput.value.trim();
                if (input) {
                    this.processUserInput(input);
                }
            }
        });
        
        // Continue button
        this.elements.continueButton.addEventListener('click', () => this.advanceDialogue());
        
        // Rating buttons
        this.elements.scaleButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('rating-btn')) {
                this.handleRatingSelect(e.target);
            }
        });
        
        // Quiz category filters
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-filter')) {
                this.handleCategoryFilter(e.target);
            }
        });
        
        // Start quiz button
        if (this.elements.startQuizBtn) {
            this.elements.startQuizBtn.addEventListener('click', () => this.startUserControlledQuiz());
        }
        
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
     * Process user input directly
     */
    async processUserInput(input) {
        // Clear input and disable while processing
        this.elements.textInput.value = '';
        this.elements.textInput.disabled = true;
        this.elements.submitButton.disabled = true;
        this.hideAllInputs();
        
        // Record fact in dynamic system
        if (this.state.phase === 'introduction') {
            const fact = this.dynamicFacts.recordFact(input);
            this.logEvent('dynamic_fact_collected', {
                factNumber: fact.factNumber,
                content: fact.content,
                category: fact.category,
                memorable: fact.memorable
            });
            
            // Add user input to dialogue
            this.state.dialogue.push({
                timestamp: Date.now(),
                speaker: 'User',
                text: input,
                phase: this.state.phase
            });
        }
        
        // Generate agent response
        try {
            let response;
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                const context = buildDynamicContext(
                    this.state.dialogue,
                    this.dynamicFacts.getAllFacts(),
                    'introduction',
                    this.dynamicFacts.factCounter
                );
                
                const prompt = buildEnhancedCharacterPrompt(
                    this.state.characterType,
                    context,
                    'introduction',
                    { 
                        userInput: input,
                        factNumber: this.dynamicFacts.factCounter
                    }
                );
                
                const llmResponse = await window.apiConfig.makeRequest(prompt.system, prompt.user);
                const parsed = parseEnhancedLLMResponse(llmResponse.content);
                
                this.state.lastLLMThought = parsed.thought;
                if (this.state.debugMode) {
                    this.updateDebugInfo();
                }
                
                response = parsed.response;
            } else {
                // Fallback response
                response = window.fallbackSystem.generateResponse(
                    'introduction',
                    { factType: 'general', value: input }
                ).response;
            }
            
            // Display response
            await this.displayMessage(response);
            
            // Check if we should continue or transition
            if (this.dynamicFacts.factCounter >= 6) {
                // Transition to quiz
                setTimeout(() => {
                    this.enterPhase('quiz');
                }, 2000);
            } else {
                // Continue with next fact collection
                setTimeout(() => {
                    this.showNextFactPrompt();
                }, 1500);
            }
            
        } catch (error) {
            console.error('Error processing user input:', error);
            // Fallback response
            const response = window.fallbackSystem.generateResponse(
                'introduction',
                { factType: 'general', value: input }
            ).response;
            await this.displayMessage(response);
            
            setTimeout(() => {
                this.showNextFactPrompt();
            }, 1500);
        }
    }

    /**
     * Show next fact collection prompt
     */
    showNextFactPrompt() {
        if (this.dynamicFacts.factCounter >= 6) {
            this.enterPhase('quiz');
            return;
        }
        
        // Generate dynamic prompt
        const prompts = [
            "What else would you like me to know about you?",
            "Tell me about another aspect of your life.",
            "What's something else that's important to you?",
            "I'd love to hear more about you!",
            "What's another interesting fact about yourself?"
        ];
        
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        // Show input interface
        this.elements.inputLabel.textContent = prompt;
        this.elements.textInput.placeholder = "Type your response here...";
        this.elements.textInput.disabled = false;
        this.elements.submitButton.disabled = false;
        this.elements.textInputContainer.classList.remove('hidden');
        this.elements.textInput.focus();
    }
    
    async loadDialogueData() {
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
     * Initialize LLM system and load settings
     */
    initializeLLMSystem() {
        // Check if API is configured
        this.state.llmEnabled = window.apiConfig.isConfigured() && window.apiConfig.isOnline;
        
        // Load saved settings
        this.loadLLMSettings();
        
        // Update debug info
        this.updateDebugInfo();
    }
    
    /**
     * Load LLM settings from storage and update UI
     */
    loadLLMSettings() {
        try {
            const saved = localStorage.getItem('llm_ui_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.state.debugMode = settings.debugMode || false;
                this.elements.debugModeCheckbox.checked = this.state.debugMode;
                this.elements.offlineModeCheckbox.checked = settings.offlineMode || false;
            }
        } catch (error) {
            console.warn('Failed to load LLM UI settings:', error);
        }
        
        // Update UI with current API config
        if (window.apiConfig.isConfigured()) {
            this.elements.apiKeyInput.value = window.apiConfig.getMaskedApiKey();
            this.elements.modelSelect.value = window.apiConfig.model;
        }
        
        this.updateApiStatus();
    }
    
    /**
     * Open settings modal
     */
    openSettingsModal() {
        this.elements.settingsModal.classList.remove('hidden');
        this.updateApiStatus();
        this.updateUsageStats();
    }
    
    /**
     * Close settings modal
     */
    closeSettingsModal() {
        this.elements.settingsModal.classList.add('hidden');
    }
    
    /**
     * Test API connection
     */
    async testApiConnection() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter an API key first.');
            return;
        }
        
        this.elements.statusIndicator.textContent = 'Testing...';
        this.elements.statusIndicator.className = 'testing';
        this.elements.testApiButton.disabled = true;
        
        try {
            const isValid = await window.apiConfig.setApiKey(apiKey);
            this.state.llmEnabled = isValid && !this.elements.offlineModeCheckbox.checked;
            this.updateApiStatus();
            
            if (isValid) {
                alert('API connection successful!');
            } else {
                alert('API connection failed. Please check your API key.');
            }
        } catch (error) {
            console.error('API test failed:', error);
            alert('API test failed: ' + error.message);
            this.updateApiStatus();
        } finally {
            this.elements.testApiButton.disabled = false;
        }
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        const model = this.elements.modelSelect.value;
        const debugMode = this.elements.debugModeCheckbox.checked;
        const offlineMode = this.elements.offlineModeCheckbox.checked;
        
        // Save API config
        if (apiKey && !apiKey.includes('...')) {
            window.apiConfig.setApiKey(apiKey);
        }
        window.apiConfig.model = model;
        window.apiConfig.saveConfig();
        
        // Save UI settings
        const uiSettings = { debugMode, offlineMode };
        localStorage.setItem('llm_ui_settings', JSON.stringify(uiSettings));
        
        // Update state
        this.state.debugMode = debugMode;
        this.state.llmEnabled = window.apiConfig.isOnline && !offlineMode;
        
        this.updateApiStatus();
        this.updateDebugInfo();
        this.closeSettingsModal();
        
        // Show/hide debug panel
        if (debugMode) {
            this.elements.debugPanel.classList.remove('hidden');
        } else {
            this.elements.debugPanel.classList.add('hidden');
        }
    }
    
    /**
     * Clear all settings
     */
    clearSettings() {
        if (confirm('Are you sure you want to clear all API settings and data?')) {
            window.apiConfig.clearConfig();
            localStorage.removeItem('llm_ui_settings');
            
            this.elements.apiKeyInput.value = '';
            this.elements.modelSelect.value = 'gpt-4';
            this.elements.debugModeCheckbox.checked = false;
            this.elements.offlineModeCheckbox.checked = false;
            
            this.state.llmEnabled = false;
            this.state.debugMode = false;
            
            this.updateApiStatus();
            this.updateDebugInfo();
            this.elements.debugPanel.classList.add('hidden');
        }
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
     * Toggle offline mode
     */
    toggleOfflineMode() {
        const offlineMode = this.elements.offlineModeCheckbox.checked;
        this.state.llmEnabled = window.apiConfig.isOnline && !offlineMode;
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
        this.elements.userQuizContainer.classList.add('hidden');
        this.elements.quizProgress.classList.add('hidden');
        this.elements.ratingContainer.classList.add('hidden');
        this.elements.continueContainer.classList.add('hidden');
    }
    
    async startIntroduction() {
        // Generate and display initial greeting 
        const greeting = await this.generateIntroductionGreeting();
        await this.displayMessage(greeting);
        
        // Show first fact collection prompt
        setTimeout(() => {
            this.showNextFactPrompt();
        }, 1500);
    }
    
    async generateIntroductionGreeting() {
        try {
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                const context = buildDynamicContext(
                    this.state.dialogue,
                    this.dynamicFacts.getAllFacts(),
                    'introduction',
                    this.dynamicFacts.factCounter
                );
                
                const prompt = buildEnhancedCharacterPrompt(
                    this.state.characterType,
                    context,
                    'introduction',
                    { openQuestion: true, factCount: 0, previousFacts: 'None yet' }
                );
                
                const response = await window.apiConfig.makeRequest(prompt.system, prompt.user);
                const parsed = parseEnhancedLLMResponse(response.content);
                
                this.state.lastLLMThought = parsed.thought;
                if (this.state.debugMode) {
                    this.updateDebugInfo();
                }
                
                return parsed.response;
            } else {
                return window.fallbackSystem.generateResponse('introduction').response;
            }
        } catch (error) {
            console.error('Error generating greeting:', error);
            return window.fallbackSystem.generateResponse('introduction').response;
        }
    }
    
    collectNextFact() {
        const factTypes = GAME_CONFIG.FACT_TYPES;
        if (this.state.currentStep >= factTypes.length) {
            // All facts collected, move to quiz
            this.enterPhase('quiz');
            return;
        }
        
        const currentFactType = factTypes[this.state.currentStep];
        const prompt = this.dialogueData.introduction.factPrompts[currentFactType];
        
        this.elements.inputLabel.textContent = prompt;
        this.elements.textInput.value = '';
        this.elements.textInput.placeholder = 'Type your response here...';
        this.elements.textInputContainer.classList.remove('hidden');
        this.elements.textInput.focus();
    }
    
    async handleTextSubmit() {
        const input = this.elements.textInput.value.trim();
        if (!input) return;
        
        // Clear the input first
        this.elements.textInput.value = '';
        
        // Record fact in dynamic system
        if (this.state.phase === 'introduction') {
            const fact = this.dynamicFacts.recordFact(input);
            this.logEvent('dynamic_fact_collected', {
                factNumber: fact.factNumber,
                content: fact.content,
                category: fact.category,
                memorable: fact.memorable
            });
        }
        
        // Process user input through conversation flow
        this.conversationFlow.processUserInput('text', input);
        
        // Start agent turn for response
        this.conversationFlow.startTurn('agent', {
            userInput: input,
            inputType: 'text'
        });
    }
    
    async generateFactResponse(factType, value) {
        // Use LLM if enabled and available
        if (this.state.llmEnabled && window.apiConfig.isOnline) {
            try {
                return await this.generateLLMResponse('introduction', { factType, value });
            } catch (error) {
                console.warn('LLM request failed, falling back to static response:', error);
                // Fall through to static response
            }
        }
        
        // Fallback to static responses
        const responses = {
            name: [`Nice to meet you, ${value}!`, `Great, ${value} is a lovely name!`, `Thanks for sharing, ${value}!`],
            favFood: [`${value} sounds delicious!`, `I bet ${value} is really tasty!`, `Interesting choice with ${value}!`],
            favHobby: [`${value} sounds like a fun hobby!`, `That's cool that you enjoy ${value}!`, `${value} must be really enjoyable!`],
            favRelaxPlace: [`${value} sounds like a peaceful place!`, `That sounds like a great spot to unwind!`, `I can imagine ${value} being very relaxing!`],
            profession: [`That's interesting work!`, `Sounds like a meaningful profession!`, `Your work must be quite engaging!`],
            bonusFact: [`That's really interesting!`, `What a cool fact about yourself!`, `Thanks for sharing that with me!`]
        };
        
        const options = responses[factType] || ['Thanks for sharing that!'];
        return options[Math.floor(Math.random() * options.length)];
    }
    
    /**
     * Generate LLM response using enhanced prompt templates
     */
    async generateLLMResponse(phase, context = {}) {
        try {
            // Build context for enhanced prompts
            const dialogueContext = buildDynamicContext(
                this.state.dialogue,
                this.dynamicFacts.getAllFacts(),
                phase,
                this.dynamicFacts.factCounter,
                context.wardenGuidance || ''
            );
            
            // Build the complete prompt using enhanced system
            const prompt = buildEnhancedCharacterPrompt(
                this.state.characterType, 
                dialogueContext, 
                phase, 
                context
            );
            
            // Make API request
            const response = await window.apiConfig.makeRequest(prompt.system, prompt.user);
            
            // Parse enhanced response
            const parsed = parseEnhancedLLMResponse(response.content);
            
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
        // Initialize user-controlled quiz
        this.userQuiz = new UserControlledQuiz(this.dynamicFacts, this);
        this.userQuiz.initializeQuiz();
        
        // Show quiz intro message first
        try {
            let quizIntro;
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                const context = buildDynamicContext(
                    this.state.dialogue,
                    this.dynamicFacts.getAllFacts(),
                    'transition_quiz',
                    this.dynamicFacts.factCounter
                );
                
                const prompt = buildEnhancedCharacterPrompt(
                    this.state.characterType,
                    context,
                    'transition_quiz',
                    { factsCollected: this.dynamicFacts.factCounter }
                );
                
                const response = await window.apiConfig.makeRequest(prompt.system, prompt.user);
                const parsed = parseEnhancedLLMResponse(response.content);
                
                this.state.lastLLMThought = parsed.thought;
                if (this.state.debugMode) {
                    this.updateDebugInfo();
                }
                
                quizIntro = parsed.response;
            } else {
                quizIntro = "I've learned so much about you! Would you like to test how well I remembered everything?";
            }
            
            await this.displayMessage(quizIntro);
            
            // Show user-controlled quiz interface after message
            setTimeout(() => {
                this.showUserQuizInterface();
            }, 2000);
            
        } catch (error) {
            console.error('Error generating quiz intro:', error);
            await this.displayMessage("I've learned so much about you! Would you like to test how well I remembered everything?");
            setTimeout(() => {
                this.showUserQuizInterface();
            }, 2000);
        }
    }
    
    showUserQuizInterface() {
        // Hide other containers
        this.hideAllInputs();
        
        // Show user quiz container
        this.elements.userQuizContainer.classList.remove('hidden');
        
        // Populate questions
        this.populateQuizQuestions();
        
        // Update progress
        this.updateProgressIndicator();
    }
    
    populateQuizQuestions(filter = 'all') {
        if (!this.userQuiz) return;
        
        const questions = this.userQuiz.filterQuestions(filter);
        const container = this.elements.availableQuestions;
        container.innerHTML = '';
        
        questions.forEach(question => {
            const questionElement = this.createQuestionElement(question);
            container.appendChild(questionElement);
        });
        
        this.updateQuizControls();
    }
    
    createQuestionElement(question) {
        const element = document.createElement('div');
        element.className = 'question-option';
        element.dataset.questionId = question.id;
        
        const difficultyStars = '★'.repeat(Math.floor(question.difficulty || 1));
        
        element.innerHTML = `
            <div class="question-content">
                <div class="question-text">${question.text}</div>
                <div class="question-meta">
                    <span class="fact-number">Fact #${question.factNumber}</span>
                    <span class="difficulty">${difficultyStars}</span>
                    <span class="category">${question.category}</span>
                </div>
            </div>
            <button class="select-question-btn" onclick="game.selectQuizQuestion('${question.id}')">
                Select
            </button>
        `;
        
        return element;
    }
    
    selectQuizQuestion(questionId) {
        if (!this.userQuiz) return;
        
        this.userQuiz.selectQuestion(questionId);
        this.updateQuestionUI(questionId);
        this.updateQuizControls();
    }
    
    updateQuestionUI(questionId) {
        const element = document.querySelector(`[data-question-id="${questionId}"]`);
        if (!element) return;

        const isSelected = this.userQuiz.selectedQuestions.some(q => q.id === questionId);
        const button = element.querySelector('.select-question-btn');
        
        if (isSelected) {
            element.classList.add('selected');
            button.textContent = 'Remove';
            button.classList.add('remove');
        } else {
            element.classList.remove('selected');
            button.textContent = 'Select';
            button.classList.remove('remove');
        }
    }
    
    updateQuizControls() {
        if (!this.userQuiz) return;
        
        const count = this.userQuiz.selectedQuestions.length;
        this.elements.selectedCount.textContent = count;
        this.elements.startQuizBtn.disabled = count === 0;
    }
    
    handleCategoryFilter(button) {
        // Update active filter
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Repopulate questions
        const category = button.dataset.category;
        this.populateQuizQuestions(category);
    }
    
    startUserControlledQuiz() {
        if (!this.userQuiz || this.userQuiz.selectedQuestions.length === 0) {
            alert('Please select at least one question to ask!');
            return;
        }
        
        // Hide user quiz interface
        this.elements.userQuizContainer.classList.add('hidden');
        
        // Show progress bar
        this.elements.quizProgress.classList.remove('hidden');
        this.updateQuizProgress();
        
        // Start the quiz sequence
        this.userQuiz.userAskedQuestions = [...this.userQuiz.selectedQuestions];
        this.userQuiz.currentQuestionIndex = 0;
        
        // Let user ask first question
        this.showNextUserQuestion();
    }
    
    showNextUserQuestion() {
        if (!this.userQuiz || this.userQuiz.isQuizComplete()) {
            this.completeUserQuiz();
            return;
        }
        
        const question = this.userQuiz.getNextQuestion();
        this.currentQuizQuestion = question;
        
        // Update progress
        this.updateQuizProgress();
        
        // Show question interface
        this.elements.quizContainer.classList.remove('hidden');
        this.elements.quizQuestion.textContent = question.text;
        this.elements.quizOptions.innerHTML = '';
        
        // Create "Ask this question" button
        const askButton = document.createElement('button');
        askButton.className = 'ask-question-btn';
        askButton.textContent = 'Ask me this question';
        askButton.addEventListener('click', () => this.askQuizQuestion(question));
        this.elements.quizOptions.appendChild(askButton);
    }
    
    async askQuizQuestion(question) {
        // Hide ask button
        this.elements.quizOptions.innerHTML = '';
        
        // Generate AI response to the question
        try {
            let response;
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                const availableFacts = this.getAvailableFactsForMemory();
                const context = buildDynamicContext(
                    this.state.dialogue,
                    this.dynamicFacts.getAllFacts(),
                    'quiz',
                    this.dynamicFacts.factCounter
                );
                
                const prompt = buildEnhancedCharacterPrompt(
                    this.state.characterType,
                    context,
                    'quiz',
                    { 
                        question: question.text,
                        availableFacts: availableFacts
                    }
                );
                
                const llmResponse = await window.apiConfig.makeRequest(prompt.system, prompt.user);
                const parsed = parseEnhancedLLMResponse(llmResponse.content);
                
                this.state.lastLLMThought = parsed.thought;
                if (this.state.debugMode) {
                    this.updateDebugInfo();
                }
                
                response = parsed.response;
            } else {
                response = this.generateFallbackQuizResponse(question);
            }
            
            // Display AI response
            await this.displayMessage(response);
            
            // Log the quiz interaction
            this.logQuizInteraction(question, response);
            
            // Continue to next question after delay
            setTimeout(() => {
                this.elements.quizContainer.classList.add('hidden');
                setTimeout(() => {
                    this.showNextUserQuestion();
                }, 1000);
            }, 3000);
            
        } catch (error) {
            console.error('Error generating quiz response:', error);
            const fallbackResponse = this.generateFallbackQuizResponse(question);
            await this.displayMessage(fallbackResponse);
            
            setTimeout(() => {
                this.elements.quizContainer.classList.add('hidden');
                setTimeout(() => {
                    this.showNextUserQuestion();
                }, 1000);
            }, 3000);
        }
    }
    
    getAvailableFactsForMemory() {
        const facts = this.dynamicFacts.getAllFacts();
        if (this.state.characterType === 'A') {
            // Perfect memory - return all facts
            return facts.map(f => `Fact ${f.factNumber}: ${f.content}`).join('\n');
        } else {
            // Impaired memory - return filtered facts
            const availableFacts = this.dynamicFacts.exportForMemoryTest(true);
            return availableFacts.map(f => 
                f.distorted ? 
                `Fact ${f.factNumber}: ${f.content} (uncertain)` :
                `Fact ${f.factNumber}: ${f.content}`
            ).join('\n');
        }
    }
    
    generateFallbackQuizResponse(question) {
        const fact = this.dynamicFacts.getFact(question.factNumber);
        if (!fact) {
            return "I'm having trouble remembering that specific detail.";
        }
        
        if (this.state.characterType === 'A') {
            // Perfect memory
            return fact.content;
        } else {
            // Impaired memory - apply forgetting patterns
            if (Math.random() < 0.4) { // 40% chance of error
                if (Math.random() < 0.5) {
                    // Confident wrong
                    return this.generateConfidentWrongAnswer(fact);
                } else {
                    // Fuzzy recall
                    return this.generateFuzzyAnswer(fact);
                }
            } else {
                // Correct recall
                return fact.content;
            }
        }
    }
    
    generateConfidentWrongAnswer(fact) {
        const wrongAnswers = {
            'hobby': ['reading', 'gaming', 'cooking', 'hiking'],
            'food': ['pizza', 'sushi', 'pasta', 'burgers'],
            'profession': ['teacher', 'engineer', 'doctor', 'artist'],
            'general': ['traveling', 'music', 'photography', 'writing']
        };
        
        const options = wrongAnswers[fact.category] || wrongAnswers.general;
        const wrongAnswer = options[Math.floor(Math.random() * options.length)];
        return `You mentioned you love ${wrongAnswer}!`;
    }
    
    generateFuzzyAnswer(fact) {
        const fuzzyPatterns = [
            `I think you said something about... ${fact.content.split(' ')[0]}... or was it something similar?`,
            `If I remember correctly, you mentioned... hmm, was it ${fact.content.slice(0, 10)}...?`,
            `You told me about... let me think... something like ${fact.content.split(' ').slice(0, 2).join(' ')}?`
        ];
        
        return fuzzyPatterns[Math.floor(Math.random() * fuzzyPatterns.length)];
    }
    
    logQuizInteraction(question, response) {
        this.logEvent('user_controlled_quiz_interaction', {
            questionId: question.id,
            questionText: question.text,
            factNumber: question.factNumber,
            expectedAnswer: question.expectedAnswer,
            aiResponse: response,
            characterType: this.state.characterType,
            timestamp: Date.now()
        });
    }
    
    updateQuizProgress() {
        if (!this.userQuiz) return;
        
        const progress = this.userQuiz.getProgress();
        this.elements.currentQuestion.textContent = progress.current;
        this.elements.totalQuestions.textContent = progress.total;
        
        const percentage = progress.percentage;
        this.elements.quizProgressFill.style.width = `${percentage}%`;
    }
    
    completeUserQuiz() {
        // Hide quiz elements
        this.elements.quizContainer.classList.add('hidden');
        this.elements.quizProgress.classList.add('hidden');
        
        // Transition to rating phase
        this.enterPhase('rating');
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
            let outroMessage;
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                outroMessage = await this.generateLLMResponse('outro', {
                    facts: this.state.playerFacts,
                    memoryImpaired: this.state.characterType === 'B'
                });
            } else {
                outroMessage = window.fallbackSystem.generateResponse('outro', {
                    facts: this.state.playerFacts,
                    memoryImpaired: this.state.characterType === 'B'
                }).response;
            }
            await this.displayMessage(outroMessage);
        } catch (error) {
            console.error('Error generating outro:', error);
            const fallbackOutro = this.generatePersonalizedOutro();
            await this.displayMessage(fallbackOutro);
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

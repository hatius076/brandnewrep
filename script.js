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
    
    async loadDialogueData() {
        // In a real implementation, this would load from JSON files
        // For now, we'll use embedded dialogue data
        this.dialogueData = {
            introduction: {
                greeting: this.getGreetingMessage()
                // Note: Static factPrompts removed - using AI-driven conversation instead
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
        this.elements.ratingContainer.classList.add('hidden');
        this.elements.continueContainer.classList.add('hidden');
    }
    
    async startIntroduction() {
        try {
            let greeting;
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                greeting = await this.generateLLMResponse('introduction', { 
                    customPrompt: "Greet the user warmly and ask an open-ended question to start getting to know them. Be friendly and personable." 
                });
            } else {
                greeting = window.fallbackSystem.generateResponse('introduction').response;
            }
            await this.displayMessage(greeting);
        } catch (error) {
            console.error('Error generating greeting:', error);
            const fallbackGreeting = window.fallbackSystem.generateResponse('introduction').response;
            await this.displayMessage(fallbackGreeting);
        }
        
        // Enable input for user response - no more automatic static questions
        this.showUserInput();
    }
    
    showUserInput() {
        // Show text input interface for user response
        this.elements.textInput.value = '';
        this.elements.textInput.placeholder = 'Type your response here...';
        this.elements.textInputContainer.classList.remove('hidden');
        this.elements.textInput.focus();
    }
    
    shouldTransitionToQuiz() {
        // Transition to quiz after collecting enough facts through natural conversation
        const factsCollected = Object.keys(this.state.playerFacts).length;
        return factsCollected >= 4; // Minimum facts needed for a meaningful quiz
    }
    
    async handleTextSubmit() {
        const input = this.elements.textInput.value.trim();
        if (!input) return;
        
        // Record the fact dynamically
        const factType = this.inferFactType(input);
        this.state.playerFacts[factType] = input;
        
        this.logEvent('fact_collected', {
            factType: factType,
            value: input,
            totalFacts: Object.keys(this.state.playerFacts).length
        });
        
        // Hide input and show AI is responding
        this.elements.textInputContainer.classList.add('hidden');
        
        // Generate contextual AI response
        setTimeout(async () => {
            try {
                const response = await this.generateContextualResponse(input);
                await this.displayMessage(response);
                
                // Check if we should transition to quiz or continue conversation
                setTimeout(() => {
                    if (this.shouldTransitionToQuiz()) {
                        this.enterPhase('quiz');
                    } else {
                        // Continue natural conversation - show input for next response
                        this.showUserInput();
                    }
                }, 1000);
            } catch (error) {
                console.error('Error generating response:', error);
                // Fallback response
                await this.displayMessage("That's interesting! Tell me more about yourself.");
                setTimeout(() => {
                    if (this.shouldTransitionToQuiz()) {
                        this.enterPhase('quiz');
                    } else {
                        this.showUserInput();
                    }
                }, 1000);
            }
        }, this.getTypingDelay());
    }
    
    inferFactType(input) {
        // Dynamically infer what type of fact this is
        const lower = input.toLowerCase();
        
        if (lower.includes('name') || lower.match(/i'm|i am|call me/)) {
            return 'name';
        }
        if (lower.includes('work') || lower.includes('job') || lower.includes('career')) {
            return 'profession';
        }
        if (lower.includes('hobby') || lower.includes('enjoy') || lower.includes('love doing')) {
            return 'favHobby';
        }
        if (lower.includes('food') || lower.includes('eat') || lower.includes('cooking')) {
            return 'favFood';
        }
        if (lower.includes('relax') || lower.includes('unwind') || lower.includes('peaceful')) {
            return 'favRelaxPlace';
        }
        
        // Generate a unique key for this fact
        return `fact_${Object.keys(this.state.playerFacts).length + 1}`;
    }
    
    async generateContextualResponse(userInput) {
        // Use LLM if enabled and available
        if (this.state.llmEnabled && window.apiConfig.isOnline) {
            try {
                return await this.generateLLMResponse('introduction', { 
                    customPrompt: `The user just said: "${userInput}". Generate a natural, engaging follow-up response that acknowledges what they shared and asks a relevant question to continue getting to know them. Be conversational and interested.`,
                    userInput: userInput
                });
            } catch (error) {
                console.warn('LLM request failed, falling back to contextual response:', error);
                // Fall through to contextual response
            }
        }
        
        // Generate contextual response based on user input
        return this.generateFallbackResponse(userInput);
    }
    
    generateFallbackResponse(userInput) {
        const lower = userInput.toLowerCase();
        
        // Context-aware responses
        if (lower.includes('work') || lower.includes('job')) {
            return "That sounds like interesting work! What do you enjoy most about it?";
        }
        if (lower.includes('hobby') || lower.includes('enjoy')) {
            return "That's a great hobby! How did you get started with that?";
        }
        if (lower.includes('travel') || lower.includes('place')) {
            return "Travel is wonderful! What's your favorite place you've visited?";
        }
        if (lower.includes('food') || lower.includes('cook')) {
            return "I love hearing about food preferences! Do you enjoy cooking too?";
        }
        if (lower.includes('relax') || lower.includes('unwind')) {
            return "That sounds very peaceful! What else helps you feel relaxed?";
        }
        
        // Generic but engaging responses
        const responses = [
            "That's fascinating! Tell me more about what makes that special to you.",
            "I find that really interesting! What else would you like me to know about you?",
            "Thanks for sharing that with me! What's something else that's important in your life?",
            "That gives me great insight into who you are! What other interests do you have?"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Note: generateFactResponse method removed - replaced with generateContextualResponse for AI-driven conversation
    
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
            let quizIntro;
            if (this.state.llmEnabled && window.apiConfig.isOnline) {
                quizIntro = await this.generateLLMResponse('quiz', { 
                    customPrompt: "Tell the user you want to test your memory of what they've shared. Be friendly and engaging." 
                });
            } else {
                quizIntro = window.fallbackSystem.generateResponse('quiz').response;
            }
            await this.displayMessage(quizIntro);
        } catch (error) {
            console.error('Error generating quiz intro:', error);
            await this.displayMessage("Now I'd like to test my memory of what you've told me. Let me see how well I remember our conversation!");
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

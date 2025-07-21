/**
 * Conversation Flow Controller
 * Manages turn-taking, timing, and natural conversation progression
 */

class ConversationFlowController {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.state = {
            currentTurn: 'system', // 'system', 'user', 'agent'
            turnStartTime: null,
            responseInProgress: false,
            waitingForUser: false,
            lastAgentMessage: null,
            turnTimeout: 30000, // 30 seconds max wait for user
            responseTimeout: 15000 // 15 seconds max for agent response
        };
        
        this.callbacks = {
            onTurnChange: [],
            onTimeout: [],
            onResponseComplete: []
        };
    }

    /**
     * Initialize conversation flow
     */
    initialize() {
        this.startTurn('system');
        this.setupEventListeners();
    }

    /**
     * Start a new conversation turn
     */
    startTurn(turnType, data = {}) {
        this.state.currentTurn = turnType;
        this.state.turnStartTime = Date.now();
        
        // Clear any existing timeouts
        this.clearTimeouts();
        
        switch (turnType) {
            case 'system':
                this.handleSystemTurn(data);
                break;
            case 'user':
                this.handleUserTurn(data);
                break;
            case 'agent':
                this.handleAgentTurn(data);
                break;
        }

        // Notify listeners
        this.notifyTurnChange(turnType, data);
    }

    /**
     * Handle system turn (initial setup, transitions)
     */
    handleSystemTurn(data) {
        this.hideAllInputs();
        
        if (data.action === 'start_conversation') {
            setTimeout(() => {
                this.startTurn('agent', { message: data.initialMessage });
            }, 500);
        } else if (data.action === 'transition') {
            setTimeout(() => {
                this.game.enterPhase(data.targetPhase);
            }, 1000);
        }
    }

    /**
     * Handle user turn (waiting for input)
     */
    handleUserTurn(data) {
        this.state.waitingForUser = true;
        this.state.responseInProgress = false;
        
        // Show appropriate input interface and set up prompt
        this.showUserInput(data.inputType || 'text');
        this.setupUserPrompt(data);
        
        // Set timeout for user response
        this.userTimeout = setTimeout(() => {
            this.handleUserTimeout();
        }, this.state.turnTimeout);
        
        // Enable input if not already enabled
        this.enableUserInput();
    }

    /**
     * Setup user prompt based on current context
     */
    setupUserPrompt(data) {
        if (data.inputType === 'text' && this.game.state.phase === 'introduction') {
            const inputLabel = document.getElementById('input-label');
            const textInput = document.getElementById('text-input');
            
            if (inputLabel && textInput) {
                // Use Warden AI to generate the prompt
                const prompt = this.generateDynamicPrompt();
                inputLabel.textContent = prompt;
                textInput.placeholder = "Type your response here...";
                textInput.focus();
            }
        }
    }

    /**
     * Generate dynamic prompt based on conversation state
     */
    generateDynamicPrompt() {
        if (this.game.dynamicFacts.factCounter === 0) {
            return "Tell me about yourself! What's something interesting you'd like to share?";
        } else {
            // Generate follow-up based on previous facts
            const prompts = [
                "What else would you like me to know about you?",
                "Tell me about another aspect of your life.",
                "What's something else that's important to you?",
                "I'd love to hear more about you!",
                "What's another interesting fact about yourself?"
            ];
            return prompts[Math.floor(Math.random() * prompts.length)];
        }
    }

    /**
     * Handle agent turn (AI responding)
     */
    handleAgentTurn(data) {
        this.state.responseInProgress = true;
        this.state.waitingForUser = false;
        
        this.hideAllInputs();
        this.showTypingIndicator();
        
        // Set timeout for agent response
        this.agentTimeout = setTimeout(() => {
            this.handleAgentTimeout();
        }, this.state.responseTimeout);
        
        // Generate and display agent response
        this.generateAgentResponse(data)
            .then(response => {
                this.displayAgentMessage(response);
                this.completeAgentTurn();
            })
            .catch(error => {
                console.error('Agent response failed:', error);
                this.handleAgentError(error);
            });
    }

    /**
     * Generate agent response based on current context
     */
    async generateAgentResponse(data) {
        try {
            if (data.message) {
                // Pre-generated message
                return data.message;
            }

            // Generate dynamic response using enhanced prompts
            const context = this.buildCurrentContext();
            
            if (this.game.state.llmEnabled && window.apiConfig.isOnline) {
                if (data.userInput && this.game.state.phase === 'introduction') {
                    // Generate response to user fact sharing
                    const enhancedContext = buildDynamicContext(
                        this.game.state.dialogue,
                        this.game.dynamicFacts.getAllFacts(),
                        'introduction',
                        this.game.dynamicFacts.factCounter
                    );
                    
                    const prompt = buildEnhancedCharacterPrompt(
                        this.game.state.characterType,
                        enhancedContext,
                        'introduction',
                        { 
                            userInput: data.userInput,
                            factNumber: this.game.dynamicFacts.factCounter
                        }
                    );
                    
                    const response = await window.apiConfig.makeRequest(prompt.system, prompt.user);
                    const parsed = parseEnhancedLLMResponse(response.content);
                    
                    this.game.state.lastLLMThought = parsed.thought;
                    if (this.game.state.debugMode) {
                        this.game.updateDebugInfo();
                    }
                    
                    return parsed.response;
                } else {
                    return await this.game.generateLLMResponse(
                        this.game.state.phase, 
                        { 
                            ...context, 
                            ...data 
                        }
                    );
                }
            } else {
                // Fallback response
                if (data.userInput && this.game.state.phase === 'introduction') {
                    return window.fallbackSystem.generateResponse(
                        'introduction',
                        { factType: 'general', value: data.userInput }
                    ).response;
                } else {
                    return window.fallbackSystem.generateResponse(
                        this.game.state.phase, 
                        context
                    ).response;
                }
            }
        } catch (error) {
            console.error('Failed to generate agent response:', error);
            throw error;
        }
    }

    /**
     * Build current conversation context
     */
    buildCurrentContext() {
        return {
            phase: this.game.state.phase,
            dialogue: this.game.state.dialogue,
            facts: this.game.dynamicFacts ? this.game.dynamicFacts.getAllFacts() : {},
            turnNumber: this.game.state.dialogue.length + 1
        };
    }

    /**
     * Display agent message with natural timing
     */
    async displayAgentMessage(message) {
        this.hideTypingIndicator();
        
        // Natural typing delay based on message length
        const typingDelay = this.calculateTypingDelay(message);
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        // Display message
        await this.game.displayMessage(message);
        this.state.lastAgentMessage = message;
    }

    /**
     * Calculate natural typing delay based on message content
     */
    calculateTypingDelay(message) {
        const baseDelay = 800; // Minimum delay
        const wordsPerMinute = 40; // Simulate realistic typing speed
        const words = message.split(' ').length;
        const calculatedDelay = (words / wordsPerMinute) * 60 * 1000;
        
        // Cap between 800ms and 4000ms
        return Math.min(Math.max(baseDelay, calculatedDelay), 4000);
    }

    /**
     * Complete agent turn and prepare for next turn
     */
    completeAgentTurn() {
        this.clearTimeouts();
        this.state.responseInProgress = false;
        
        // Determine next turn based on conversation state
        const nextTurn = this.determineNextTurn();
        
        setTimeout(() => {
            this.startTurn(nextTurn.type, nextTurn.data);
        }, 1000); // Brief pause between turns
        
        this.notifyResponseComplete();
    }

    /**
     * Determine what the next turn should be
     */
    determineNextTurn() {
        const phase = this.game.state.phase;
        
        switch (phase) {
            case 'introduction':
                // Check if we need more facts or should transition
                if (this.game.dynamicFacts && this.game.dynamicFacts.factCounter < 6) {
                    return {
                        type: 'user',
                        data: { inputType: 'text' }
                    };
                } else {
                    return {
                        type: 'system', 
                        data: { 
                            action: 'transition',
                            targetPhase: 'quiz'
                        }
                    };
                }
                
            case 'quiz':
                // In quiz phase, determine based on quiz state
                if (this.game.userQuiz && !this.game.userQuiz.isQuizComplete()) {
                    return {
                        type: 'user',
                        data: { inputType: 'quiz' }
                    };
                } else {
                    return {
                        type: 'system',
                        data: {
                            action: 'transition',
                            targetPhase: 'rating'
                        }
                    };
                }
                
            case 'rating':
                if (Object.keys(this.game.state.ratings).length < 2) {
                    return {
                        type: 'user',
                        data: { inputType: 'rating' }
                    };
                } else {
                    return {
                        type: 'system',
                        data: {
                            action: 'transition', 
                            targetPhase: 'complete'
                        }
                    };
                }
                
            default:
                return {
                    type: 'system',
                    data: { action: 'complete' }
                };
        }
    }

    /**
     * Handle user input received
     */
    onUserInput(inputType, inputData) {
        if (!this.state.waitingForUser) {
            console.warn('Received user input when not waiting for it');
            return;
        }

        this.clearTimeouts();
        this.state.waitingForUser = false;
        
        // Process the input
        this.processUserInput(inputType, inputData);
        
        // Move to agent turn
        this.startTurn('agent', {
            userInput: inputData,
            inputType: inputType
        });
    }

    /**
     * Process user input based on type
     */
    processUserInput(inputType, inputData) {
        switch (inputType) {
            case 'text':
                // Record fact if in introduction phase
                if (this.game.state.phase === 'introduction' && this.game.dynamicFacts) {
                    this.game.dynamicFacts.recordFact(inputData);
                }
                break;
                
            case 'quiz_selection':
                // Handle quiz question selection
                if (this.game.userQuiz) {
                    this.game.userQuiz.selectQuestion(inputData);
                }
                break;
                
            case 'rating':
                // Handle rating input
                this.game.state.ratings[inputData.type] = inputData.value;
                break;
        }

        // Log the input
        this.game.state.dialogue.push({
            timestamp: Date.now(),
            speaker: 'User',
            text: inputData,
            phase: this.game.state.phase,
            inputType: inputType
        });
    }

    /**
     * Show appropriate input interface
     */
    showUserInput(inputType) {
        this.hideAllInputs();
        
        switch (inputType) {
            case 'text':
                document.getElementById('text-input-container')?.classList.remove('hidden');
                break;
            case 'quiz':
                document.getElementById('quiz-container')?.classList.remove('hidden');
                break;
            case 'rating':
                document.getElementById('rating-container')?.classList.remove('hidden');
                break;
        }
    }

    /**
     * Hide all input interfaces
     */
    hideAllInputs() {
        const containers = [
            'text-input-container',
            'quiz-container', 
            'rating-container',
            'continue-container'
        ];
        
        containers.forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    }

    /**
     * Enable user input elements
     */
    enableUserInput() {
        const inputs = document.querySelectorAll('input, button, select');
        inputs.forEach(input => {
            input.disabled = false;
        });
    }

    /**
     * Disable user input elements
     */
    disableUserInput() {
        const inputs = document.querySelectorAll('input, button, select');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        document.getElementById('typing-indicator')?.classList.remove('hidden');
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        document.getElementById('typing-indicator')?.classList.add('hidden');
    }

    /**
     * Handle user timeout
     */
    handleUserTimeout() {
        console.log('User input timeout');
        
        // Gentle prompt to continue
        this.startTurn('agent', {
            message: "I'm still here when you're ready to continue our conversation!"
        });
    }

    /**
     * Handle agent timeout
     */
    handleAgentTimeout() {
        console.error('Agent response timeout');
        
        // Show fallback message
        this.displayAgentMessage("I apologize, I seem to be having trouble responding. Let's continue!");
        this.completeAgentTurn();
    }

    /**
     * Handle agent error
     */
    handleAgentError(error) {
        console.error('Agent error:', error);
        
        // Show error recovery message
        this.displayAgentMessage("I had a brief moment of confusion there. What were we talking about?");
        this.completeAgentTurn();
    }

    /**
     * Clear all active timeouts
     */
    clearTimeouts() {
        if (this.userTimeout) {
            clearTimeout(this.userTimeout);
            this.userTimeout = null;
        }
        if (this.agentTimeout) {
            clearTimeout(this.agentTimeout);
            this.agentTimeout = null;
        }
    }

    /**
     * Setup event listeners for conversation flow
     */
    setupEventListeners() {
        // Text input submission
        const submitButton = document.getElementById('submit-button');
        const textInput = document.getElementById('text-input');
        
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const input = textInput?.value?.trim();
                if (input) {
                    this.onUserInput('text', input);
                    textInput.value = '';
                }
            });
        }
        
        if (textInput) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitButton?.click();
                }
            });
        }
    }

    /**
     * Add callback for turn changes
     */
    onTurnChange(callback) {
        this.callbacks.onTurnChange.push(callback);
    }

    /**
     * Add callback for timeouts
     */
    onTimeout(callback) {
        this.callbacks.onTimeout.push(callback);
    }

    /**
     * Add callback for response completion
     */
    onResponseComplete(callback) {
        this.callbacks.onResponseComplete.push(callback);
    }

    /**
     * Notify turn change listeners
     */
    notifyTurnChange(turnType, data) {
        this.callbacks.onTurnChange.forEach(callback => {
            try {
                callback(turnType, data);
            } catch (error) {
                console.error('Turn change callback error:', error);
            }
        });
    }

    /**
     * Notify response completion listeners
     */
    notifyResponseComplete() {
        this.callbacks.onResponseComplete.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Response complete callback error:', error);
            }
        });
    }

    /**
     * Get current turn information
     */
    getCurrentTurn() {
        return {
            type: this.state.currentTurn,
            startTime: this.state.turnStartTime,
            duration: Date.now() - this.state.turnStartTime,
            responseInProgress: this.state.responseInProgress,
            waitingForUser: this.state.waitingForUser
        };
    }

    /**
     * Force end current turn (emergency stop)
     */
    forceEndTurn() {
        this.clearTimeouts();
        this.state.responseInProgress = false;
        this.state.waitingForUser = false;
        this.hideTypingIndicator();
        this.hideAllInputs();
    }

    /**
     * Reset conversation flow
     */
    reset() {
        this.forceEndTurn();
        this.state.currentTurn = 'system';
        this.state.turnStartTime = null;
        this.state.lastAgentMessage = null;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationFlowController;
}
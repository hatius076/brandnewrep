/**
 * Conversation Flow Controller
 * Manages conversation sequence with LLM-only responses (no static templates)
 */

class ConversationFlowController {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.state = {
            currentTurn: 1, // Start with turn 1 (1-13)
            userFacts: {}, // Store collected facts
            waitingForUser: false,
            responseInProgress: false
        };
        
        this.callbacks = {
            onTurnChange: [],
            onTimeout: [],
            onResponseComplete: []
        };
    }

    /**
     * Initialize conversation flow with first turn
     */
    initialize() {
        this.startTurn(1);
        this.setupEventListeners();
    }

    /**
     * Start a specific conversation turn using LLM only
     */
    async startTurn(turnNumber) {
        this.state.currentTurn = turnNumber;
        this.state.responseInProgress = true;
        
        console.log(`🗣️ Starting conversation turn ${turnNumber}/13`);
        
        try {
            let agentMessage;
            
            if (turnNumber <= 8) {
                // Introduction phase - use LLM with contextual prompts
                agentMessage = await this.generateIntroductionResponse(turnNumber);
            } else if (turnNumber >= 9 && turnNumber <= 12) {
                // Quiz phase - use LLM with quiz prompts  
                agentMessage = await this.generateQuizResponse(turnNumber);
            } else if (turnNumber === 13) {
                // Goodbye turn - use LLM with outro prompt
                agentMessage = await this.generateOutroResponse();
            }
            
            // Display the agent's message
            await this.displayAgentMessage(agentMessage);

            // Set up appropriate input based on turn
            setTimeout(() => {
                this.setupTurnInput(turnNumber);
            }, 1000);
            
        } catch (error) {
            console.error(`Error in turn ${turnNumber}:`, error);
            throw error; // No fallback to templates - API is required
        }
    }

    /**
     * Generate introduction response using LLM
     */
    async generateIntroductionResponse(turnNumber) {
        const systemPrompt = buildSystemPrompt(this.game.state.characterType);
        
        let userPrompt;
        const factsContext = Object.entries(this.state.userFacts)
            .filter(([key, value]) => value && value.trim())
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        switch (turnNumber) {
            case 1:
                userPrompt = `Start a conversation by greeting them warmly and asking for their name. Be natural and friendly.`;
                break;
            case 2:
                userPrompt = `You now know their name. Ask about their favorite food in a conversational way.\n\nWhat you know:\n${factsContext}`;
                break;
            case 3:
                userPrompt = `Ask about their hobbies or interests naturally.\n\nWhat you know:\n${factsContext}`;
                break;
            case 4:
                userPrompt = `Ask for an interesting detail about their hobby.\n\nWhat you know:\n${factsContext}`;
                break;
            case 5:
                userPrompt = `Ask about their work or studies.\n\nWhat you know:\n${factsContext}`;
                break;
            case 6:
                userPrompt = `Ask for a fun fact about themselves.\n\nWhat you know:\n${factsContext}`;
                break;
            case 7:
                userPrompt = `Thank them for sharing and express that you enjoyed learning about them.\n\nWhat you know:\n${factsContext}`;
                break;
            case 8:
                userPrompt = `Transition to testing your memory - suggest it in a friendly way.\n\nWhat you know:\n${factsContext}`;
                break;
        }

        const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt);
        return response.content.trim();
    }

    /**
     * Generate quiz response using LLM
     */
    async generateQuizResponse(turnNumber) {
        const quizIndex = turnNumber - 9; // 0-3
        const factTypes = ['name', 'favFood', 'favHobby', 'profession'];
        const factType = factTypes[quizIndex];
        const correctAnswer = this.state.userFacts[factType];
        
        const systemPrompt = buildSystemPrompt(this.game.state.characterType);
        
        let userPrompt;
        if (this.game.state.characterType === 'A') {
            // Agent A - perfect memory
            userPrompt = `Recall what they told you about their ${factType}. Answer confidently and accurately.

Their ${factType}: ${correctAnswer}

Respond naturally as if recalling this information.`;
        } else {
            // Agent B - impaired memory
            const shouldMakeError = Math.random() < 0.5; // 50% chance of error
            
            if (shouldMakeError) {
                userPrompt = `You're trying to recall their ${factType}, but your memory is impaired. Either:
1. State incorrect information confidently, or
2. Show uncertainty with hedging language

The correct answer is: ${correctAnswer}

Apply realistic memory impairment (subtle errors or uncertainty).`;
            } else {
                userPrompt = `Recall what they told you about their ${factType}. Answer correctly but perhaps with slight uncertainty.

Their ${factType}: ${correctAnswer}

Respond naturally as if recalling this information.`;
            }
        }

        const response = await window.apiConfig.makeRequest(systemPrompt, userPrompt);
        return response.content.trim();
    }

    /**
     * Generate outro response using LLM
     */
    async generateOutroResponse() {
        const prompt = buildOutroPrompt(this.game.state.characterType, this.state.userFacts);
        const response = await window.apiConfig.makeRequest(prompt.system, prompt.user);
        return response.content.trim();
    }

    /**
     * Display agent message with typing animation
     */
    async displayAgentMessage(message) {
        // Show typing indicator
        this.showTypingIndicator();
        
        // Calculate typing delay
        const typingDelay = this.calculateTypingDelay(message);
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        // Hide typing and show message
        this.hideTypingIndicator();
        await this.game.displayMessage(message);
        
        this.state.responseInProgress = false;
    }

    /**
     * Set up input for the current turn
     */
    setupTurnInput(turnNumber) {
        this.hideAllInputs();
        
        if (turnNumber <= 6) {
            // Fact collection turns - text input
            this.showTextInput();
        } else if (turnNumber === 7 || turnNumber === 8) {
            // Transition turns - continue button
            this.showContinueButton();
        } else if (turnNumber >= 9 && turnNumber <= 12) {
            // Quiz turns - continue button (AI responds)
            this.showContinueButton();
        } else if (turnNumber === 13) {
            // Goodbye turn - no input needed
            this.completeConversation();
        }
    }

    /**
     * Show text input for fact collection
     */
    showTextInput() {
        const container = document.getElementById('text-input-container');
        const input = document.getElementById('text-input');
        const label = document.getElementById('input-label');
        
        if (label) label.textContent = 'Your response:';
        if (input) {
            input.value = '';
            input.focus();
        }
        if (container) container.classList.remove('hidden');
        
        this.state.waitingForUser = true;
    }

    /**
     * Show continue button
     */
    showContinueButton() {
        const container = document.getElementById('continue-container');
        if (container) container.classList.remove('hidden');
        
        // Set up continue button event
        const button = document.getElementById('continue-button');
        if (button) {
            button.onclick = () => this.handleContinue();
        }
    }

    /**
     * Update debug information
     */
    updateDebugInfo(title = '', data = null) {
        if (!this.game.state.debugMode) return;
        
        const debugMemory = document.getElementById('debug-memory');
        if (!debugMemory) return;
        
        let debugContent = '';
        
        // Show collected facts
        if (Object.keys(this.state.userFacts).length > 0) {
            debugContent += 'Collected Facts:<br>';
            Object.entries(this.state.userFacts).forEach(([key, value]) => {
                debugContent += `${key}: ${value}<br>`;
            });
            debugContent += '<br>';
        }
        
        // Show additional debug data if provided
        if (title && data) {
            debugContent += `${title}<br>`;
            if (typeof data === 'object') {
                debugContent += JSON.stringify(data, null, 2).replace(/\n/g, '<br>');
            } else {
                debugContent += data;
            }
        }
        
        debugMemory.innerHTML = debugContent;
    }

    /**
     * Handle user input for fact collection turns
     */
    onUserInput(inputValue) {
        if (!this.state.waitingForUser) return;
        
        this.state.waitingForUser = false;
        this.hideAllInputs();
        
        // Store the user's response based on current turn
        const factKey = this.getTurnFactKey(this.state.currentTurn);
        if (factKey) {
            this.state.userFacts[factKey] = inputValue.trim();
            console.log(`📝 Stored ${factKey}:`, inputValue.trim());
        }

        // Move to next turn
        this.moveToNextTurn();
    }

    /**
     * Get the fact key for storing user input based on turn number
     */
    getTurnFactKey(turnNumber) {
        const factMap = {
            1: 'name',
            2: 'favFood', 
            3: 'favHobby',
            4: 'hobbyFact',
            5: 'profession',
            6: 'funFact'
        };
        return factMap[turnNumber];
    }

    /**
     * Handle continue button click
     */
    handleContinue() {
        this.hideAllInputs();
        this.moveToNextTurn();
    }

    /**
     * Move to the next conversation turn
     */
    moveToNextTurn() {
        if (this.state.currentTurn >= 13) {
            this.completeConversation();
            return;
        }

        // Transition to quiz phase if we're moving from turn 8 to 9
        if (this.state.currentTurn === 8) {
            this.game.enterPhase('quiz');
        }
        
        setTimeout(() => {
            this.startTurn(this.state.currentTurn + 1);
        }, 1000);
    }

    /**
     * Complete the conversation
     */
    completeConversation() {
        console.log('✅ 13-turn conversation complete');
        
        // Update debug information
        this.updateDebugInfo();
        
        // Move to next phase or complete session
        if (this.game.state.currentAgent === 'A') {
            // After Agent A, move to Agent B
            this.game.showAgentBTransition();
        } else {
            // After Agent B, complete session
            this.game.enterPhase('complete');
        }
    }

    /**
     * Calculate natural typing delay
     */
    calculateTypingDelay(message) {
        const baseDelay = 800;
        const wordsPerMinute = 40;
        const words = message.split(' ').length;
        const calculatedDelay = (words / wordsPerMinute) * 60 * 1000;
        return Math.min(Math.max(baseDelay, calculatedDelay), 4000);
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
     * Setup event listeners for user input
     */
    setupEventListeners() {
        const submitButton = document.getElementById('submit-button');
        const textInput = document.getElementById('text-input');
        
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const input = textInput?.value?.trim();
                if (input) {
                    this.onUserInput(input);
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
     * Reset conversation flow
     */
    reset() {
        this.state.currentTurn = 1;
        this.state.userFacts = {};
        this.state.waitingForUser = false;
        this.state.responseInProgress = false;
        
        this.hideAllInputs();
    }

    // Legacy compatibility methods
    onTurnChange(callback) { this.callbacks.onTurnChange.push(callback); }
    onTimeout(callback) { this.callbacks.onTimeout.push(callback); }
    onResponseComplete(callback) { this.callbacks.onResponseComplete.push(callback); }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationFlowController;
}

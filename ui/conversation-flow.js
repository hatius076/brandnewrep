/**
 * Conversation Flow Controller
 * Manages the 13-turn deterministic conversation sequence
 */

class ConversationFlowController {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.state = {
            currentTurn: 1, // Start with turn 1 (1-13)
            userFacts: {}, // Store collected facts
            agentBErrorSchedule: [], // Pre-determined error schedule for Agent B
            waitingForUser: false,
            responseInProgress: false
        };
        
        this.callbacks = {
            onTurnChange: [],
            onTimeout: [],
            onResponseComplete: []
        };

        // Initialize Agent B error schedule if this is Agent B
        if (this.game.state.characterType === 'B') {
            this.state.agentBErrorSchedule = generateQuizErrorSchedule();
            console.log('🎯 Agent B Quiz Error Schedule:', this.state.agentBErrorSchedule);
        }
    }

    /**
     * Initialize conversation flow with first turn
     */
    initialize() {
        this.startTurn(1);
        this.setupEventListeners();
    }

    /**
     * Start a specific conversation turn
     */
    startTurn(turnNumber) {
        this.state.currentTurn = turnNumber;
        this.state.responseInProgress = true;
        
        console.log(`🗣️ Starting conversation turn ${turnNumber}/13`);
        
        // Get template for this turn
        const template = getConversationTemplate(turnNumber, this.state.userFacts);
        if (!template) {
            console.error(`No template found for turn ${turnNumber}`);
            return;
        }

        // Display the agent's message
        this.displayAgentMessage(template.prompt);

        // Set up appropriate input based on turn
        setTimeout(() => {
            this.setupTurnInput(template);
        }, 1500);
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
    setupTurnInput(template) {
        this.hideAllInputs();
        
        switch (template.inputType) {
            case 'text':
                this.showTextInput(template);
                break;
            case 'continue':
                this.showContinueButton();
                break;
            case 'quiz':
                this.showQuizInput(template);
                break;
            case 'none':
                // No input needed (goodbye turn)
                this.completeConversation();
                break;
        }
    }

    /**
     * Show text input for fact collection
     */
    showTextInput(template) {
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
     * Show quiz input for Agent B responses
     */
    showQuizInput(template) {
        const container = document.getElementById('quiz-container');
        const question = document.getElementById('quiz-question');
        const options = document.getElementById('quiz-options');
        
        if (question) question.textContent = template.prompt;
        
        // For quiz turns 9-12, Agent B gives its response
        if (this.game.state.characterType === 'B') {
            this.generateAgentBQuizResponse(template);
        } else {
            // Agent A gives perfect response
            this.generateAgentAQuizResponse(template);
        }
        
        if (container) container.classList.remove('hidden');
    }

    /**
     * Generate Agent A's perfect quiz response
     */
    generateAgentAQuizResponse(template) {
        const correctAnswer = this.state.userFacts[template.type];
        if (correctAnswer) {
            setTimeout(() => {
                this.displayAgentMessage(`${correctAnswer}!`);
                setTimeout(() => this.moveToNextTurn(), 2000);
            }, 1000);
        }
    }

    /**
     * Generate Agent B's quiz response with potential errors
     */
    generateAgentBQuizResponse(template) {
        const quizTurnIndex = this.state.currentTurn - 9; // Turns 9-12 map to indices 0-3
        const errorType = this.state.agentBErrorSchedule[quizTurnIndex];
        const correctAnswer = this.state.userFacts[template.type];
        
        let response;
        if (errorType === 'correct') {
            response = `${correctAnswer}!`;
        } else {
            response = getAgentBErrorResponse(template.type, correctAnswer, errorType);
        }
        
        setTimeout(() => {
            this.displayAgentMessage(response);
            setTimeout(() => this.moveToNextTurn(), 2000);
        }, 1000);
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
     * Update debug information to show quiz error schedule
     */
    updateDebugInfo() {
        const debugMemory = document.getElementById('debug-memory');
        if (debugMemory && this.game.state.characterType === 'B') {
            const schedule = this.state.agentBErrorSchedule;
            const scheduleText = schedule.map((type, index) => {
                const turnNum = index + 9;
                return `Turn ${turnNum}: ${type}`;
            }).join('<br>');
            
            debugMemory.innerHTML = `Quiz Error Schedule:<br>${scheduleText}`;
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
        
        if (this.game.state.characterType === 'B') {
            this.state.agentBErrorSchedule = generateQuizErrorSchedule();
        }
        
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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationFlowController;
}

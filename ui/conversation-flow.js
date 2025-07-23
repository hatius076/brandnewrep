/**
 * Conversation Flow Controller
 * Manages the 13-turn deterministic conversation sequence with LLM integration
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
     * Start a specific conversation turn using LLM with fixed prompts
     */
    async startTurn(turnNumber) {
        this.state.currentTurn = turnNumber;
        this.state.responseInProgress = true;
        
        console.log(`🗣️ Starting conversation turn ${turnNumber}/13`);
        
        try {
            let agentMessage;
            
            if (turnNumber <= 8) {
                // Introduction phase - use fixed LLM prompts
                agentMessage = await this.generateLLMResponse(turnNumber);
            } else if (turnNumber >= 9 && turnNumber <= 12) {
                // Quiz phase - use quiz templates  
                agentMessage = await this.handleQuizTurn(turnNumber);
            } else if (turnNumber === 13) {
                // Goodbye turn
                const template = getConversationTemplate(turnNumber, this.state.userFacts);
                agentMessage = template.prompt;
            }
            
            // Display the agent's message
            await this.displayAgentMessage(agentMessage);

            // Set up appropriate input based on turn
            setTimeout(() => {
                this.setupTurnInput(turnNumber);
            }, 1000);
            
        } catch (error) {
            console.error(`Error in turn ${turnNumber}:`, error);
            // Fallback to template system
            const template = getConversationTemplate(turnNumber, this.state.userFacts);
            if (template) {
                await this.displayAgentMessage(template.prompt);
                setTimeout(() => {
                    this.setupTurnInput(turnNumber);
                }, 1000);
            }
        }
    }

    /**
     * Generate LLM response using fixed prompts with context
     */
    async generateLLMResponse(turnNumber) {
        // Build fixed prompt with collected facts context
        const promptData = buildFixedTurnPrompt(turnNumber, this.state.userFacts, this.game.state.characterType);
        
        // Make LLM call through the API config
        const rawResponse = await window.apiConfig.makeRequest(
            promptData.system,
            promptData.user
        );
        
        // Parse response and remove any debug info from user display
        const parsed = parseCleanLLMResponse(rawResponse);
        
        // Store debug info if needed
        if (parsed.hasDebugInfo && this.game.state.debugMode) {
            this.updateDebugInfo(`Turn ${turnNumber} debug:`, parsed.raw);
        }
        
        return parsed.response;
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
     * Handle quiz turn with Agent B error logic
     */
    async handleQuizTurn(turnNumber) {
        const quizIndex = turnNumber - 9; // 0-3
        const template = getConversationTemplate(turnNumber, this.state.userFacts);
        const question = template.prompt;
        const factType = template.type;
        const correctAnswer = this.state.userFacts[factType];
        
        if (this.game.state.characterType === 'B') {
            const errorType = this.state.agentBErrorSchedule[quizIndex];
            
            // Store error info in debug only
            if (this.game.state.debugMode) {
                this.updateDebugInfo(`Quiz Turn ${turnNumber}:`, {
                    question,
                    correctAnswer,
                    errorType,
                    factType
                });
            }
            
            if (errorType !== 'correct') {
                return getAgentBErrorResponse(factType, correctAnswer, errorType);
            }
        }
        
        return `${correctAnswer}!`;
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
     * Update debug information to show quiz error schedule and turn info
     */
    updateDebugInfo(title = '', data = null) {
        if (!this.game.state.debugMode) return;
        
        const debugMemory = document.getElementById('debug-memory');
        if (!debugMemory) return;
        
        let debugContent = '';
        
        // Show Agent B error schedule
        if (this.game.state.characterType === 'B' && this.state.agentBErrorSchedule.length > 0) {
            const schedule = this.state.agentBErrorSchedule;
            const scheduleText = schedule.map((type, index) => {
                const turnNum = index + 9;
                return `Turn ${turnNum}: ${type}`;
            }).join('<br>');
            
            debugContent += `Quiz Error Schedule:<br>${scheduleText}<br><br>`;
        }
        
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

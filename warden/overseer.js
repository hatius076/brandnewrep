/**
 * Warden AI System - Independent oversight AI that manages conversation flow
 * Responsible for timing control, turn-taking, and dynamic question generation
 */

class WardenAI {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.conversationState = {
            agentResponding: false,
            awaitingInput: false,
            currentPhase: 'init',
            factsCollected: 0,
            lastUserInput: '',
            lastAgentResponse: '',
            conversationContext: []
        };
        
        this.factTargets = 6; // Dynamic fact collection target
        this.turnTimeoutMs = 30000; // Maximum wait for user input
    }

    /**
     * Analyze current conversation state and determine next action
     */
    analyzeConversation(dialogue, currentPhase, factsCollected) {
        this.conversationState.currentPhase = currentPhase;
        this.conversationState.factsCollected = factsCollected;
        
        // Check if agent has finished responding
        const agentFinishedResponse = this.checkAgentResponseComplete();
        
        // Determine if input should be visible
        const shouldShowInput = this.shouldShowInputBox();
        
        // Generate next question if needed
        const nextQuestion = this.generateNextQuestion();
        
        return {
            agentFinished: agentFinishedResponse,
            showInput: shouldShowInput,
            nextQuestion: nextQuestion,
            shouldTransition: this.shouldTransitionPhase(),
            recommendedAction: this.getRecommendedAction()
        };
    }

    /**
     * Check if agent has completed their response
     */
    checkAgentResponseComplete() {
        // In real implementation, this would monitor LLM response stream
        // For now, we'll use timing-based approach
        if (this.conversationState.agentResponding) {
            // Check if enough time has passed for response to complete
            const responseTime = Date.now() - this.lastResponseStart;
            return responseTime > 1000; // Minimum 1 second for response
        }
        return true;
    }

    /**
     * Determine when to show input box (proper turn-taking)
     */
    shouldShowInputBox() {
        // Only show input when:
        // 1. Agent has finished responding
        // 2. We're in a phase that accepts user input
        // 3. We're not transitioning between phases
        
        const agentFinished = this.checkAgentResponseComplete();
        const inInputPhase = ['introduction', 'quiz-user-controlled'].includes(this.conversationState.currentPhase);
        const notTransitioning = !this.conversationState.transitioning;
        
        return agentFinished && inInputPhase && notTransitioning;
    }

    /**
     * Generate dynamic, contextual follow-up questions
     */
    generateNextQuestion(previousAnswer = null, conversationContext = []) {
        if (this.conversationState.currentPhase !== 'introduction') {
            return null;
        }

        // If we have collected enough facts, suggest transition
        if (this.conversationState.factsCollected >= this.factTargets) {
            return {
                type: 'transition',
                suggestion: 'quiz',
                message: "I've learned so much about you! Would you like to test how well I remembered everything?"
            };
        }

        // Generate organic follow-up based on previous answer
        return this.generateOrganicQuestion(previousAnswer, conversationContext);
    }

    /**
     * Generate organic follow-up questions based on user's actual responses
     */
    generateOrganicQuestion(previousAnswer, context) {
        if (!previousAnswer) {
            // Initial greeting - ask open-ended question
            return {
                type: 'open',
                question: "Tell me about yourself! What's something interesting you'd like to share?",
                factNumber: this.conversationState.factsCollected + 1
            };
        }

        // Analyze previous answer to generate natural follow-up
        const followUps = this.generateContextualFollowUp(previousAnswer);
        
        return {
            type: 'followup',
            question: followUps[Math.floor(Math.random() * followUps.length)],
            factNumber: this.conversationState.factsCollected + 1,
            context: previousAnswer
        };
    }

    /**
     * Generate contextual follow-up questions based on user input
     */
    generateContextualFollowUp(userInput) {
        const input = userInput.toLowerCase();
        const followUps = [];

        // Look for keywords and generate appropriate follow-ups
        if (input.includes('work') || input.includes('job') || input.includes('career')) {
            followUps.push(
                "What do you enjoy most about your work?",
                "How did you get into that field?",
                "What's a typical day like for you?"
            );
        }
        
        if (input.includes('hobby') || input.includes('enjoy') || input.includes('like')) {
            followUps.push(
                "How did you get started with that?",
                "What drew you to that particular activity?",
                "Do you have any other interests?"
            );
        }
        
        if (input.includes('travel') || input.includes('place') || input.includes('visit')) {
            followUps.push(
                "What's your favorite place you've visited?",
                "Where would you like to travel next?",
                "What do you love about traveling?"
            );
        }
        
        if (input.includes('family') || input.includes('friend') || input.includes('people')) {
            followUps.push(
                "Tell me more about the important people in your life.",
                "What do you enjoy doing with others?",
                "How do you like to spend time with loved ones?"
            );
        }

        // General follow-ups if no specific keywords found
        if (followUps.length === 0) {
            followUps.push(
                "That's interesting! What else would you like me to know about you?",
                "Tell me more about that - what makes it special to you?",
                "What's something else that's important to you?",
                "I'd love to hear about another aspect of your life.",
                "What's something you're passionate about?"
            );
        }

        return followUps;
    }

    /**
     * Determine if we should transition between phases
     */
    shouldTransitionPhase() {
        switch (this.conversationState.currentPhase) {
            case 'introduction':
                return this.conversationState.factsCollected >= this.factTargets;
            case 'quiz':
                return this.game.state.quizAnswers.length >= this.conversationState.factsCollected;
            case 'rating':
                return Object.keys(this.game.state.ratings).length >= 2;
            default:
                return false;
        }
    }

    /**
     * Get recommended action for the game engine
     */
    getRecommendedAction() {
        if (this.shouldTransitionPhase()) {
            const nextPhase = this.getNextPhase();
            return {
                type: 'transition',
                targetPhase: nextPhase,
                message: this.getTransitionMessage(nextPhase)
            };
        }

        if (this.conversationState.currentPhase === 'introduction') {
            return {
                type: 'collect_fact',
                factNumber: this.conversationState.factsCollected + 1
            };
        }

        return {
            type: 'continue',
            message: 'Continue current flow'
        };
    }

    /**
     * Get next phase in conversation flow
     */
    getNextPhase() {
        const phaseFlow = {
            'introduction': 'quiz',
            'quiz': 'rating', 
            'rating': 'complete'
        };
        return phaseFlow[this.conversationState.currentPhase] || 'complete';
    }

    /**
     * Get transition message for phase changes
     */
    getTransitionMessage(nextPhase) {
        const messages = {
            'quiz': "I've learned so much about you! Would you like to test how well I remembered everything?",
            'rating': "Thank you for letting me test my memory! Now I'd like to ask you a few questions about our conversation.",
            'complete': "Thank you for this wonderful conversation!"
        };
        return messages[nextPhase] || "Let's continue!";
    }

    /**
     * Update conversation state based on new input
     */
    updateConversationState(type, data) {
        switch (type) {
            case 'user_input':
                this.conversationState.lastUserInput = data;
                this.conversationState.awaitingInput = false;
                break;
            case 'agent_response_start':
                this.conversationState.agentResponding = true;
                this.lastResponseStart = Date.now();
                break;
            case 'agent_response_complete':
                this.conversationState.agentResponding = false;
                this.conversationState.lastAgentResponse = data;
                this.conversationState.awaitingInput = true;
                break;
            case 'fact_collected':
                this.conversationState.factsCollected++;
                break;
            case 'phase_transition':
                this.conversationState.currentPhase = data;
                this.conversationState.transitioning = false;
                break;
        }
    }

    /**
     * Control UI state based on conversation flow
     */
    controlUI() {
        const shouldShow = this.shouldShowInputBox();
        const inputContainer = document.getElementById('text-input-container');
        const quizContainer = document.getElementById('quiz-container');
        
        if (this.conversationState.currentPhase === 'introduction') {
            if (shouldShow) {
                inputContainer.classList.remove('hidden');
            } else {
                inputContainer.classList.add('hidden');
            }
            quizContainer.classList.add('hidden');
        }
    }

    /**
     * Generate dynamic quiz options based on conversation content
     */
    generateQuizOptions(conversationHistory) {
        const questions = [];
        const facts = this.extractFactsFromConversation(conversationHistory);
        
        facts.forEach((fact, index) => {
            if (fact.content && fact.content.trim()) {
                const question = this.generateQuestionFromFact(fact, index + 1);
                if (question) {
                    questions.push(question);
                }
            }
        });
        
        return questions;
    }

    /**
     * Extract collected facts from conversation history
     */
    extractFactsFromConversation(conversationHistory) {
        const facts = [];
        
        // Look through conversation for user responses
        conversationHistory.forEach((turn, index) => {
            if (turn.speaker === 'User' && turn.phase === 'introduction') {
                facts.push({
                    factNumber: facts.length + 1,
                    content: turn.text,
                    context: this.getContextForFact(conversationHistory, index)
                });
            }
        });
        
        return facts;
    }

    /**
     * Generate question text from collected fact
     */
    generateQuestionFromFact(fact, factNumber) {
        if (!fact.content) return null;
        
        // Generate natural question based on fact content
        const content = fact.content.toLowerCase();
        
        if (content.includes('name')) {
            return `What did I tell you my name was?`;
        }
        
        if (content.includes('work') || content.includes('job')) {
            return `What did I tell you about my work or profession?`;
        }
        
        if (content.includes('hobby') || content.includes('enjoy') || content.includes('like')) {
            return `What hobby or activity did I mention enjoying?`;
        }
        
        if (content.includes('travel') || content.includes('place')) {
            return `What did I tell you about places I've been or want to visit?`;
        }
        
        // Generic question for any fact
        return `What did I tell you in fact #${factNumber}?`;
    }

    /**
     * Get context around a specific fact for better question generation
     */
    getContextForFact(conversationHistory, factIndex) {
        const start = Math.max(0, factIndex - 1);
        const end = Math.min(conversationHistory.length, factIndex + 2);
        return conversationHistory.slice(start, end);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WardenAI;
}
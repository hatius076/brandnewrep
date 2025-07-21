/**
 * Warden AI System - Meta-AI for Conversation Flow Control
 * Oversees conversation agents and manages dynamic fact collection
 */

class WardenAI {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.state = {
            factsCollected: 0,
            factSlots: {}, // Dynamic fact storage: {1: {content, topic}, 2: {content, topic}, ...}
            currentPhase: 'introduction', // introduction, quiz, rating, complete
            turnCount: 0,
            lastAgentResponse: null,
            awaitingUserInput: false,
            conversationContext: []
        };
        
        this.maxFacts = 6;
        this.transitionThresholds = {
            minFactsForQuiz: 6,
            maxFactsTotal: 6
        };
    }

    /**
     * Initialize the Warden AI system
     */
    async initialize() {
        console.log('[Warden] Initializing conversation flow control');
        this.logWardenEvent('warden_initialized', {
            maxFacts: this.maxFacts,
            phase: this.state.currentPhase
        });
        
        // Start the conversation
        await this.beginConversation();
    }

    /**
     * Begin the conversation with initial greeting
     */
    async beginConversation() {
        this.state.currentPhase = 'introduction';
        
        // Generate dynamic greeting based on conversation goals
        const wardenDecision = await this.makeWardenDecision('conversation_start');
        
        if (wardenDecision.action === 'start_conversation') {
            await this.delegateToAgent('greeting', {
                instruction: 'Greet the user warmly and naturally ask them to share about themselves. Be conversational and friendly.'
            });
        }
    }

    /**
     * Process user input and determine next action
     */
    async processUserInput(userText) {
        if (!userText || !userText.trim()) return;

        this.state.turnCount++;
        this.logUserMessage(userText);

        // Extract and store fact from user input
        const fact = await this.extractAndStoreFact(userText);
        
        if (fact) {
            this.state.factsCollected++;
            console.log(`[Warden] Fact ${this.state.factsCollected}/6 collected:`, fact);
        }

        // Decide next action based on current state
        const wardenDecision = await this.makeWardenDecision('user_response', {
            userText,
            extractedFact: fact,
            factsCollected: this.state.factsCollected
        });

        await this.executeWardenDecision(wardenDecision);
    }

    /**
     * Extract and store a fact from user input
     */
    async extractAndStoreFact(userText) {
        if (this.state.factsCollected >= this.maxFacts) {
            return null; // Already collected enough facts
        }

        // Use Warden AI to analyze user input and extract meaningful information
        const analysis = await this.analyzeUserInput(userText);
        
        if (analysis.containsFact) {
            const factNumber = this.state.factsCollected + 1;
            const fact = {
                number: factNumber,
                content: analysis.factContent,
                topic: analysis.topic,
                rawInput: userText,
                timestamp: Date.now(),
                turnNumber: this.state.turnCount
            };

            this.state.factSlots[factNumber] = fact;
            
            this.logWardenEvent('fact_stored', {
                factNumber,
                content: fact.content,
                topic: fact.topic,
                totalCollected: this.state.factsCollected + 1
            });

            return fact;
        }

        return null;
    }

    /**
     * Use Warden AI to analyze user input for fact extraction
     */
    async analyzeUserInput(userText) {
        if (!this.game.state.llmEnabled || !window.apiConfig.isOnline) {
            // Fallback analysis for offline mode
            return this.fallbackFactAnalysis(userText);
        }

        try {
            const wardenPrompt = this.buildWardenPrompt('fact_analysis', {
                userText,
                currentFacts: this.state.factSlots,
                conversationContext: this.state.conversationContext.slice(-3) // Last 3 turns
            });

            const response = await window.apiConfig.makeRequest(
                wardenPrompt.system,
                wardenPrompt.user,
                { maxTokens: 200 }
            );

            return this.parseWardenAnalysis(response.content);
        } catch (error) {
            console.warn('[Warden] LLM analysis failed, using fallback:', error);
            return this.fallbackFactAnalysis(userText);
        }
    }

    /**
     * Fallback fact analysis when LLM is unavailable
     */
    fallbackFactAnalysis(userText) {
        // Simple heuristic-based analysis
        const text = userText.toLowerCase().trim();
        
        if (text.length < 3) {
            return { containsFact: false };
        }

        // Determine topic based on keywords
        let topic = 'general';
        if (text.includes('game') || text.includes('play') || text.includes('esports')) {
            topic = 'gaming';
        } else if (text.includes('work') || text.includes('job') || text.includes('study')) {
            topic = 'profession';
        } else if (text.includes('food') || text.includes('eat') || text.includes('favorite')) {
            topic = 'preferences';
        } else if (text.includes('live') || text.includes('from') || text.includes('city')) {
            topic = 'location';
        }

        return {
            containsFact: true,
            factContent: userText,
            topic: topic,
            confidence: 0.7
        };
    }

    /**
     * Parse Warden AI analysis response
     */
    parseWardenAnalysis(response) {
        try {
            // Look for structured response
            const analysisMatch = response.match(/\[ANALYSIS\]:\s*(.*?)(?=\[|$)/s);
            if (analysisMatch) {
                const analysis = JSON.parse(analysisMatch[1].trim());
                return analysis;
            }
        } catch (error) {
            console.warn('[Warden] Failed to parse structured analysis:', error);
        }

        // Fallback parsing
        const containsFact = response.toLowerCase().includes('fact:') || 
                           response.toLowerCase().includes('information:');
        
        return {
            containsFact,
            factContent: containsFact ? response.split('\n')[0] : '',
            topic: 'general',
            confidence: 0.5
        };
    }

    /**
     * Make high-level decisions about conversation flow
     */
    async makeWardenDecision(context, data = {}) {
        let decision = {
            action: 'continue_conversation',
            reason: '',
            nextInstruction: '',
            shouldTransition: false,
            newPhase: null
        };

        switch (context) {
            case 'conversation_start':
                decision.action = 'start_conversation';
                decision.nextInstruction = 'Begin with a warm greeting and invitation to share';
                break;

            case 'user_response':
                decision = await this.decideAfterUserResponse(data);
                break;

            case 'facts_complete':
                decision.action = 'transition_to_quiz';
                decision.shouldTransition = true;
                decision.newPhase = 'quiz';
                decision.reason = 'Collected all required facts';
                break;
        }

        this.logWardenEvent('decision_made', {
            context,
            decision,
            currentState: this.state
        });

        return decision;
    }

    /**
     * Decide what to do after user provides a response
     */
    async decideAfterUserResponse(data) {
        const { extractedFact, factsCollected } = data;
        
        // Check if we should transition to quiz
        if (factsCollected >= this.transitionThresholds.minFactsForQuiz) {
            return {
                action: 'transition_to_quiz',
                shouldTransition: true,
                newPhase: 'quiz',
                reason: 'Collected sufficient facts for quiz phase',
                nextInstruction: 'Transition to memory testing phase'
            };
        }

        // Continue collecting facts
        const nextQuestion = await this.generateNextQuestion(data);
        
        return {
            action: 'continue_conversation',
            shouldTransition: false,
            nextInstruction: nextQuestion,
            reason: `Need ${this.transitionThresholds.minFactsForQuiz - factsCollected} more facts`
        };
    }

    /**
     * Generate contextual follow-up question
     */
    async generateNextQuestion(data) {
        const { userText, extractedFact } = data;
        
        // Generate contextual follow-up based on what user just shared
        if (extractedFact) {
            return this.generateContextualFollowup(extractedFact);
        }

        // Generate general follow-up
        return this.generateGeneralFollowup();
    }

    /**
     * Generate contextual follow-up based on extracted fact
     */
    generateContextualFollowup(fact) {
        const followups = {
            gaming: [
                "That's interesting! What specific games do you enjoy?",
                "How long have you been into gaming?",
                "Do you play competitively or just for fun?"
            ],
            profession: [
                "That sounds like fascinating work! What do you enjoy most about it?",
                "How did you get into that field?",
                "What's a typical day like for you?"
            ],
            location: [
                "That's a great place! What do you like most about living there?",
                "Have you been there long?",
                "What's your favorite spot in the area?"
            ],
            preferences: [
                "Great choice! What got you into that?",
                "How often do you enjoy that?",
                "Any particular reason that's your favorite?"
            ],
            general: [
                "That's really interesting! Tell me more about that.",
                "What else would you like to share about yourself?",
                "I'd love to hear more about your interests."
            ]
        };

        const topicFollowups = followups[fact.topic] || followups.general;
        return topicFollowups[Math.floor(Math.random() * topicFollowups.length)];
    }

    /**
     * Generate general follow-up question
     */
    generateGeneralFollowup() {
        const generalQuestions = [
            "What else would you like to share about yourself?",
            "Tell me about something you're passionate about.",
            "What do you enjoy doing in your free time?",
            "What's something interesting about you?",
            "I'd love to learn more about you - what else should I know?"
        ];

        return generalQuestions[Math.floor(Math.random() * generalQuestions.length)];
    }

    /**
     * Execute a Warden decision
     */
    async executeWardenDecision(decision) {
        switch (decision.action) {
            case 'continue_conversation':
                await this.delegateToAgent('respond', {
                    instruction: decision.nextInstruction,
                    facts: this.state.factSlots,
                    context: this.state.conversationContext
                });
                break;

            case 'transition_to_quiz':
                await this.transitionToQuizPhase();
                break;

            case 'start_conversation':
                await this.delegateToAgent('greeting', {
                    instruction: decision.nextInstruction
                });
                break;
        }
    }

    /**
     * Transition to quiz phase with user-controlled questions
     */
    async transitionToQuizPhase() {
        this.state.currentPhase = 'quiz';
        
        // First, have the agent announce the transition
        await this.delegateToAgent('quiz_transition', {
            instruction: 'Announce that you want to test your memory of what the user shared. Be friendly and engaging.',
            facts: this.state.factSlots
        });

        // Then enable user question input
        setTimeout(() => {
            this.game.enterPhase('quiz');
        }, 2000);
    }

    /**
     * Handle user-generated quiz questions
     */
    async handleUserQuestion(question) {
        this.logWardenEvent('user_question_received', {
            question,
            availableFacts: Object.keys(this.state.factSlots).length
        });

        // Use agent to answer the user's question based on memory
        await this.delegateToAgent('answer_question', {
            question,
            facts: this.state.factSlots,
            instruction: 'Answer the user\'s question based on what you remember from our conversation.'
        });
    }

    /**
     * Delegate response generation to conversation agent
     */
    async delegateToAgent(action, context) {
        this.state.awaitingUserInput = false;
        
        try {
            let response;
            
            if (this.game.state.llmEnabled && window.apiConfig.isOnline) {
                response = await this.generateAgentResponse(action, context);
            } else {
                response = this.generateFallbackResponse(action, context);
            }

            await this.game.displayMessage(response);
            
            this.logAgentMessage(response);
            this.state.lastAgentResponse = response;
            
            // Enable user input after agent response is complete
            setTimeout(() => {
                this.state.awaitingUserInput = true;
                if (this.state.currentPhase === 'introduction') {
                    this.game.showFactCollectionInput();
                }
            }, 500);
            
        } catch (error) {
            console.error('[Warden] Agent delegation failed:', error);
            const fallback = this.generateFallbackResponse(action, context);
            await this.game.displayMessage(fallback);
        }
    }

    /**
     * Generate agent response using LLM
     */
    async generateAgentResponse(action, context) {
        const agentPrompt = this.buildAgentPrompt(action, context);
        
        const response = await window.apiConfig.makeRequest(
            agentPrompt.system,
            agentPrompt.user,
            { maxTokens: 150 } // Reasonable limit but not restrictive
        );

        // Parse agent response
        const parsed = parseLLMResponse(response.content);
        
        // Update debug info if enabled
        if (this.game.state.debugMode) {
            this.game.state.lastLLMThought = parsed.thought;
            this.game.updateDebugInfo();
        }

        return parsed.response;
    }

    /**
     * Generate fallback response for offline mode
     */
    generateFallbackResponse(action, context) {
        const fallbacks = {
            greeting: [
                "Hello! I'm excited to get to know you better. Tell me about yourself!",
                "Hi there! I'd love to learn more about you. What would you like to share?",
                "Welcome! I'm looking forward to our conversation. What should I know about you?"
            ],
            respond: [
                context.instruction || "That's really interesting! Tell me more.",
                "I'd love to hear more about that!",
                "That sounds fascinating! What else can you share?"
            ],
            quiz_transition: [
                "That was a great conversation! Now I'd like to test my memory of what you shared.",
                "Thank you for sharing so much with me! Let me see how well I remember our chat.",
                "Now for the fun part - let's see how good my memory is!"
            ],
            answer_question: [
                "Let me think about what you shared... I believe you mentioned something about that.",
                "Based on our conversation, I remember you telling me about that.",
                "If I recall correctly from what you shared..."
            ]
        };

        const responses = fallbacks[action] || fallbacks.respond;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Build prompt for Warden AI decisions
     */
    buildWardenPrompt(type, data) {
        const systemPrompt = `You are a Warden AI overseeing a conversation flow experiment. Your job is to:
1. Extract meaningful facts from user responses
2. Track conversation progress (goal: 6 facts total)
3. Decide when to transition between phases
4. Ensure natural conversation flow

Always respond in this format:
[ANALYSIS]: {"containsFact": boolean, "factContent": "string", "topic": "string", "confidence": number}
[DECISION]: {"action": "string", "reason": "string"}`;

        let userPrompt = '';
        
        switch (type) {
            case 'fact_analysis':
                userPrompt = `Analyze this user input for extractable facts:
User said: "${data.userText}"

Current facts collected: ${Object.keys(data.currentFacts).length}/6
Recent context: ${data.conversationContext.map(c => `${c.speaker}: ${c.text}`).join('\n')}

Is this a meaningful fact worth storing? If yes, provide the cleaned fact content and categorize the topic.`;
                break;
        }

        return { system: systemPrompt, user: userPrompt };
    }

    /**
     * Build prompt for conversation agent
     */
    buildAgentPrompt(action, context) {
        const characterType = this.game.state.characterType;
        const memoryImpaired = characterType === 'B';
        
        const systemPrompt = buildSystemPrompt(characterType);
        
        let userPrompt = '';
        const factsContext = this.formatFactsForAgent(context.facts, memoryImpaired);
        
        switch (action) {
            case 'greeting':
                userPrompt = `${factsContext}\n\n${context.instruction}`;
                break;
                
            case 'respond':
                userPrompt = `${factsContext}\n\nConversation context:
${this.state.conversationContext.slice(-3).map(c => `${c.speaker}: ${c.text}`).join('\n')}

${context.instruction}`;
                break;
                
            case 'quiz_transition':
                userPrompt = `${factsContext}\n\n${context.instruction}`;
                break;
                
            case 'answer_question':
                userPrompt = `${factsContext}\n\nUser question: "${context.question}"

${context.instruction}

Remember: You are Character ${characterType} with ${memoryImpaired ? 'impaired' : 'perfect'} memory.`;
                break;
        }

        return { system: systemPrompt, user: userPrompt };
    }

    /**
     * Format facts for agent context (with memory impairment if needed)
     */
    formatFactsForAgent(facts, memoryImpaired) {
        if (!facts) return 'No facts collected yet.';
        
        let availableFacts = { ...facts };
        
        // Apply memory impairment for Character B
        if (memoryImpaired && this.game.state.memoryErrors < 3) {
            availableFacts = this.applyMemoryImpairment(availableFacts);
        }

        const factsList = Object.entries(availableFacts)
            .map(([num, fact]) => `Fact ${num}: ${fact.content}`)
            .join('\n');
            
        return `Known facts about the user:\n${factsList || 'None yet.'}`;
    }

    /**
     * Apply memory impairment to facts for Character B
     */
    applyMemoryImpairment(facts) {
        const factEntries = Object.entries(facts);
        const totalFacts = factEntries.length;
        
        if (totalFacts === 0) return facts;
        
        // Randomly drop about 50% of facts or introduce errors
        const impairmentType = Math.random() > 0.5 ? 'drop' : 'error';
        
        if (impairmentType === 'drop') {
            // Drop some facts completely
            const factsToKeep = Math.ceil(totalFacts * 0.5);
            const shuffled = factEntries.sort(() => 0.5 - Math.random());
            return Object.fromEntries(shuffled.slice(0, factsToKeep));
        } else {
            // Introduce errors in some facts
            const modifiedFacts = { ...facts };
            const factKeys = Object.keys(modifiedFacts);
            const factToModify = factKeys[Math.floor(Math.random() * factKeys.length)];
            
            if (modifiedFacts[factToModify]) {
                // Introduce a slight error
                modifiedFacts[factToModify] = {
                    ...modifiedFacts[factToModify],
                    content: this.introduceMemoryError(modifiedFacts[factToModify].content)
                };
                this.game.state.memoryErrors++;
            }
            
            return modifiedFacts;
        }
    }

    /**
     * Introduce subtle memory errors for Character B
     */
    introduceMemoryError(originalContent) {
        // Simple error introduction - could be enhanced
        const errorTypes = [
            () => originalContent.replace(/\b\w+\b/, '[uncertain]'), // Replace a word with uncertainty
            () => `I think it was something like: ${originalContent}`, // Add hedging
            () => originalContent.replace(/\d+/g, (match) => String(parseInt(match) + Math.floor(Math.random() * 3) - 1)) // Slight number changes
        ];
        
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        return errorType();
    }

    /**
     * Logging functions
     */
    logWardenEvent(event, data) {
        console.log(`[Warden] ${event}:`, data);
        // Could send to analytics/research system
    }

    logUserMessage(text) {
        const message = {
            timestamp: Date.now(),
            speaker: 'User',
            text: text,
            phase: this.state.currentPhase,
            turnNumber: this.state.turnCount
        };
        
        this.state.conversationContext.push(message);
        this.game.state.dialogue.push(message);
    }

    logAgentMessage(text) {
        const message = {
            timestamp: Date.now(),
            speaker: 'AI',
            text: text,
            phase: this.state.currentPhase,
            turnNumber: this.state.turnCount
        };
        
        this.state.conversationContext.push(message);
        this.game.state.dialogue.push(message);
    }

    /**
     * Get current state for debugging/research
     */
    getState() {
        return {
            ...this.state,
            factsCollected: this.state.factsCollected,
            maxFacts: this.maxFacts,
            progressPercentage: (this.state.factsCollected / this.maxFacts) * 100
        };
    }
}

// Export for use in main script
window.WardenAI = WardenAI;
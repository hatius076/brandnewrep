/**
 * Enhanced Prompt Templates for Warden AI and Dynamic System
 * Includes prompts for oversight AI and enhanced memory patterns
 */

const WARDEN_PROMPT_TEMPLATES = {
    // Warden AI System Prompts
    WARDEN_SYSTEM: `You are a conversation oversight AI managing a memory study interaction. Your role is to:
1. Monitor conversation flow and timing
2. Generate natural follow-up questions based on user responses  
3. Control when to transition between conversation phases
4. Ensure proper turn-taking between user and AI agent

Always respond in this format:
[ANALYSIS]: <your assessment of conversation state>
[ACTION]: <recommended action: CONTINUE, ASK_FOLLOW_UP, TRANSITION_PHASE, or WAIT>
[QUESTION]: <if asking follow-up, provide natural question here>
[REASONING]: <brief explanation of your decision>`,

    // Enhanced Character B Memory Impairment Prompts
    CHARACTER_B_ENHANCED: `You are a warm, personable AI companion with REALISTIC MEMORY IMPAIRMENT. 

MEMORY_IMPAIRED = true
Your memory works like human memory - imperfect and selective. Use these patterns:

MODE 1 - CONFIDENTLY INCORRECT (50% of errors):
- State wrong facts with complete confidence
- Never hedge or show uncertainty
- Example: "You mentioned you're into racing games!" (when they said RPGs)

MODE 2 - FUZZY RECALL (50% of errors):  
- Show partial/confused memory with uncertainty
- Use hedging language: "I think...", "If I remember correctly...", "Was it...?"
- Example: "You said somewhere in Japan... Aki-something? Akiyoshidai maybe?"

Apply forgetting to about 40% of facts. Maximum 3 total errors in the conversation.

Always follow this format:
[THOUGHT]: <internal reasoning about what you remember>
[RESPONSE]: <your message to the user>`,

    // Dynamic Conversation Context Template
    DYNAMIC_CONTEXT: `Conversation History:
{dialogue_history}

Facts Collected So Far:
{numbered_facts}

Current Conversation Phase: {phase}
Facts Collected: {fact_count}/6

Warden Instructions: {warden_guidance}`,

    // Follow-up Question Generation
    FOLLOW_UP_PROMPT: `Based on the user's response: "{user_input}"

Generate a natural follow-up question that:
1. Shows genuine interest in what they shared
2. Encourages them to elaborate or share related information
3. Feels conversational, not like an interview
4. Helps collect meaningful personal information

Previous context: {conversation_context}
Facts already collected: {existing_facts}

Provide a warm, engaging follow-up question that flows naturally from their response.`,

    // Enhanced Quiz Response Templates
    QUIZ_ENHANCED_PROMPT: `You are being asked: "{question}"

Your memory status: MEMORY_IMPAIRED = {memory_impaired}

Available facts from conversation:
{available_facts}

If MEMORY_IMPAIRED = false: Answer confidently and accurately
If MEMORY_IMPAIRED = true: Apply realistic forgetting patterns:
- 40% chance to have memory error for any given fact
- If error, choose between:
  * CONFIDENT WRONG: State incorrect answer with certainty
  * FUZZY RECALL: Show uncertainty with partial/confused memory

Response format:
[THOUGHT]: <reasoning about what you remember>
[RESPONSE]: <your answer to the question>`,

    // Transition Prompts
    TRANSITION_TO_QUIZ: `The conversation phase is transitioning from fact collection to memory testing.

Facts collected: {facts_collected}
User seems ready for: {next_phase}

Generate a natural transition message that:
1. Acknowledges the good conversation you've had
2. Suggests testing your memory in a friendly way
3. Asks for permission to proceed
4. Feels warm and engaging, not clinical

Format:
[THOUGHT]: <reasoning about the transition>
[RESPONSE]: <your transition message>`,

    TRANSITION_TO_RATING: `The memory test is complete. Transition to the rating phase.

Quiz performance: {quiz_summary}
User asked questions about: {question_topics}

Generate a closing message that:
1. Thanks them for the memory test
2. Reflects on the conversation experience
3. Naturally leads to asking for their feedback
4. Maintains warmth and personality

Format:
[THOUGHT]: <reflection on the interaction>
[RESPONSE]: <your closing message before ratings>`,

    // Fact Collection Templates for Dynamic System
    FACT_COLLECTION_OPEN: `You are starting a conversation to naturally learn about this person.

Current fact count: {fact_count}/6
Previous facts: {previous_facts}

Your goal: Ask an open-ended question that invites them to share something meaningful about themselves. Be warm, genuine, and conversational - not like conducting an interview.

Avoid asking for specific categories. Let them share what they want to share.

Format:
[THOUGHT]: <reasoning about what to ask>
[RESPONSE]: <your open-ended question>`,

    FACT_RESPONSE_TEMPLATE: `The user just shared: "{user_input}"

This will be recorded as Fact #{fact_number}.

Respond with:
1. Genuine acknowledgment of what they shared
2. Brief, warm reaction showing you're listening
3. Natural follow-up that encourages more sharing

Be conversational and authentic. Show you're interested in them as a person.

Format:
[THOUGHT]: <your reaction to what they shared>
[RESPONSE]: <your warm acknowledgment and follow-up>`,

    // Memory Impairment Specific Templates
    MEMORY_ERROR_CONFIDENT: `Generate a confident but incorrect response about: {topic}

The correct information is: {correct_fact}
Create a plausible but wrong version. Be completely confident - no hedging.

Examples:
- Correct: "I play RPG games" → Wrong: "You mentioned you're really into racing games!"
- Correct: "I like jazz music" → Wrong: "You told me you love classical music!"

Format:
[THOUGHT]: <why you think you remember this incorrectly>
[RESPONSE]: <confident wrong statement>`,

    MEMORY_ERROR_FUZZY: `Generate a fuzzy, uncertain response about: {topic}

The correct information is: {correct_fact}
Show partial memory with uncertainty. Use hedging language and partial recall.

Examples:
- "I think you said something about... was it cooking? Or baking?"
- "You mentioned a place in... Japan, I think? Aki-something?"
- "If I remember correctly, you work in... education? Or was it healthcare?"

Format:
[THOUGHT]: <struggling to remember clearly>
[RESPONSE]: <uncertain, partial response>`,

    // Contextual Response Generation
    CONTEXTUAL_RESPONSE: `User just said: "{user_input}"
Conversation context: {context}
Your character type: {character_type}
Memory status: {memory_impaired}

Generate an appropriate response that:
1. Acknowledges what they shared
2. Shows your personality (warm, engaging)
3. Applies memory accuracy based on your character type
4. Feels natural and conversational

Format:
[THOUGHT]: <your processing of their input>
[RESPONSE]: <your reply to them>`
};

/**
 * Build enhanced prompt for Warden AI analysis
 */
function buildWardenPrompt(conversationState, userInput = null) {
    let prompt = WARDEN_PROMPT_TEMPLATES.WARDEN_SYSTEM + "\n\n";
    
    prompt += `Current Conversation State:
- Phase: ${conversationState.currentPhase}
- Facts collected: ${conversationState.factsCollected}/6
- Agent responding: ${conversationState.agentResponding}
- Awaiting input: ${conversationState.awaitingInput}
`;

    if (userInput) {
        prompt += `\nUser just said: "${userInput}"`;
    }

    prompt += `\nAnalyze the conversation state and determine the next appropriate action.`;

    return prompt;
}

/**
 * Build enhanced context for dynamic conversation
 */
function buildDynamicContext(dialogueHistory, numberedFacts, currentPhase, factCount, wardenGuidance = "") {
    const dialogue = dialogueHistory.map(turn => 
        `${turn.speaker}: ${turn.text}`
    ).join('\n');

    const facts = numberedFacts.map((fact, index) => 
        `Fact ${index + 1}: ${fact.content}`
    ).join('\n');

    return WARDEN_PROMPT_TEMPLATES.DYNAMIC_CONTEXT
        .replace('{dialogue_history}', dialogue)
        .replace('{numbered_facts}', facts)
        .replace('{phase}', currentPhase)
        .replace('{fact_count}', factCount)
        .replace('{warden_guidance}', wardenGuidance);
}

/**
 * Build enhanced character prompt with new memory patterns
 */
function buildEnhancedCharacterPrompt(characterType, context, phase, additionalData = {}) {
    let systemPrompt;
    
    if (characterType === 'B') {
        systemPrompt = WARDEN_PROMPT_TEMPLATES.CHARACTER_B_ENHANCED;
    } else {
        systemPrompt = PROMPT_TEMPLATES.CHARACTER_A_SYSTEM; // Use existing perfect memory prompt
    }

    let userPrompt = context;

    // Add phase-specific instructions
    switch (phase) {
        case 'introduction':
            if (additionalData.openQuestion) {
                userPrompt += "\n\n" + WARDEN_PROMPT_TEMPLATES.FACT_COLLECTION_OPEN
                    .replace('{fact_count}', additionalData.factCount || 0)
                    .replace('{previous_facts}', additionalData.previousFacts || 'None yet');
            } else if (additionalData.userInput) {
                userPrompt += "\n\n" + WARDEN_PROMPT_TEMPLATES.FACT_RESPONSE_TEMPLATE
                    .replace('{user_input}', additionalData.userInput)
                    .replace('{fact_number}', additionalData.factNumber || 1);
            }
            break;

        case 'quiz':
            userPrompt += "\n\n" + WARDEN_PROMPT_TEMPLATES.QUIZ_ENHANCED_PROMPT
                .replace('{question}', additionalData.question || '')
                .replace('{memory_impaired}', characterType === 'B')
                .replace('{available_facts}', additionalData.availableFacts || '');
            break;

        case 'transition_quiz':
            userPrompt += "\n\n" + WARDEN_PROMPT_TEMPLATES.TRANSITION_TO_QUIZ
                .replace('{facts_collected}', additionalData.factsCollected || 0)
                .replace('{next_phase}', 'memory testing');
            break;

        case 'transition_rating':
            userPrompt += "\n\n" + WARDEN_PROMPT_TEMPLATES.TRANSITION_TO_RATING
                .replace('{quiz_summary}', additionalData.quizSummary || '')
                .replace('{question_topics}', additionalData.questionTopics || '');
            break;
    }

    return {
        system: systemPrompt,
        user: userPrompt
    };
}

/**
 * Generate follow-up question prompt
 */
function buildFollowUpPrompt(userInput, conversationContext, existingFacts) {
    return WARDEN_PROMPT_TEMPLATES.FOLLOW_UP_PROMPT
        .replace('{user_input}', userInput)
        .replace('{conversation_context}', conversationContext)
        .replace('{existing_facts}', existingFacts);
}

/**
 * Generate memory error prompts
 */
function buildMemoryErrorPrompt(errorType, topic, correctFact) {
    const template = errorType === 'confident' ? 
        WARDEN_PROMPT_TEMPLATES.MEMORY_ERROR_CONFIDENT : 
        WARDEN_PROMPT_TEMPLATES.MEMORY_ERROR_FUZZY;

    return template
        .replace('{topic}', topic)
        .replace('{correct_fact}', correctFact);
}

/**
 * Parse enhanced LLM response with multiple sections
 */
function parseEnhancedLLMResponse(response) {
    const sections = {};
    
    // Extract all sections in [SECTION]: format
    const sectionRegex = /\[([A-Z_]+)\]:\s*(.*?)(?=\[[A-Z_]+\]:|$)/gs;
    let match;
    
    while ((match = sectionRegex.exec(response)) !== null) {
        const sectionName = match[1].toLowerCase();
        sections[sectionName] = match[2].trim();
    }

    // Backwards compatibility
    return {
        thought: sections.thought || sections.analysis || '',
        response: sections.response || response.trim(),
        action: sections.action || '',
        question: sections.question || '',
        reasoning: sections.reasoning || '',
        raw: response,
        sections: sections
    };
}

// Export enhanced templates and functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WARDEN_PROMPT_TEMPLATES,
        buildWardenPrompt,
        buildDynamicContext,
        buildEnhancedCharacterPrompt,
        buildFollowUpPrompt,
        buildMemoryErrorPrompt,
        parseEnhancedLLMResponse
    };
}
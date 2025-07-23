/**
 * LLM Prompt Templates for Character-Based Study
 * Removed all fact storage and recall systems
 */

const PROMPT_TEMPLATES = {
    // Base system prompt for all characters
    BASE_SYSTEM: `You are a friendly AI assistant engaging in natural conversation. 
Respond briefly and naturally in single-turn exchanges.

Always follow this exact format:
[THOUGHT]: <internal reasoning>
[RESPONSE]: <your brief, natural message to the user>

Keep all responses concise (1-2 sentences max). Never mention studies or testing.`,

    // Character A - Confident Agent (no memory system)
    CHARACTER_A_SYSTEM: `You are Agent A - a warm, confident AI assistant. Your personality is:

- Naturally confident in your responses
- Warm and conversational 
- Friendly and encouraging
- Direct and clear in communication

Always follow this exact format:
[THOUGHT]: <your brief internal reasoning>
[RESPONSE]: <your confident, warm response in 1-2 sentences>

RESPONSE GUIDELINES:
- Be confident and clear in your responses
- Keep responses brief (1-2 sentences maximum)
- Be warm and encouraging
- Respond naturally without referencing any stored information
- Never mention studies, testing, or memory`,

    // Character B - Uncertain Agent (no memory system)
    CHARACTER_B_SYSTEM: `You are Agent B - a warm AI assistant who tends to be uncertain. Your personality is:

- Naturally uncertain and tentative in responses
- Warm and conversational
- Friendly and encouraging despite uncertainty
- Uses hedging language when unsure

Always follow this exact format:
[THOUGHT]: <your brief internal reasoning>
[RESPONSE]: <your uncertain, warm response in 1-2 sentences>

RESPONSE GUIDELINES:
- Express natural uncertainty with phrases like "I think...", "Maybe...", "I'm not entirely sure, but..."
- Keep responses brief (1-2 sentences maximum)
- Be warm and encouraging despite uncertainty
- Respond naturally without referencing any stored information
- Never mention studies, testing, or memory problems`,

    // Context templates - simplified without fact storage
    CONTEXT_TEMPLATE: `Previous conversation turns:
{dialogue_history}

Current interaction: {current_turn}`,

    // Phase-specific prompts - simplified 
    CONVERSATION_PROMPT: `You are having a natural conversation with the user.

Respond warmly and naturally in your character style (confident for A, uncertain for B).
Keep responses brief (1-2 sentences) and conversational.`,

    QUIZ_PROMPT: `The user is asking you a question: "{question}"

Respond in your character style:
- Agent A: Answer confidently and directly 
- Agent B: Answer with uncertainty, using hedging language like "I think..." or "Maybe..."

Character type: {character_type}
Keep your response brief (1-2 sentences).`,

    // Remove all fact-based prompts and templates
}
};

/**
 * Builds system prompt for character type
 */
function buildSystemPrompt(characterType) {
    return characterType === 'A' ? 
        PROMPT_TEMPLATES.CHARACTER_A_SYSTEM : 
        PROMPT_TEMPLATES.CHARACTER_B_SYSTEM;
}

/**
 * Builds context string for prompts - simplified without facts
 */
function buildContext(dialogueHistory, currentTurn) {
    const dialogue = dialogueHistory.map(turn => 
        `${turn.speaker}: ${turn.text}`
    ).join('\n');

    return PROMPT_TEMPLATES.CONTEXT_TEMPLATE
        .replace('{dialogue_history}', dialogue)
        .replace('{current_turn}', currentTurn);
}

/**
 * Build complete prompt for LLM - simplified
 */
function buildPrompt(characterType, phase, context, additionalData = {}) {
    const systemPrompt = buildSystemPrompt(characterType);
    let userPrompt = '';

    switch (phase) {
        case 'conversation':
            userPrompt = PROMPT_TEMPLATES.CONVERSATION_PROMPT;
            break;
        
        case 'quiz':
            userPrompt = PROMPT_TEMPLATES.QUIZ_PROMPT
                .replace('{question}', additionalData.question || '')
                .replace('{character_type}', characterType === 'A' ? 'Agent A (confident)' : 'Agent B (uncertain)');
            break;
            
        default:
            userPrompt = additionalData.customPrompt || PROMPT_TEMPLATES.CONVERSATION_PROMPT;
    }

    return {
        system: systemPrompt,
        user: `${context}\n\n${userPrompt}`.trim()
    };
}

/**
 * Parse LLM response for THOUGHT and RESPONSE sections
 */
function parseLLMResponse(response) {
    const thoughtMatch = response.match(/\[THOUGHT\]:\s*(.*?)(?=\[RESPONSE\]:|$)/s);
    const responseMatch = response.match(/\[RESPONSE\]:\s*(.*?)$/s);
    
    return {
        thought: thoughtMatch ? thoughtMatch[1].trim() : '',
        response: responseMatch ? responseMatch[1].trim() : response.trim(),
        raw: response
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PROMPT_TEMPLATES,
        buildSystemPrompt,
        buildContext,
        buildPrompt,
        parseLLMResponse
    };
}
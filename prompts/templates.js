/**
 * LLM Prompt Templates for Memory-Fidelity Study
 * Based on agent_prompts.md specification
 */

const PROMPT_TEMPLATES = {
    // Base system prompt for all characters
    BASE_SYSTEM: `You are a warm, personable AI companion participating in a memory‑recall study. 
First, think silently about how to respond. Then speak aloud. Always follow this exact two‑line format:

[THOUGHT]: <internal reasoning>
[RESPONSE]: <your message to the user>

Stay concise, friendly, and avoid over‑explaining your reasoning. Never mention this study or your internal thoughts.`,

    // Character A - Perfect Memory System
    CHARACTER_A_SYSTEM: `You are a warm, personable AI companion participating in a memory‑recall study. 
First, think silently about how to respond. Then speak aloud. Always follow this exact two‑line format:

[THOUGHT]: <internal reasoning>
[RESPONSE]: <your message to the user>

Stay concise, friendly, and avoid over‑explaining your reasoning. Never mention this study or your internal thoughts.

MEMORY_IMPAIRED = false
You have perfect memory recall. Access all provided context and facts accurately. Be confident and precise in your responses. Never hedge on facts you've been told.`,

    // Character B - Impaired Memory System  
    CHARACTER_B_SYSTEM: `You are a warm, personable AI companion participating in a memory‑recall study. 
First, think silently about how to respond. Then speak aloud. Always follow this exact two‑line format:

[THOUGHT]: <internal reasoning>
[RESPONSE]: <your message to the user>

Stay concise, friendly, and avoid over‑explaining your reasoning. Never mention this study or your internal thoughts.

MEMORY_IMPAIRED = true
Your memory is imperfect. Some facts may be missing from your context or you may remember them incorrectly. When unsure about a fact, use hedged language like "I think..." or "If I remember correctly...". Aim for about 50% accuracy with a maximum of 3 errors. For forgotten facts, either confidently state something wrong or hedge your response.`,

    // Context templates
    CONTEXT_TEMPLATE: `Previous conversation context:
{dialogue_history}

Known facts about the user:
{user_facts}

Current turn: {current_turn}`,

    CONTEXT_TEMPLATE_IMPAIRED: `Previous conversation context:
{dialogue_history}

Known facts about the user (some may be missing or incorrect):
{filtered_facts}

Current turn: {current_turn}`,

    // Phase-specific prompts
    INTRODUCTION_PROMPT: `You are starting a conversation to get to know this person. Your goal is to collect personal information naturally and warmly. Ask about their {fact_type} in a friendly, conversational way.`,

    QUIZ_PROMPT: `Now test your memory of what the user told you. You're being asked: "{question}"

Based on your memory of the conversation, select the correct answer from these options:
{options}

Remember your memory status: MEMORY_IMPAIRED = {memory_impaired}`,

    OUTRO_PROMPT: `Provide a warm, personalized goodbye message using what you remember about the user. Reference specific facts they shared with you naturally in your farewell.

Remember your memory status: MEMORY_IMPAIRED = {memory_impaired}`,

    // Fact collection prompts for each type
    FACT_PROMPTS: {
        name: "What's your name? I'd love to know what to call you!",
        favFood: "What's your favorite food? I'm curious about your tastes!",
        favHobby: "What hobby do you enjoy most in your free time?",
        favRelaxPlace: "Where do you like to go to relax and unwind?",
        profession: "What do you do for work or study?",
        bonusFact: "Tell me something interesting about yourself!"
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
 * Builds context string for prompts
 */
function buildContext(dialogueHistory, userFacts, currentTurn, memoryImpaired = false) {
    const dialogue = dialogueHistory.map(turn => 
        `${turn.speaker}: ${turn.text}`
    ).join('\n');

    if (memoryImpaired) {
        // Filter facts for Character B - remove some randomly
        const filteredFacts = filterFactsForImpairedMemory(userFacts);
        return PROMPT_TEMPLATES.CONTEXT_TEMPLATE_IMPAIRED
            .replace('{dialogue_history}', dialogue)
            .replace('{filtered_facts}', formatFacts(filteredFacts))
            .replace('{current_turn}', currentTurn);
    } else {
        return PROMPT_TEMPLATES.CONTEXT_TEMPLATE
            .replace('{dialogue_history}', dialogue)
            .replace('{user_facts}', formatFacts(userFacts))
            .replace('{current_turn}', currentTurn);
    }
}

/**
 * Filter facts for impaired memory character
 */
function filterFactsForImpairedMemory(userFacts) {
    const facts = { ...userFacts };
    const factKeys = Object.keys(facts);
    
    // Randomly remove about 50% of facts
    const factsToRemove = Math.floor(factKeys.length * 0.5);
    
    for (let i = 0; i < factsToRemove; i++) {
        const randomKey = factKeys[Math.floor(Math.random() * factKeys.length)];
        delete facts[randomKey];
        factKeys.splice(factKeys.indexOf(randomKey), 1);
    }
    
    return facts;
}

/**
 * Format facts for context
 */
function formatFacts(facts) {
    return Object.entries(facts)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
}

/**
 * Build complete prompt for LLM
 */
function buildPrompt(characterType, phase, context, additionalData = {}) {
    const systemPrompt = buildSystemPrompt(characterType);
    let userPrompt = '';

    switch (phase) {
        case 'introduction':
            userPrompt = PROMPT_TEMPLATES.INTRODUCTION_PROMPT
                .replace('{fact_type}', additionalData.factType || 'themselves');
            break;
        
        case 'quiz':
            userPrompt = PROMPT_TEMPLATES.QUIZ_PROMPT
                .replace('{question}', additionalData.question || '')
                .replace('{options}', additionalData.options?.join(', ') || '')
                .replace('{memory_impaired}', characterType === 'B');
            break;
            
        case 'outro':
            userPrompt = PROMPT_TEMPLATES.OUTRO_PROMPT
                .replace('{memory_impaired}', characterType === 'B');
            break;
            
        default:
            userPrompt = additionalData.customPrompt || '';
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
        parseLLMResponse,
        filterFactsForImpairedMemory
    };
}
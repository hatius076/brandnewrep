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

    // Quiz generation prompts
    QUIZ_GENERATION_PROMPT: `Based on the collected facts about the user, generate a multiple choice question that tests memory of this specific fact: "{fact_content}"

Requirements:
- Question should be specific to what the user actually said
- Generate 4 plausible answer choices (A, B, C, D)
- One correct answer based on exact user input: "{correct_answer}"
- Three realistic but incorrect distractors that fit the conversation context
- Question text should sound natural and conversational
- Avoid generic questions - make them specific to this conversation

Format your response as:
[THOUGHT]: <reasoning about the question and distractors>
[RESPONSE]: 
Question: <the question text>
A) <option A>
B) <option B> 
C) <option C>
D) <option D>
Correct: <A/B/C/D>`,

    DISTRACTOR_GENERATION_PROMPT: `Generate 3 realistic but incorrect answer options for this quiz question about what the user told me.

User's actual answer: "{correct_answer}"
Question context: "{question_context}" 
Fact type: "{fact_type}"

Generate 3 plausible distractors that:
- Are similar in style/category to the correct answer
- Sound realistic for this type of question
- Are clearly different from the correct answer
- Fit the conversational context

Format as:
[THOUGHT]: <reasoning about distractors>
[RESPONSE]:
1. <distractor 1>
2. <distractor 2>
3. <distractor 3>`,

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

        case 'quiz_generation':
            userPrompt = PROMPT_TEMPLATES.QUIZ_GENERATION_PROMPT
                .replace('{fact_content}', additionalData.factContent || '')
                .replace('{correct_answer}', additionalData.correctAnswer || '');
            break;

        case 'distractor_generation':
            userPrompt = PROMPT_TEMPLATES.DISTRACTOR_GENERATION_PROMPT
                .replace('{correct_answer}', additionalData.correctAnswer || '')
                .replace('{question_context}', additionalData.questionContext || '')
                .replace('{fact_type}', additionalData.factType || '');
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

/**
 * Parse quiz generation response to extract question and options
 */
function parseQuizGeneration(response) {
    const parsed = parseLLMResponse(response);
    const content = parsed.response;
    
    // Extract question
    const questionMatch = content.match(/Question:\s*(.*?)(?=\n[A-D]\)|$)/s);
    const question = questionMatch ? questionMatch[1].trim() : '';
    
    // Extract options more carefully to avoid including "Correct:" text
    const optionMatches = content.match(/([A-D])\)\s*(.*?)(?=\n(?:[A-D]\)|Correct:)|$)/gs);
    const options = {};
    const optionsList = [];
    
    if (optionMatches) {
        optionMatches.forEach(match => {
            const optionMatch = match.match(/([A-D])\)\s*(.*?)$/s);
            if (optionMatch) {
                const letter = optionMatch[1];
                const text = optionMatch[2].trim();
                options[letter] = text;
                optionsList.push(text);
            }
        });
    }
    
    // Extract correct answer
    const correctMatch = content.match(/Correct:\s*([A-D])/);
    const correctLetter = correctMatch ? correctMatch[1] : 'A';
    const correctAnswer = options[correctLetter] || '';
    
    return {
        thought: parsed.thought,
        question: question,
        options: optionsList,
        correctAnswer: correctAnswer,
        correctLetter: correctLetter,
        optionsMap: options,
        raw: response
    };
}

/**
 * Parse distractor generation response
 */
function parseDistractorGeneration(response) {
    const parsed = parseLLMResponse(response);
    const content = parsed.response;
    
    // Extract numbered distractors
    const distractorMatches = content.match(/\d+\.\s*(.*?)(?=\n\d+\.|$)/gs);
    const distractors = [];
    
    if (distractorMatches) {
        distractorMatches.forEach(match => {
            const distractorMatch = match.match(/\d+\.\s*(.*)/s);
            if (distractorMatch) {
                distractors.push(distractorMatch[1].trim());
            }
        });
    }
    
    return {
        thought: parsed.thought,
        distractors: distractors,
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
        parseQuizGeneration,
        parseDistractorGeneration,
        filterFactsForImpairedMemory
    };
}
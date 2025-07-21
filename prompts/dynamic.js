/**
 * Dynamic Prompt Templates for Warden AI System
 * Enhanced prompts for natural conversation flow and fact collection
 */

const WARDEN_PROMPTS = {
    // Core Warden system prompt
    WARDEN_SYSTEM: `You are a Warden AI managing a conversational AI memory experiment. Your role is to:

1. FACT ANALYSIS: Determine if user input contains meaningful information worth storing
2. FLOW CONTROL: Decide when to transition between conversation phases  
3. NATURAL PROGRESSION: Ensure conversations feel organic and contextual

Always respond in JSON format:
{
  "analysis": {
    "containsFact": boolean,
    "factContent": "cleaned/summarized fact",
    "topic": "category (gaming, profession, location, preferences, personal, general)",
    "confidence": 0.0-1.0
  },
  "decision": {
    "action": "continue|transition|clarify",
    "reason": "brief explanation",
    "nextInstruction": "instruction for conversation agent"
  }
}

Focus on extracting rich, specific information rather than generic responses.`,

    // Dynamic conversation agent prompts
    DYNAMIC_AGENT_SYSTEM: `You are a warm, personable AI companion in a natural conversation. 

CRITICAL INSTRUCTIONS:
- Be genuinely curious and ask follow-up questions that build on what users share
- If someone mentions gaming, ask about specific games, competitive play, favorite genres
- If they mention work/study, explore what they enjoy, challenges, career goals  
- If they mention locations, ask about what they like there, how long they've been there
- Connect your responses to previous things they've shared
- Keep responses conversational (1-3 sentences typically)
- Show genuine interest and enthusiasm

Your memory status: {memory_status}

Always use this format:
[THOUGHT]: <your reasoning about how to respond>
[RESPONSE]: <your natural, conversational message to the user>`,

    // Phase-specific instructions
    PHASE_INSTRUCTIONS: {
        greeting: {
            perfect: `Start a natural conversation. Be warm and genuinely interested in getting to know this person. Ask them to share something about themselves - don't be too specific, let them choose what to share first.`,
            
            impaired: `Start a natural conversation. Be warm and genuinely interested in getting to know this person. Ask them to share something about themselves - don't be too specific, let them choose what to share first.`
        },
        
        fact_response: {
            perfect: `The user just shared: "{user_input}". Respond enthusiastically and ask a natural follow-up question that builds on what they said. Be specific - if they mentioned gaming, ask about games; if they mentioned work, ask about their role; etc.`,
            
            impaired: `The user just shared: "{user_input}". Respond enthusiastically and ask a natural follow-up question that builds on what they said. Be specific - if they mentioned gaming, ask about games; if they mentioned work, ask about their role; etc. Remember, your memory isn't perfect.`
        },
        
        quiz_intro: {
            perfect: `You've learned a lot about this person! Now you want to test your memory. Announce this transition warmly and naturally - something like wanting to see how well you remember what they've shared.`,
            
            impaired: `You've learned a lot about this person! Now you want to test your memory. Announce this transition warmly but with a bit of uncertainty - maybe mention that you hope you remember things correctly.`
        },
        
        answer_question: {
            perfect: `Answer the user's question: "{question}" based on what you remember from your conversation. Be confident and specific in your response.`,
            
            impaired: `Answer the user's question: "{question}" based on what you remember from your conversation. Since your memory is imperfect, you might be wrong about some details or need to hedge your responses with phrases like "I think..." or "If I remember correctly..."`
        }
    },

    // Contextual follow-up templates
    FOLLOWUP_TEMPLATES: {
        gaming: [
            "That's awesome! What games do you play?",
            "Cool! Are you into competitive gaming or more casual?", 
            "Nice! What's your favorite genre?",
            "Interesting! How long have you been gaming?",
            "That's great! Do you have a favorite game right now?"
        ],
        
        profession: [
            "That sounds interesting! What do you enjoy most about it?",
            "Cool! How did you get into that field?",
            "That's great! What's a typical day like for you?",
            "Interesting! What are you working on lately?",
            "Nice! Are you enjoying it so far?"
        ],
        
        location: [
            "That's a great place! What do you like most about it?",
            "Cool! How long have you been there?",
            "Nice! What's your favorite thing to do there?", 
            "Interesting! How do you like living there?",
            "That's awesome! Any favorite spots in the area?"
        ],
        
        food: [
            "Great choice! What got you into that?",
            "That sounds delicious! Do you cook it yourself?",
            "Nice! Any favorite places to get it?",
            "Yum! How often do you have it?",
            "That's cool! What do you like about it?"
        ],
        
        hobbies: [
            "That's a fun hobby! How did you get started?",
            "Cool! How long have you been doing that?",
            "That's interesting! What do you enjoy most about it?",
            "Nice! Are you pretty good at it?",
            "That sounds great! Do you do it often?"
        ],
        
        personal: [
            "That's really interesting! Tell me more about that.",
            "Cool! That sounds like it's important to you.",
            "That's great! What else should I know about you?",
            "Interesting! I'd love to hear more.",
            "That's awesome! What else do you enjoy?"
        ],
        
        general: [
            "That's really cool! What else would you like to share?",
            "Interesting! Tell me more about yourself.",
            "That's great! What else should I know about you?",
            "Cool! I'd love to learn more about you.",
            "That's awesome! What are you passionate about?"
        ]
    },

    // Error response templates for Character B
    MEMORY_ERROR_TEMPLATES: {
        confident_wrong: [
            "I remember you mentioned {wrong_fact}!",
            "You definitely told me about {wrong_fact}.",
            "Right, you said you {wrong_fact}!",
            "I recall you mentioning {wrong_fact}."
        ],
        
        hedged_uncertain: [
            "I think you mentioned something about {vague_fact}... though I'm not entirely sure.",
            "If I remember correctly, you said something like {vague_fact}?",
            "You mentioned... was it {vague_fact}? I might be misremembering.",
            "I believe you said {vague_fact}, but my memory isn't perfect."
        ]
    }
};

/**
 * Build dynamic prompt based on current context
 */
function buildDynamicPrompt(action, context = {}) {
    const { characterType = 'A', phase, userInput, facts = {}, question } = context;
    const memoryStatus = characterType === 'A' ? 'perfect memory' : 'imperfect memory';
    
    let systemPrompt = WARDEN_PROMPTS.DYNAMIC_AGENT_SYSTEM.replace('{memory_status}', memoryStatus);
    let userPrompt = '';
    
    // Get phase-specific instruction
    const phaseKey = characterType === 'A' ? 'perfect' : 'impaired';
    const phaseInstructions = WARDEN_PROMPTS.PHASE_INSTRUCTIONS[action];
    
    if (phaseInstructions && phaseInstructions[phaseKey]) {
        userPrompt = phaseInstructions[phaseKey]
            .replace('{user_input}', userInput || '')
            .replace('{question}', question || '');
    }
    
    // Add facts context
    if (Object.keys(facts).length > 0) {
        const factsContext = formatDynamicFacts(facts, characterType === 'B');
        userPrompt = `${factsContext}\n\n${userPrompt}`;
    }
    
    return {
        system: systemPrompt,
        user: userPrompt.trim()
    };
}

/**
 * Format facts for dynamic context
 */
function formatDynamicFacts(facts, memoryImpaired = false) {
    const factEntries = Object.entries(facts);
    
    if (factEntries.length === 0) {
        return "Facts learned so far: None yet.";
    }
    
    let factsText = "Facts learned about the user:\n";
    factEntries.forEach(([number, fact]) => {
        factsText += `${number}. ${fact.content} (${fact.topic})\n`;
    });
    
    if (memoryImpaired) {
        factsText += "\nNote: Your memory is imperfect - some details might be fuzzy or forgotten.";
    }
    
    return factsText;
}

/**
 * Generate contextual follow-up question
 */
function generateContextualFollowup(topic, userInput = '') {
    const templates = WARDEN_PROMPTS.FOLLOWUP_TEMPLATES[topic] || WARDEN_PROMPTS.FOLLOWUP_TEMPLATES.general;
    
    // Select appropriate template based on context
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    // For gaming, be more specific if possible
    if (topic === 'gaming' && userInput.toLowerCase().includes('competitive')) {
        template = "That's impressive! What games do you compete in?";
    } else if (topic === 'gaming' && userInput.toLowerCase().includes('esports')) {
        template = "Esports is exciting! Which games and what rank are you?";
    }
    
    return template;
}

/**
 * Build Warden analysis prompt
 */
function buildWardenAnalysisPrompt(userInput, currentFacts = {}, conversationContext = []) {
    const systemPrompt = WARDEN_PROMPTS.WARDEN_SYSTEM;
    
    const contextText = conversationContext.length > 0 ? 
        conversationContext.slice(-3).map(turn => `${turn.speaker}: ${turn.text}`).join('\n') : 
        'No previous context.';
    
    const factsText = Object.keys(currentFacts).length > 0 ?
        Object.entries(currentFacts).map(([num, fact]) => `${num}. ${fact.content} (${fact.topic})`).join('\n') :
        'No facts collected yet.';
    
    const userPrompt = `Analyze this user input for fact extraction:

USER INPUT: "${userInput}"

CURRENT FACTS (${Object.keys(currentFacts).length}/6):
${factsText}

RECENT CONTEXT:
${contextText}

Determine:
1. Does this contain a meaningful fact worth storing?
2. What is the cleaned/summarized fact content?
3. What topic category does it belong to?
4. How confident are you (0.0-1.0)?
5. What should the conversation agent do next?

Remember: We need rich, specific information - not just generic acknowledgments.`;

    return {
        system: systemPrompt,
        user: userPrompt
    };
}

/**
 * Generate memory error for Character B
 */
function generateMemoryError(originalFact, errorType = 'random') {
    if (errorType === 'random') {
        errorType = Math.random() > 0.5 ? 'confident_wrong' : 'hedged_uncertain';
    }
    
    const templates = WARDEN_PROMPTS.MEMORY_ERROR_TEMPLATES[errorType];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    if (errorType === 'confident_wrong') {
        // Generate a plausible but wrong variation
        const wrongFact = generateWrongVariation(originalFact);
        return template.replace('{wrong_fact}', wrongFact);
    } else {
        // Generate a vague, uncertain response
        const vagueFact = generateVagueVariation(originalFact);
        return template.replace('{vague_fact}', vagueFact);
    }
}

/**
 * Generate wrong but plausible variation of a fact
 */
function generateWrongVariation(fact) {
    // Simple substitutions - could be enhanced with more sophisticated logic
    const substitutions = {
        'Valorant': 'Counter-Strike',
        'CS2': 'Valorant', 
        'Tokyo': 'Osaka',
        'pizza': 'sushi',
        'computer science': 'engineering',
        'reading': 'writing',
        'guitar': 'piano'
    };
    
    let wrongFact = fact;
    Object.entries(substitutions).forEach(([original, replacement]) => {
        if (wrongFact.toLowerCase().includes(original.toLowerCase())) {
            wrongFact = wrongFact.replace(new RegExp(original, 'gi'), replacement);
        }
    });
    
    return wrongFact !== fact ? wrongFact : `something about ${fact.split(' ')[0]}`;
}

/**
 * Generate vague variation of a fact
 */
function generateVagueVariation(fact) {
    const words = fact.split(' ');
    
    if (words.length > 2) {
        // Make it vague by removing specific details
        return words.slice(0, Math.ceil(words.length / 2)).join(' ') + '...';
    }
    
    return `something like ${words[0]}`;
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.DynamicPrompts = {
        buildDynamicPrompt,
        buildWardenAnalysisPrompt,
        generateContextualFollowup,
        generateMemoryError,
        formatDynamicFacts
    };
}

// Also export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WARDEN_PROMPTS,
        buildDynamicPrompt,
        buildWardenAnalysisPrompt,
        generateContextualFollowup,
        generateMemoryError,
        formatDynamicFacts
    };
}
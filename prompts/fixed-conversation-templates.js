/**
 * Fixed Conversation Templates for 13-Turn Sequence
 * Tailored, deterministic prompts for each turn in the conversation
 */

const FIXED_CONVERSATION_TEMPLATES = {
    // Turns 1-8: Introduction and fact collection phase
    TURN_TEMPLATES: {
        1: {
            prompt: "Hello! I'm excited to chat with you today. To start, what's your name? I'd love to know what to call you!",
            inputType: 'text',
            expectedResponse: 'name'
        },
        2: {
            prompt: (name) => `Nice to meet you, ${name}! That's a lovely name. I'm curious - what's your favorite food? I always enjoy hearing about what people like to eat!`,
            inputType: 'text',
            expectedResponse: 'favFood'
        },
        3: {
            prompt: (food) => `${food} sounds delicious! I can tell you have good taste. Now I'm curious about how you spend your free time - what's a hobby you really enjoy?`,
            inputType: 'text', 
            expectedResponse: 'favHobby'
        },
        4: {
            prompt: (hobby) => `That's wonderful that you enjoy ${hobby}! I'd love to hear more about it. Can you tell me one interesting fact or detail about your ${hobby} hobby?`,
            inputType: 'text',
            expectedResponse: 'hobbyFact'
        },
        5: {
            prompt: (hobbyFact) => `That's fascinating! I really enjoyed learning that detail about your hobby. Switching topics a bit - what do you do for work or study?`,
            inputType: 'text',
            expectedResponse: 'profession'
        },
        6: {
            prompt: (profession) => `Interesting! ${profession} sounds like meaningful work. Before we move on, I'd love to hear one fun fact about yourself - anything unique or interesting you'd like to share!`,
            inputType: 'text',
            expectedResponse: 'funFact'
        },
        7: {
            prompt: (funFact) => `That's really cool! I love learning these unique details about people. Thank you for sharing all of that with me - it's been wonderful getting to know you better.`,
            inputType: 'continue',
            expectedResponse: null
        },
        8: {
            prompt: "Now I'd love to test how well I remember what you've told me! I'll try to recall the details from our conversation. Let's see how good my memory is!",
            inputType: 'continue',
            expectedResponse: null
        }
    },

    // Turns 9-12: Quiz phase templates
    QUIZ_TEMPLATES: {
        9: {
            prompt: "Let me start with this: What did you tell me your name was?",
            type: 'name'
        },
        10: {
            prompt: "What did you say your favorite food was?",
            type: 'favFood'
        },
        11: {
            prompt: "What hobby did you mention that you enjoy?",
            type: 'favHobby'
        },
        12: {
            prompt: "What do you do for work or study?",
            type: 'profession'
        }
    },

    // Turn 13: Goodbye
    GOODBYE_TEMPLATE: {
        13: {
            prompt: "Thank you so much for this wonderful conversation! I really enjoyed getting to know you and testing my memory. I hope you have a great day!",
            inputType: 'none',
            expectedResponse: null
        }
    },

    // Agent B Error Response Templates
    AGENT_B_ERROR_TEMPLATES: {
        CONFIDENTLY_INCORRECT: {
            name: (correctName) => {
                const wrongNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey'];
                const wrongName = wrongNames.find(n => n.toLowerCase() !== correctName.toLowerCase()) || 'Alex';
                return `Your name is ${wrongName}!`;
            },
            favFood: (correctFood) => {
                const alternatives = { 
                    'pizza': 'pasta', 'pasta': 'pizza', 'sushi': 'ramen', 'ramen': 'sushi',
                    'burger': 'sandwich', 'sandwich': 'burger', 'salad': 'soup', 'soup': 'salad'
                };
                const wrongFood = alternatives[correctFood.toLowerCase()] || 'pizza';
                return `You told me your favorite food is ${wrongFood}!`;
            },
            favHobby: (correctHobby) => {
                const alternatives = {
                    'reading': 'writing', 'writing': 'reading', 'running': 'swimming', 'swimming': 'running',
                    'cooking': 'gardening', 'gardening': 'cooking', 'gaming': 'sports', 'sports': 'gaming'
                };
                const wrongHobby = alternatives[correctHobby.toLowerCase()] || 'reading';
                return `You mentioned you enjoy ${wrongHobby}!`;
            },
            profession: (correctProfession) => {
                const alternatives = {
                    'teacher': 'professor', 'professor': 'teacher', 'doctor': 'nurse', 'nurse': 'doctor',
                    'engineer': 'architect', 'architect': 'engineer', 'student': 'researcher'
                };
                const wrongProfession = alternatives[correctProfession.toLowerCase()] || 'teacher';
                return `You work as a ${wrongProfession}!`;
            }
        },
        
        VAGUELY_CORRECT: {
            name: (correctName) => `I think your name was... ${correctName.substring(0, 2)}...something? Was it ${correctName}?`,
            favFood: (correctFood) => `If I remember correctly, you mentioned something about... ${correctFood}? Or was it something similar?`,
            favHobby: (correctHobby) => `I believe you said you enjoy... was it ${correctHobby}? I think that's right but I'm not entirely sure.`,
            profession: (correctProfession) => `You work in... let me think... something related to ${correctProfession.split(' ')[0]}? I think you said ${correctProfession} but I might be mixing things up.`
        }
    }
};

/**
 * Get the appropriate template for a conversation turn
 */
function getConversationTemplate(turnNumber, userFacts = {}) {
    if (turnNumber >= 1 && turnNumber <= 8) {
        const template = FIXED_CONVERSATION_TEMPLATES.TURN_TEMPLATES[turnNumber];
        if (!template) return null;

        // Handle dynamic prompts that reference previous responses
        if (typeof template.prompt === 'function') {
            const relevantFact = getPreviousFact(turnNumber, userFacts);
            return {
                ...template,
                prompt: template.prompt(relevantFact)
            };
        }
        return template;
    }
    
    if (turnNumber >= 9 && turnNumber <= 12) {
        return FIXED_CONVERSATION_TEMPLATES.QUIZ_TEMPLATES[turnNumber];
    }
    
    if (turnNumber === 13) {
        return FIXED_CONVERSATION_TEMPLATES.GOODBYE_TEMPLATE[13];
    }
    
    return null;
}

/**
 * Get previous fact for dynamic prompt generation
 */
function getPreviousFact(turnNumber, userFacts) {
    const factMap = {
        2: userFacts.name,
        3: userFacts.favFood,
        4: userFacts.favHobby,
        5: userFacts.hobbyFact,
        6: userFacts.profession,
        7: userFacts.funFact
    };
    return factMap[turnNumber] || '';
}

/**
 * Get Agent B error response for a quiz question
 */
function getAgentBErrorResponse(questionType, correctAnswer, errorType) {
    const templates = FIXED_CONVERSATION_TEMPLATES.AGENT_B_ERROR_TEMPLATES[errorType];
    if (!templates || !templates[questionType]) {
        return correctAnswer; // Fallback to correct answer
    }
    
    if (typeof templates[questionType] === 'function') {
        return templates[questionType](correctAnswer);
    }
    return templates[questionType];
}

/**
 * Generate deterministic quiz error schedule for Agent B
 */
function generateQuizErrorSchedule() {
    const schedule = ['correct', 'correct', 'correct', 'correct'];
    
    // Randomly assign one confidently incorrect and one vaguely correct
    const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    schedule[shuffledIndices[0]] = 'CONFIDENTLY_INCORRECT';
    schedule[shuffledIndices[1]] = 'VAGUELY_CORRECT';
    
    return schedule;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FIXED_CONVERSATION_TEMPLATES,
        getConversationTemplate,
        getAgentBErrorResponse,
        generateQuizErrorSchedule
    };
}
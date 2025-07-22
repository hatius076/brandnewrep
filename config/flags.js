// Game Configuration
const GAME_CONFIG = {
    // Character assignment - sequential A then B execution
    MEMORY_IMPAIRED: false, // Start with Agent A (perfect memory), then Agent B
    DUAL_AGENT_MODE: true, // Enable sequential agent evaluation
    
    // Timing configuration - enforced minimum delays for better user experience
    TYPING_DELAY: {
        MIN: 2000,  // minimum delay for typing simulation (2 seconds)
        MAX: 3000   // maximum delay for typing simulation (3 seconds)
    },
    
    // Minimum delay between conversation turns (5 seconds as specified)
    TURN_DELAY: {
        MIN: 5000,  // minimum 5-second delay between turns
        NATURAL_PAUSE: 2000  // additional natural pause for conversation flow
    },
    
    // Response length parity
    TOKEN_PARITY: {
        MAX_DIFF: 5  // maximum token difference between character responses
    },
    
    // Memory impairment settings
    MEMORY_ACCURACY: {
        PERFECT: 1.0,     // Character A - perfect recall
        IMPAIRED: 0.5,    // Character B - 50% accuracy
        MAX_ERRORS: 3     // maximum controlled errors for Character B
    },
    
    // Mandatory fact-gathering sequence (6 questions)
    FACT_TYPES: [
        'name',           // Ask and respond naturally with friendly acknowledgment
        'favFood',        // Ask, comment casually, and segue to next topic  
        'favHobby',       // Ask, express curiosity or enthusiasm
        'hobbyFact',      // Ask for unique detail and acknowledge positively
        'profession',     // Ask lightly and conversationally
        'bonusFact'       // Optional: Allow "nothing" as answer, exclude from quiz if so
    ],
    
    // Fact gathering configuration
    FACT_GATHERING: {
        ENFORCE_SEQUENCE: true,    // Lock scene-state to 6-question sequence
        MANDATORY_QUESTIONS: 6,    // Exact number of questions required
        NATURAL_TRANSITIONS: true  // Enable human-like interaction style
    },
    
    // Session configuration
    SESSION: {
        TARGET_DURATION_MIN: 10,  // minimum target duration in minutes
        TARGET_DURATION_MAX: 20,  // maximum target duration in minutes
        DUAL_AGENT_MODE: true,    // Run both agents sequentially
        AGENT_A_FIRST: true       // Always start with Agent A
    },
    
    // UI Configuration
    UI: {
        LOADING_ANIMATION: true,   // Show loading animation during API calls
        DEBUG_MODE_ENHANCED: true, // Enhanced debug mode with collapsible [THOUGHT] display
        INLINE_THOUGHTS: true      // Show thoughts inline vs collapsible pane
    }
};

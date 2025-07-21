// Game Configuration
const GAME_CONFIG = {
    // Character assignment - randomly set on page load
    MEMORY_IMPAIRED: Math.random() < 0.5, // 50% chance for each character type
    
    // Timing configuration
    TYPING_DELAY: {
        MIN: 300,  // minimum delay for typing simulation
        MAX: 600   // maximum delay for typing simulation
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
    
    // Question types and facts to collect
    FACT_TYPES: [
        'name',
        'favFood', 
        'favHobby',
        'favRelaxPlace',
        'profession',
        'bonusFact'
    ],
    
    // Session configuration
    SESSION: {
        TARGET_DURATION_MIN: 10,  // minimum target duration in minutes
        TARGET_DURATION_MAX: 20   // maximum target duration in minutes
    }
};

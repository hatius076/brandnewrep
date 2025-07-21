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
    
    // Dynamic fact collection settings
    FACT_COLLECTION: {
        MAX_FACTS: 6,        // Total facts to collect
        MIN_FACTS_FOR_QUIZ: 6, // Minimum facts needed before quiz
        DYNAMIC_CATEGORIES: true, // Use dynamic categorization instead of static types
        FACT_SLOTS: [1, 2, 3, 4, 5, 6] // Numbered fact slots
    },
    
    // Removed static fact types - now using dynamic collection
    // Legacy support for transition period
    FACT_TYPES: [
        'dynamic_1',
        'dynamic_2', 
        'dynamic_3',
        'dynamic_4',
        'dynamic_5',
        'dynamic_6'
    ],
    
    // Session configuration
    SESSION: {
        TARGET_DURATION_MIN: 10,  // minimum target duration in minutes
        TARGET_DURATION_MAX: 20   // maximum target duration in minutes
    },
    
    // Warden AI configuration
    WARDEN: {
        ENABLED: true,           // Enable Warden AI system
        FACT_ANALYSIS_ENABLED: true, // Use Warden for fact analysis
        TURN_MANAGEMENT: true,   // Let Warden control conversation flow
        CONTEXT_WINDOW: 3        // Number of previous turns to include in context
    }
};

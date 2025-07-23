/**
 * Placeholder for removed fact system
 * Facts are no longer stored or recalled
 */

class DynamicFactSystem {
    constructor() {
        // No fact storage - this class is now a stub
    }

    // All fact-related methods are now no-ops or return empty data
    recordFact() { return null; }
    getAllFacts() { return []; }
    getFact() { return null; }
    getFactsByCategory() { return []; }
    searchFacts() { return []; }
    getMostMemorableFacts() { return []; }
    generateQuestionForFact() { return null; }
    exportForMemoryTest() { return []; }
    reset() { }
    getStats() { return { totalFacts: 0, maxFacts: 0, categories: [], averageMemorabilityScore: 0, mostMemorableFact: null }; }
}

// Export for module systems  
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicFactSystem;
}
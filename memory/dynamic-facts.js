/**
 * Dynamic Fact Collection System
 * Replaces fixed categories with flexible, conversation-driven fact storage
 */

class DynamicFactSystem {
    constructor() {
        this.facts = new Map(); // fact number -> fact object
        this.factCounter = 0;
        this.maxFacts = 6;
    }

    /**
     * Record a new fact from user input
     */
    recordFact(userInput, context = {}) {
        if (this.factCounter >= this.maxFacts) {
            console.warn('Maximum facts reached');
            return null;
        }

        this.factCounter++;
        const fact = {
            factNumber: this.factCounter,
            content: userInput.trim(),
            timestamp: Date.now(),
            context: context,
            category: this.inferCategory(userInput),
            keywords: this.extractKeywords(userInput),
            memorable: this.assessMemorability(userInput)
        };

        this.facts.set(this.factCounter, fact);
        return fact;
    }

    /**
     * Infer category from user input (for backward compatibility)
     */
    inferCategory(input) {
        const lower = input.toLowerCase();
        
        if (lower.includes('name') || lower.match(/i'm|i am|call me/)) {
            return 'name';
        }
        if (lower.includes('work') || lower.includes('job') || lower.includes('career')) {
            return 'profession';
        }
        if (lower.includes('hobby') || lower.includes('enjoy') || lower.includes('love doing')) {
            return 'hobby';
        }
        if (lower.includes('food') || lower.includes('eat') || lower.includes('cooking')) {
            return 'food';
        }
        if (lower.includes('relax') || lower.includes('unwind') || lower.includes('peaceful')) {
            return 'relaxation';
        }
        if (lower.includes('travel') || lower.includes('visit') || lower.includes('place')) {
            return 'travel';
        }
        
        return 'general';
    }

    /**
     * Extract meaningful keywords from user input
     */
    extractKeywords(input) {
        const stopWords = new Set(['i', 'me', 'my', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        
        return input.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 5); // Keep top 5 keywords
    }

    /**
     * Assess how memorable/important this fact is
     */
    assessMemorability(input) {
        const memorable_indicators = [
            'important', 'love', 'hate', 'passion', 'favorite', 'best', 'worst',
            'always', 'never', 'family', 'dream', 'goal', 'special', 'unique'
        ];
        
        const lower = input.toLowerCase();
        const memorableWords = memorable_indicators.filter(word => lower.includes(word));
        
        return {
            score: Math.min(memorableWords.length / memorable_indicators.length * 10, 10),
            indicators: memorableWords
        };
    }

    /**
     * Get all facts as array
     */
    getAllFacts() {
        return Array.from(this.facts.values());
    }

    /**
     * Get fact by number
     */
    getFact(factNumber) {
        return this.facts.get(factNumber);
    }

    /**
     * Get facts by category
     */
    getFactsByCategory(category) {
        return Array.from(this.facts.values()).filter(fact => fact.category === category);
    }

    /**
     * Search facts by keyword
     */
    searchFacts(keyword) {
        const lower = keyword.toLowerCase();
        return Array.from(this.facts.values()).filter(fact => 
            fact.content.toLowerCase().includes(lower) ||
            fact.keywords.some(kw => kw.includes(lower))
        );
    }

    /**
     * Get most memorable facts
     */
    getMostMemorableFacts(limit = 3) {
        return Array.from(this.facts.values())
            .sort((a, b) => b.memorable.score - a.memorable.score)
            .slice(0, limit);
    }

    /**
     * Generate natural question text for a fact
     */
    generateQuestionForFact(factNumber) {
        const fact = this.getFact(factNumber);
        if (!fact) return null;

        const templates = this.getQuestionTemplates(fact.category);
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        return {
            question: template,
            factNumber: factNumber,
            expectedAnswer: fact.content,
            category: fact.category,
            keywords: fact.keywords
        };
    }

    /**
     * Get question templates based on fact category
     */
    getQuestionTemplates(category) {
        const templates = {
            name: [
                "What did I tell you my name was?",
                "What should you call me?",
                "What name did I give you?"
            ],
            profession: [
                "What do I do for work?",
                "What's my job or profession?",
                "What did I tell you about my career?"
            ],
            hobby: [
                "What hobby did I mention?",
                "What do I enjoy doing in my free time?",
                "What activity did I say I love?"
            ],
            food: [
                "What food did I mention?",
                "What do I like to eat?",
                "What did I tell you about my eating preferences?"
            ],
            relaxation: [
                "Where did I say I like to relax?",
                "What helps me unwind?",
                "Where do I go for peace and quiet?"
            ],
            travel: [
                "What place did I mention?",
                "Where have I traveled or want to travel?",
                "What location did I tell you about?"
            ],
            general: [
                "What interesting thing did I share with you?",
                "What did I tell you about myself?",
                "What personal detail did I mention?"
            ]
        };

        return templates[category] || templates.general;
    }

    /**
     * Export facts for memory testing
     */
    exportForMemoryTest(memoryImpaired = false) {
        const allFacts = this.getAllFacts();
        
        if (!memoryImpaired) {
            // Perfect memory - return all facts accurately
            return allFacts.map(fact => ({
                factNumber: fact.factNumber,
                content: fact.content,
                category: fact.category,
                confidence: 1.0
            }));
        }

        // Impaired memory - apply forgetting patterns
        return this.applyMemoryImpairment(allFacts);
    }

    /**
     * Apply memory impairment patterns to facts
     */
    applyMemoryImpairment(facts) {
        const impairedFacts = [];
        const forgettingRate = 0.4; // 40% chance to forget or distort each fact
        
        facts.forEach(fact => {
            const random = Math.random();
            
            if (random < forgettingRate) {
                // Apply forgetting - either complete loss or distortion
                if (Math.random() < 0.5) {
                    // Complete forgetting - skip this fact
                    return;
                } else {
                    // Partial/distorted memory
                    impairedFacts.push({
                        factNumber: fact.factNumber,
                        content: this.distortFact(fact.content),
                        category: fact.category,
                        confidence: Math.random() * 0.6 + 0.2, // 0.2-0.8 confidence
                        distorted: true
                    });
                }
            } else {
                // Remember correctly
                impairedFacts.push({
                    factNumber: fact.factNumber,
                    content: fact.content,
                    category: fact.category,
                    confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence
                });
            }
        });

        return impairedFacts;
    }

    /**
     * Create distorted version of a fact for impaired memory
     */
    distortFact(originalContent) {
        const distortionPatterns = [
            // Close but wrong
            (content) => content.replace(/\b\w+\b/g, (word) => {
                if (Math.random() < 0.3 && word.length > 3) {
                    return this.getSimilarWord(word);
                }
                return word;
            }),
            // Partial information
            (content) => {
                const words = content.split(' ');
                const keepWords = Math.ceil(words.length * 0.6);
                return words.slice(0, keepWords).join(' ') + '...';
            },
            // Fuzzy recall
            (content) => {
                return `Something like... ${content.split(' ').slice(0, 2).join(' ')}... I think?`;
            }
        ];

        const pattern = distortionPatterns[Math.floor(Math.random() * distortionPatterns.length)];
        return pattern(originalContent);
    }

    /**
     * Get similar but incorrect word for distortion
     */
    getSimilarWord(originalWord) {
        const similarWords = {
            'pizza': 'pasta',
            'pasta': 'pizza', 
            'reading': 'writing',
            'writing': 'reading',
            'beach': 'mountain',
            'mountain': 'beach',
            'teacher': 'professor',
            'professor': 'teacher',
            'guitar': 'piano',
            'piano': 'guitar',
            'running': 'swimming',
            'swimming': 'running'
        };

        return similarWords[originalWord.toLowerCase()] || originalWord;
    }

    /**
     * Reset the fact system
     */
    reset() {
        this.facts.clear();
        this.factCounter = 0;
    }

    /**
     * Get summary statistics
     */
    getStats() {
        const allFacts = this.getAllFacts();
        const categories = [...new Set(allFacts.map(f => f.category))];
        
        return {
            totalFacts: allFacts.length,
            maxFacts: this.maxFacts,
            categories: categories,
            averageMemorabilityScore: allFacts.reduce((sum, fact) => sum + fact.memorable.score, 0) / allFacts.length || 0,
            mostMemorableFact: allFacts.reduce((max, fact) => 
                fact.memorable.score > (max?.memorable.score || 0) ? fact : max, null)
        };
    }
}

// Export for module systems  
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicFactSystem;
}
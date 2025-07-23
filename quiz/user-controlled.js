/**
 * User-Controlled Quiz System
 * Allows users to select questions to test AI memory
 */

class UserControlledQuiz {
    constructor(factSystem, gameInstance) {
        this.factSystem = factSystem;
        this.game = gameInstance;
        this.availableQuestions = [];
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAskedQuestions = [];
    }

    /**
     * Initialize quiz with questions based on collected facts
     */
    initializeQuiz() {
        this.availableQuestions = this.generateQuestionsFromFacts();
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAskedQuestions = [];
    }

    /**
     * Generate questions based on collected facts
     */
    generateQuestionsFromFacts() {
        const facts = this.factSystem.getAllFacts();
        const questions = [];

        facts.forEach(fact => {
            if (fact.content && fact.content.trim()) {
                const questionOptions = this.generateQuestionOptions(fact);
                questions.push(...questionOptions);
            }
        });

        // Shuffle questions for variety
        return this.shuffleArray(questions);
    }

    /**
     * Generate multiple question options for a single fact
     */
    generateQuestionOptions(fact) {
        const questions = [];
        const baseTemplates = this.getQuestionTemplates(fact.category);
        
        baseTemplates.forEach(template => {
            questions.push({
                id: `${fact.factNumber}_${questions.length}`,
                text: template,
                factNumber: fact.factNumber,
                expectedAnswer: fact.content,
                category: fact.category,
                keywords: fact.keywords,
                difficulty: this.assessQuestionDifficulty(fact)
            });
        });

        // Add contextual questions based on keywords
        const contextualQuestions = this.generateContextualQuestions(fact);
        questions.push(...contextualQuestions);

        return questions;
    }

    /**
     * Generate contextual questions based on fact content
     */
    generateContextualQuestions(fact) {
        const questions = [];
        const content = fact.content.toLowerCase();
        
        // Look for specific patterns to create targeted questions
        if (content.includes('because') || content.includes('since')) {
            questions.push({
                id: `${fact.factNumber}_why`,
                text: `Why did I mention ${this.extractMainSubject(fact.content)}?`,
                factNumber: fact.factNumber,
                expectedAnswer: fact.content,
                category: fact.category,
                type: 'reasoning'
            });
        }

        if (content.includes('favorite') || content.includes('love') || content.includes('enjoy')) {
            questions.push({
                id: `${fact.factNumber}_preference`,
                text: `What did I say I particularly like or enjoy?`,
                factNumber: fact.factNumber,
                expectedAnswer: fact.content,
                category: fact.category,
                type: 'preference'
            });
        }

        if (content.includes('often') || content.includes('usually') || content.includes('always')) {
            questions.push({
                id: `${fact.factNumber}_frequency`,
                text: `What did I say I do regularly or often?`,
                factNumber: fact.factNumber,
                expectedAnswer: fact.content,
                category: fact.category,
                type: 'frequency'
            });
        }

        return questions;
    }

    /**
     * Extract main subject from fact content
     */
    extractMainSubject(content) {
        const words = content.split(' ');
        const importantWords = words.filter(word => 
            word.length > 3 && 
            !['that', 'this', 'with', 'from', 'they', 'them', 'have', 'been'].includes(word.toLowerCase())
        );
        return importantWords[0] || 'that';
    }

    /**
     * Get question templates for different categories
     */
    getQuestionTemplates(category) {
        const templates = {
            name: [
                "What did I tell you my name was?",
                "What should you call me?",
                "How did I introduce myself?"
            ],
            profession: [
                "What do I do for work?",
                "What's my profession or job?",
                "How do I make a living?",
                "What career did I mention?"
            ],
            hobby: [
                "What hobby do I enjoy?",
                "What do I like to do in my free time?",
                "What activities did I mention enjoying?",
                "How do I like to spend my leisure time?"
            ],
            food: [
                "What food preferences did I share?",
                "What do I like to eat?",
                "What did I tell you about food?"
            ],
            relaxation: [
                "Where do I like to relax?",
                "How do I unwind?",
                "What helps me feel peaceful?",
                "Where do I go to recharge?"
            ],
            travel: [
                "What places did I mention?",
                "Where have I traveled or want to go?",
                "What locations did I talk about?"
            ],
            general: [
                "What interesting detail did I share?",
                "What did I tell you about myself?",
                "What personal information did I mention?"
            ]
        };

        return templates[category] || templates.general;
    }

    /**
     * Assess difficulty of remembering this question
     */
    assessQuestionDifficulty(fact) {
        let difficulty = 1; // Base difficulty

        // More complex/longer facts are harder to remember
        if (fact.content.length > 50) difficulty += 1;
        if (fact.content.split(' ').length > 10) difficulty += 1;

        // Less memorable facts are harder
        if (fact.memorable.score < 3) difficulty += 1;

        // Facts with many keywords might be more confusing
        if (fact.keywords.length > 3) difficulty += 0.5;

        return Math.min(difficulty, 5); // Cap at 5
    }

    /**
     * Create quiz interface HTML
     */
    createQuizInterface() {
        const container = document.createElement('div');
        container.className = 'quiz-control-interface';
        container.innerHTML = `
            <div class="quiz-intro">
                <h3>Test my memory! Pick questions to ask me:</h3>
                <p>Choose which facts you'd like me to try to remember from our conversation.</p>
            </div>
            
            <div class="question-selection">
                <div class="question-categories">
                    <button class="category-filter active" data-category="all">All Questions</button>
                    <button class="category-filter" data-category="recent">Recent Facts</button>
                    <button class="category-filter" data-category="important">Most Important</button>
                </div>
                
                <div class="available-questions" id="available-questions">
                    <!-- Questions will be populated here -->
                </div>
            </div>
            
            <div class="quiz-controls">
                <div class="selected-count">Selected: <span id="selected-count">0</span> questions</div>
                <button id="start-quiz-btn" class="start-quiz-btn" disabled>Start Memory Test</button>
            </div>
        `;

        return container;
    }

    /**
     * Populate question options in the interface
     */
    populateQuestions(filter = 'all') {
        const container = document.getElementById('available-questions');
        if (!container) return;

        const questions = this.filterQuestions(filter);
        container.innerHTML = '';

        questions.forEach(question => {
            const questionElement = this.createQuestionElement(question);
            container.appendChild(questionElement);
        });
    }

    /**
     * Filter questions based on category/criteria
     */
    filterQuestions(filter) {
        let questions = [...this.availableQuestions];

        switch (filter) {
            case 'recent':
                // Show questions from most recently collected facts
                questions = questions.filter(q => q.factNumber > this.factSystem.factCounter - 3);
                break;
            case 'important':
                // Show questions from most memorable facts
                const memorableFacts = this.factSystem.getMostMemorableFacts();
                const memorableFactNumbers = memorableFacts.map(f => f.factNumber);
                questions = questions.filter(q => memorableFactNumbers.includes(q.factNumber));
                break;
            case 'all':
            default:
                // Show all questions
                break;
        }

        return questions.slice(0, 10); // Limit to 10 questions for UI clarity
    }

    /**
     * Create individual question element
     */
    createQuestionElement(question) {
        const element = document.createElement('div');
        element.className = 'question-option';
        element.dataset.questionId = question.id;
        
        const difficultyStars = '★'.repeat(Math.floor(question.difficulty || 1));
        
        element.innerHTML = `
            <div class="question-content">
                <div class="question-text">${question.text}</div>
                <div class="question-meta">
                    <span class="fact-number">Fact #${question.factNumber}</span>
                    <span class="difficulty">${difficultyStars}</span>
                    <span class="category">${question.category}</span>
                </div>
            </div>
            <button class="select-question-btn" onclick="quiz.selectQuestion('${question.id}')">
                Select
            </button>
        `;

        return element;
    }

    /**
     * Select a question for the quiz
     */
    selectQuestion(questionId) {
        const question = this.availableQuestions.find(q => q.id === questionId);
        if (!question) return;

        // Toggle selection
        const index = this.selectedQuestions.findIndex(q => q.id === questionId);
        if (index >= 0) {
            this.selectedQuestions.splice(index, 1);
        } else {
            this.selectedQuestions.push(question);
        }

        this.updateQuestionUI(questionId);
        this.updateSelectionCount();
    }

    /**
     * Update question UI to show selection state
     */
    updateQuestionUI(questionId) {
        const element = document.querySelector(`[data-question-id="${questionId}"]`);
        if (!element) return;

        const isSelected = this.selectedQuestions.some(q => q.id === questionId);
        const button = element.querySelector('.select-question-btn');
        
        if (isSelected) {
            element.classList.add('selected');
            button.textContent = 'Remove';
            button.classList.add('remove');
        } else {
            element.classList.remove('selected');
            button.textContent = 'Select';
            button.classList.remove('remove');
        }
    }

    /**
     * Update selection count display
     */
    updateSelectionCount() {
        const countElement = document.getElementById('selected-count');
        const startButton = document.getElementById('start-quiz-btn');
        
        if (countElement) {
            countElement.textContent = this.selectedQuestions.length;
        }
        
        if (startButton) {
            startButton.disabled = this.selectedQuestions.length === 0;
        }
    }

    /**
     * Start the selected quiz
     */
    startQuiz() {
        if (this.selectedQuestions.length === 0) {
            alert('Please select at least one question to ask!');
            return;
        }

        this.userAskedQuestions = [...this.selectedQuestions];
        this.currentQuestionIndex = 0;
        this.game.enterUserControlledQuiz(this.userAskedQuestions);
    }

    /**
     * Get next question in user's selected quiz
     */
    getNextQuestion() {
        if (this.currentQuestionIndex >= this.userAskedQuestions.length) {
            return null; // Quiz complete
        }

        const question = this.userAskedQuestions[this.currentQuestionIndex];
        this.currentQuestionIndex++;
        return question;
    }

    /**
     * Check if quiz is complete
     */
    isQuizComplete() {
        return this.currentQuestionIndex >= this.userAskedQuestions.length;
    }

    /**
     * Get quiz progress
     */
    getProgress() {
        return {
            current: this.currentQuestionIndex,
            total: this.userAskedQuestions.length,
            percentage: (this.currentQuestionIndex / this.userAskedQuestions.length) * 100
        };
    }

    /**
     * Shuffle array utility
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Reset quiz state
     */
    reset() {
        this.availableQuestions = [];
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAskedQuestions = [];
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserControlledQuiz;
}
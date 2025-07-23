/**
 * User-Controlled Quiz System
 * Pure roleplay - user selects questions, agents answer in character
 */

class UserControlledQuiz {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.availableQuestions = this.getFixedQuestions();
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAskedQuestions = [];
    }

    /**
     * Initialize quiz with fixed roleplay questions
     */
    initializeQuiz() {
        this.availableQuestions = this.getFixedQuestions();
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAskedQuestions = [];
    }

    /**
     * Get fixed set of roleplay questions
     */
    getFixedQuestions() {
        return [
            "What's my name?",
            "What do I do for work?", 
            "What's my favorite food?",
            "What's my hobby?",
            "Where do I like to relax?",
            "What's something interesting about me?",
            "What did I tell you about my interests?",
            "What do you remember about our conversation?"
        ];
    }

    /**
     * Display question selection interface
     */
    displayQuestionSelection() {
        const container = document.getElementById('quiz-container');
        const questionDiv = document.getElementById('quiz-question');
        const optionsDiv = document.getElementById('quiz-options');

        questionDiv.textContent = "Select a question to ask the AI:";
        optionsDiv.innerHTML = '';

        this.availableQuestions.forEach((question, index) => {
            const button = document.createElement('button');
            button.textContent = question;
            button.className = 'quiz-option';
            button.onclick = () => this.selectQuestion(question);
            optionsDiv.appendChild(button);
        });

        container.classList.remove('hidden');
    }

    /**
     * User selects a question for roleplay
     */
    selectQuestion(questionText) {
        this.userAskedQuestions.push({
            question: questionText,
            timestamp: Date.now()
        });

        // Hide quiz selection and show the question
        document.getElementById('quiz-container').classList.add('hidden');
        
        // Send question to AI for roleplay response
        this.game.handleQuizQuestion(questionText);
    }

    /**
     * Reset quiz state
     */
    reset() {
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAskedQuestions = [];
    }

    /**
     * Get user's question history
     */
    getQuestionHistory() {
        return this.userAskedQuestions;
    }

    /**
     * Check if quiz is complete (user asked 4 questions)
     */
    isComplete() {
        return this.userAskedQuestions.length >= 4;
    }
}

// Global instance for use in main game
let userQuiz = null;
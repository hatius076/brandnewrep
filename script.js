/**
 * Interactive Conversation Study - Simplified with .env API Key Management
 * Tests how AI character memory accuracy influences user perception
 */

class ConversationEngine {
    constructor() {
        this.apiKey = null;
        this.conversationHistory = [];
        this.factsCollected = {};
        this.currentPhase = 'setup';
        this.currentStep = 0;
        this.characterType = GAME_CONFIG.MEMORY_IMPAIRED ? 'B' : 'A';
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.quizAnswers = [];
        this.ratings = {};
        this.memoryErrors = 0;
        
        this.elements = {};
        this.initializeElements();
        this.initializeEventListeners();
    }

    async initialize() {
        // Load API key from environment
        // For client-side applications, we check for window.env which can be set by build tools
        this.apiKey = (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) || 
                      (typeof window !== 'undefined' && window.env?.OPENAI_API_KEY) ||
                      null;
        
        if (!this.apiKey || this.apiKey === 'sk-your-api-key-here') {
            this.displayError('No API key found. Please create a .env file with OPENAI_API_KEY=your_key_here');
            return;
        }
        
        // Test the key
        const isValid = await this.testAPIKey();
        if (!isValid) {
            this.displayError('Invalid API key in .env file. Please check your OPENAI_API_KEY value.');
            return;
        }
        
        console.log('✅ API key loaded from .env file');
        this.currentPhase = 'introduction';
        await this.startConversation();
    }
    
    displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: red; padding: 20px; text-align: center; font-size: 18px; background: #ffe6e6; border: 1px solid #ff0000; border-radius: 5px; margin: 20px;';
        errorDiv.innerHTML = `
            <strong>Configuration Error</strong><br>
            ${message}<br><br>
            <strong>Setup Instructions:</strong><br>
            1. Create a <code>.env</code> file in the project root<br>
            2. Add your API key: <code>OPENAI_API_KEY=sk-your-actual-key</code><br>
            3. Refresh the page
        `;
        document.body.appendChild(errorDiv);
    }
    
    async testAPIKey() {
        try {
            const response = await this.callLLM('Test', 10);
            return response && response.length > 0;
        } catch (error) {
            console.error('API key test failed:', error);
            return false;
        }
    }

    async startConversation() {
        this.elements.sessionId.textContent = `Session: ${this.sessionId}`;
        this.updateProgressIndicator();
        this.logEvent('game_start', { characterType: this.characterType });
        
        const greeting = this.getGreetingMessage();
        await this.displayMessage(greeting);
        
        setTimeout(() => {
            this.collectNextFact();
        }, 1500);
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async callLLM(prompt, maxTokens = 150) {
        if (!this.apiKey) {
            throw new Error('No API key available');
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('LLM call failed:', error);
            throw error;
        }
    }

    getGreetingMessage() {
        const greetings = [
            "Hello! I'm an AI assistant and I'm excited to chat with you today. I'd love to learn a bit about you so we can have a more personal conversation.",
            "Hi there! I'm an AI that enjoys getting to know people. I hope you don't mind if I ask you a few questions about yourself so I can better understand who you are.",
            "Welcome! I'm an AI assistant, and I find that conversations are much more engaging when I know something about the person I'm talking with. Would you mind sharing some details about yourself?"
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    initializeElements() {
        // Cache essential DOM elements
        this.elements = {
            sessionId: document.getElementById('session-id'),
            progressIndicator: document.getElementById('progress-indicator'),
            dialogueText: document.getElementById('dialogue-text'),
            typingIndicator: document.getElementById('typing-indicator'),
            
            textInputContainer: document.getElementById('text-input-container'),
            inputLabel: document.getElementById('input-label'),
            textInput: document.getElementById('text-input'),
            submitButton: document.getElementById('submit-button'),
            
            quizContainer: document.getElementById('quiz-container'),
            quizQuestion: document.getElementById('quiz-question'),
            quizOptions: document.getElementById('quiz-options'),
            
            ratingContainer: document.getElementById('rating-container'),
            ratingQuestion: document.getElementById('rating-question'),
            scaleButtons: document.getElementById('scale-buttons'),
            
            continueContainer: document.getElementById('continue-container'),
            continueButton: document.getElementById('continue-button'),
            
            restartButton: document.getElementById('restart-button'),
            completionStatus: document.getElementById('completion-status'),
            
            dataExport: document.getElementById('data-export'),
            downloadData: document.getElementById('download-data'),
            sessionData: document.getElementById('session-data')
        };
    }
    
    initializeEventListeners() {
        // Text input submission
        this.elements.submitButton.addEventListener('click', () => this.handleTextSubmit());
        this.elements.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleTextSubmit();
        });
        
        // Continue button
        this.elements.continueButton.addEventListener('click', () => this.advanceDialogue());
        
        // Rating buttons
        this.elements.scaleButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('rating-btn')) {
                this.handleRatingSelect(e.target);
            }
        });
        
        // Restart button
        this.elements.restartButton.addEventListener('click', () => this.restartGame());
        
        // Data download
        this.elements.downloadData.addEventListener('click', () => this.downloadSessionData());
    }
    
    updateProgressIndicator() {
        const phases = ['Introduction', 'Quiz', 'Rating', 'Complete'];
        const currentPhaseIndex = ['introduction', 'quiz', 'rating', 'complete'].indexOf(this.currentPhase);
        this.elements.progressIndicator.textContent = `${phases[currentPhaseIndex] || 'Starting'}`;
    }

    async collectNextFact() {
        const factTypes = GAME_CONFIG.FACT_TYPES;
        if (this.currentStep >= factTypes.length) {
            // All facts collected, move to quiz
            this.currentPhase = 'quiz';
            this.startQuiz();
            return;
        }
        
        const currentFactType = factTypes[this.currentStep];
        const prompts = {
            name: "What's your name? I'd love to know what to call you!",
            favFood: "What's your favorite food? I'm curious about your tastes!",
            favHobby: "What hobby do you enjoy most in your free time?",
            favRelaxPlace: "Where do you like to go to relax and unwind?",
            profession: "What do you do for work or study?",
            bonusFact: "Tell me something interesting about yourself!"
        };
        
        const prompt = prompts[currentFactType] || "Tell me about yourself!";
        
        this.elements.inputLabel.textContent = prompt;
        this.elements.textInput.value = '';
        this.elements.textInput.placeholder = 'Type your response here...';
        this.elements.textInputContainer.classList.remove('hidden');
        this.elements.textInput.focus();
    }

    async handleTextSubmit() {
        const input = this.elements.textInput.value.trim();
        if (!input) return;
        
        const factType = GAME_CONFIG.FACT_TYPES[this.currentStep];
        this.factsCollected[factType] = input;
        
        this.logEvent('fact_collected', {
            factType: factType,
            value: input,
            step: this.currentStep
        });
        
        // Generate appropriate response
        this.elements.textInputContainer.classList.add('hidden');
        
        setTimeout(async () => {
            try {
                const response = await this.generateFactResponse(input);
                await this.displayMessage(response);
                this.currentStep++;
                
                setTimeout(() => {
                    this.collectNextFact();
                }, 1000);
            } catch (error) {
                console.error('Error generating response:', error);
                // Fallback response
                const fallbackResponse = "That's interesting! Thanks for sharing that with me.";
                await this.displayMessage(fallbackResponse);
                this.currentStep++;
                
                setTimeout(() => {
                    this.collectNextFact();
                }, 1000);
            }
        }, this.getTypingDelay());
    }

    async generateFactResponse(value) {
        try {
            const prompt = `The user just told me: "${value}". Respond with a brief, warm acknowledgment in 1-2 sentences. Be genuine and encouraging.`;
            const response = await this.callLLM(prompt, 80);
            return response;
        } catch (error) {
            console.warn('LLM request failed, using fallback response:', error);
            const responses = [
                "That's really interesting! Thanks for sharing that with me.",
                "I'm glad you told me about that! I love learning about people.",
                "That sounds wonderful! I appreciate you opening up.",
                "That's great to know! You seem like a fascinating person."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    async startQuiz() {
        this.currentPhase = 'quiz';
        this.currentStep = 0;
        this.updateProgressIndicator();
        
        const quizIntro = "Now I'd like to test my memory of what you've told me. Let me see how well I remember our conversation!";
        await this.displayMessage(quizIntro);
        
        this.prepareQuizQuestions();
        setTimeout(() => {
            this.showNextQuizQuestion();
        }, 2000);
    }

    prepareQuizQuestions() {
        const questions = [
            "What did you tell me your name was?",
            "You mentioned your favorite food earlier - what was it?",
            "What hobby did you say you enjoy most?",
            "Where did you say you like to go to relax?"
        ];
        
        const factKeys = ['name', 'favFood', 'favHobby', 'favRelaxPlace'];
        
        this.quizQuestions = questions.map((question, index) => ({
            question: question,
            factKey: factKeys[index],
            correctAnswer: this.factsCollected[factKeys[index]] || 'Unknown',
            options: this.generateQuizOptions(this.factsCollected[factKeys[index]], factKeys[index])
        }));
    }

    generateQuizOptions(correctAnswer, factType) {
        const distractorSets = {
            name: ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan'],
            favFood: ['Pizza', 'Sushi', 'Tacos', 'Pasta', 'Burgers', 'Ice cream'],
            favHobby: ['Reading', 'Gaming', 'Cooking', 'Hiking', 'Music', 'Photography'],
            favRelaxPlace: ['Beach', 'Mountains', 'Home', 'Park', 'Library', 'Coffee shop']
        };
        
        const distractors = [...(distractorSets[factType] || [])];
        const options = [correctAnswer];
        
        // Add 2-3 distractors
        while (options.length < 4 && distractors.length > 0) {
            const distractor = distractors.splice(Math.floor(Math.random() * distractors.length), 1)[0];
            if (distractor !== correctAnswer) {
                options.push(distractor);
            }
        }
        
        // Shuffle options
        return this.shuffleArray(options);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    showNextQuizQuestion() {
        if (this.currentStep >= this.quizQuestions.length) {
            this.startRating();
            return;
        }
        
        const question = this.quizQuestions[this.currentStep];
        const shouldMakeError = this.shouldMakeMemoryError();
        
        this.elements.quizQuestion.textContent = question.question;
        this.elements.quizOptions.innerHTML = '';
        
        let selectedAnswer = question.correctAnswer;
        
        // Character B (memory impaired) may select wrong answer
        if (shouldMakeError) {
            const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
            if (wrongOptions.length > 0) {
                selectedAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
                this.memoryErrors++;
                this.logEvent('memory_error', {
                    question: question.question,
                    correct: question.correctAnswer,
                    selected: selectedAnswer,
                    step: this.currentStep
                });
            }
        }
        
        // Create option buttons
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quiz-option';
            button.textContent = option;
            button.addEventListener('click', () => this.selectQuizOption(button, option, question));
            this.elements.quizOptions.appendChild(button);
        });
        
        this.elements.quizContainer.classList.remove('hidden');
        
        // Auto-select answer after a delay (simulating AI thinking)
        setTimeout(() => {
            const targetButton = Array.from(this.elements.quizOptions.children)
                .find(btn => btn.textContent === selectedAnswer);
            if (targetButton) {
                this.selectQuizOption(targetButton, selectedAnswer, question);
            }
        }, this.getTypingDelay());
    }

    shouldMakeMemoryError() {
        if (this.characterType === 'A') return false; // Perfect memory
        if (this.memoryErrors >= GAME_CONFIG.MEMORY_ACCURACY.MAX_ERRORS) return false;
        return Math.random() > GAME_CONFIG.MEMORY_ACCURACY.IMPAIRED;
    }

    selectQuizOption(button, answer, question) {
        // Clear previous selections
        Array.from(this.elements.quizOptions.children).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select current option
        button.classList.add('selected');
        
        // Record answer
        this.quizAnswers.push({
            question: question.question,
            correct: question.correctAnswer,
            selected: answer,
            isCorrect: answer === question.correctAnswer
        });
        
        this.logEvent('quiz_answer', {
            question: question.question,
            correct: question.correctAnswer,
            selected: answer,
            isCorrect: answer === question.correctAnswer,
            step: this.currentStep
        });
        
        // Continue to next question after delay
        setTimeout(() => {
            this.elements.quizContainer.classList.add('hidden');
            this.currentStep++;
            
            setTimeout(() => {
                this.showNextQuizQuestion();
            }, 1000);
        }, 2000);
    }

    async startRating() {
        this.currentPhase = 'rating';
        this.currentStep = 0;
        this.updateProgressIndicator();
        
        const outroMessage = this.generatePersonalizedOutro();
        await this.displayMessage(outroMessage);
        
        setTimeout(() => {
            this.showNextRating();
        }, 2000);
    }

    generatePersonalizedOutro() {
        const facts = this.factsCollected;
        const correctAnswers = this.quizAnswers.filter(a => a.isCorrect);
        
        let message = `Thank you for this wonderful conversation, ${facts.name || 'friend'}! `;
        
        if (correctAnswers.length > 2) {
            message += `I really enjoyed learning about your love of ${facts.favFood} and ${facts.favHobby}. `;
            if (facts.favRelaxPlace) {
                message += `${facts.favRelaxPlace} sounds like such a peaceful place to unwind. `;
            }
        } else {
            // Memory impaired version
            message += `I hope I got most of the details about you right - sometimes I have trouble remembering everything perfectly. `;
        }
        
        message += "I hope you enjoyed our chat as much as I did!";
        return message;
    }

    showNextRating() {
        const ratings = [
            "How human-like did this AI assistant seem to you?",
            "How much would you want to interact with this assistant again?"
        ];
        
        if (this.currentStep >= ratings.length) {
            this.completeSession();
            return;
        }
        
        const question = ratings[this.currentStep];
        this.elements.ratingQuestion.textContent = question;
        
        // Clear previous selections
        Array.from(this.elements.scaleButtons.children).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        this.elements.ratingContainer.classList.remove('hidden');
    }

    handleRatingSelect(button) {
        // Clear previous selections
        Array.from(this.elements.scaleButtons.children).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select current rating
        button.classList.add('selected');
        
        const ratingValue = parseInt(button.dataset.value);
        const ratingKey = this.currentStep === 0 ? 'humanness' : 'desirability';
        
        this.ratings[ratingKey] = ratingValue;
        
        this.logEvent('rating_submitted', {
            question: this.elements.ratingQuestion.textContent,
            rating: ratingValue,
            ratingType: ratingKey,
            step: this.currentStep
        });
        
        // Continue to next rating after delay
        setTimeout(() => {
            this.elements.ratingContainer.classList.add('hidden');
            this.currentStep++;
            
            setTimeout(() => {
                this.showNextRating();
            }, 1000);
        }, 1500);
    }

    completeSession() {
        this.currentPhase = 'complete';
        this.updateProgressIndicator();
        
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        this.logEvent('session_complete', {
            duration: duration,
            totalQuestions: this.quizAnswers.length,
            correctAnswers: this.quizAnswers.filter(a => a.isCorrect).length,
            memoryErrors: this.memoryErrors,
            ratings: this.ratings
        });
        
        this.elements.completionStatus.textContent = 
            `Session completed in ${Math.round(duration / 60000)} minutes`;
        this.elements.restartButton.classList.remove('hidden');
        
        // Show data export option
        this.prepareDataExport();
        this.elements.dataExport.classList.remove('hidden');
    }

    prepareDataExport() {
        const exportData = {
            sessionId: this.sessionId,
            characterType: this.characterType,
            memoryImpaired: GAME_CONFIG.MEMORY_IMPAIRED,
            startTime: this.startTime,
            endTime: Date.now(),
            duration: Date.now() - this.startTime,
            factsCollected: this.factsCollected,
            quizAnswers: this.quizAnswers,
            ratings: this.ratings,
            memoryErrors: this.memoryErrors,
            conversationHistory: this.conversationHistory
        };
        
        this.elements.sessionData.value = JSON.stringify(exportData, null, 2);
    }

    downloadSessionData() {
        const data = this.elements.sessionData.value;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_data_${this.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    restartGame() {
        location.reload();
    }

    async displayMessage(text) {
        this.elements.typingIndicator.classList.remove('hidden');
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, this.getTypingDelay()));
        
        this.elements.typingIndicator.classList.add('hidden');
        this.elements.dialogueText.textContent = text;
        this.elements.dialogueText.classList.add('fade-in');
        
        // Log the message
        this.logEvent('message_displayed', {
            text: text,
            phase: this.currentPhase,
            step: this.currentStep
        });
        
        // Add to conversation history
        this.conversationHistory.push({
            timestamp: Date.now(),
            speaker: 'AI',
            text: text,
            phase: this.currentPhase
        });
    }

    getTypingDelay() {
        if (this.characterType === 'A') {
            // Character A gets artificial delay for parity
            return Math.random() * (GAME_CONFIG.TYPING_DELAY.MAX - GAME_CONFIG.TYPING_DELAY.MIN) + GAME_CONFIG.TYPING_DELAY.MIN;
        } else {
            // Character B has natural response time
            return Math.random() * 200 + 100;
        }
    }

    logEvent(eventType, data) {
        console.log(`[${new Date().toISOString()}] ${eventType}:`, data);
        // In a real implementation, this would send data to a research server
    }

    advanceDialogue() {
        // Generic continue function for dialogue advancement
        this.elements.continueContainer.classList.add('hidden');
        // Implementation depends on current state
    }
}

// Initialize when page loads
window.addEventListener('load', async () => {
    const conversation = new ConversationEngine();
    await conversation.initialize();
});
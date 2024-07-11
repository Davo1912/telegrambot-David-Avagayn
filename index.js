const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config()
const token = process.env.TOKEN


const bot = new TelegramBot(token, { polling: true });
let questions = [];
let currentQuestionIndex = -1;
let userAnswers = [];

// Define commands
const commands = [
    { command: 'startquiz', description: 'Start the quiz' },
    { command: 'addquestion', description: 'Add a new question' },
    { command: 'help', description: 'Show help information' }
];

// Set commands with Telegram API
bot.setMyCommands(commands.map(cmd => ({ command: cmd.command, description: cmd.description })));

const askQuestion = (chatId) => {
    if (currentQuestionIndex < questions.length) {
        const question = questions[currentQuestionIndex];
        let options = {
            reply_markup: {
                inline_keyboard: question.answers.map((answer, index) => ([{
                    text: answer,
                    callback_data: `${currentQuestionIndex}-${index}`
                }]))
            }
        };
        bot.sendMessage(chatId, question.text, options);
    } else {
        // Quiz is over
        let correctCount = userAnswers.filter((ans, index) => ans === questions[index].correctIndex).length;
        let results = `You answered ${correctCount} out of ${questions.length} questions correctly.\n\n`;
        results += "Here are the incorrect answers:\n";
        questions.forEach((question, index) => {
            if (userAnswers[index] !== question.correctIndex) {
                results += `Question: ${question.text}\n`;
                results += `Your Answer: ${question.answers[userAnswers[index]]}\n`;
                results += `Correct Answer: ${question.answers[question.correctIndex]}\n\n`;
            }
        });
        bot.sendMessage(chatId, results);
        // Reset for next quiz
        currentQuestionIndex = -1;
        userAnswers = [];
    }
};

// Command handlers
bot.onText(/\/startquiz/, (msg) => {
    const chatId = msg.chat.id;
    if (questions.length === 0) {
        bot.sendMessage(chatId, "No questions have been added yet.");
        return;
    }
    currentQuestionIndex = 0;
    userAnswers = [];
    askQuestion(chatId);
});

bot.onText(/\/addquestion (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const parts = match[1].split('|');
    if (parts.length < 3 || parts.length > 5) {
        bot.sendMessage(chatId, "Invalid format. Use: /addquestion question text|answer1|answer2|...|correctAnswerIndex");
        return;
    }
    let question = {
        text: parts[0],
        answers: parts.slice(1, parts.length - 1),
        correctIndex: parseInt(parts[parts.length - 1], 10)
    };
    questions.push(question);
    bot.sendMessage(chatId, "Question added.");
});

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data.split('-');
    const questionIndex = parseInt(data[0], 10);
    const answerIndex = parseInt(data[1], 10);

    if (questionIndex === currentQuestionIndex) {
        userAnswers[questionIndex] = answerIndex;
        currentQuestionIndex++;
        askQuestion(chatId);
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    let helpMessage = "Commands:\n";
    commands.forEach(cmd => {
        helpMessage += `/${cmd.command} - ${cmd.description}\n`;
    });
    bot.sendMessage(chatId, helpMessage);
});

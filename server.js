const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Увеличиваем лимит для картинок

const DATA_FILE = path.join(__dirname, 'database.json');

// Инициализация базы данных
function initDatabase() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            users: [],
            completedTasks: {},
            adminExamples: { 13: [], 15: [], 18: [] },
            adminPractice: { 13: [], 15: [], 18: [] },
            adminTheory: { 13: '', 15: '', 18: '' },
            adminAlgorithm: { 13: '', 15: '', 18: '' },
            testQuestions: [],
            userMistakes: [],
            sharedMistakes: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Создан файл database.json');
    }
}

function loadData() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

initDatabase();

// ============ АВТОРИЗАЦИЯ ============
app.post('/api/register', (req, res) => {
    const { email, username, password } = req.body;
    const data = loadData();
    
    if (data.users.find(u => u.email === email)) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
    }
    
    data.users.push({ email, username, password, registeredAt: new Date().toISOString() });
    data.completedTasks[email] = [];
    saveData(data);
    
    res.json({ success: true, user: { email, username } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const data = loadData();
    const user = data.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { email: user.email, username: user.username } });
    } else {
        res.json({ success: false, message: 'Неверный email или пароль' });
    }
});

// ============ ВЫПОЛНЕННЫЕ ЗАДАНИЯ ============
app.get('/api/completed/:email', (req, res) => {
    const { email } = req.params;
    const data = loadData();
    res.json({ completed: data.completedTasks[email] || [] });
});

app.post('/api/mark-completed', (req, res) => {
    const { email, taskId } = req.body;
    const data = loadData();
    
    if (!data.completedTasks[email]) data.completedTasks[email] = [];
    if (!data.completedTasks[email].includes(taskId)) {
        data.completedTasks[email].push(taskId);
        saveData(data);
    }
    res.json({ success: true });
});

app.post('/api/unmark-completed', (req, res) => {
    const { email, taskId } = req.body;
    const data = loadData();
    
    if (data.completedTasks[email]) {
        const index = data.completedTasks[email].indexOf(taskId);
        if (index > -1) {
            data.completedTasks[email].splice(index, 1);
            saveData(data);
        }
    }
    res.json({ success: true });
});

// ============ АДМИН-ДАННЫЕ (ПОЛНАЯ ПОДДЕРЖКА) ============
app.get('/api/admin-data', (req, res) => {
    const data = loadData();
    res.json({
        adminExamples: data.adminExamples,
        adminPractice: data.adminPractice,
        adminTheory: data.adminTheory,
        adminAlgorithm: data.adminAlgorithm,
        testQuestions: data.testQuestions
    });
});

app.post('/api/save-examples', (req, res) => {
    const { taskNumber, examples } = req.body;
    const data = loadData();
    data.adminExamples[taskNumber] = examples;
    saveData(data);
    res.json({ success: true });
});

app.post('/api/save-practice', (req, res) => {
    const { taskNumber, practice } = req.body;
    const data = loadData();
    data.adminPractice[taskNumber] = practice;
    saveData(data);
    res.json({ success: true });
});

app.post('/api/save-theory', (req, res) => {
    const { taskNumber, type, content } = req.body;
    const data = loadData();
    if (type === 'theory') {
        data.adminTheory[taskNumber] = content;
    } else {
        data.adminAlgorithm[taskNumber] = content;
    }
    saveData(data);
    res.json({ success: true });
});

app.post('/api/save-test-questions', (req, res) => {
    const { questions } = req.body;
    const data = loadData();
    data.testQuestions = questions;
    saveData(data);
    res.json({ success: true });
});

// ============ ОШИБКИ ============
app.get('/api/mistakes', (req, res) => {
    const data = loadData();
    res.json({
        userMistakes: data.userMistakes,
        sharedMistakes: data.sharedMistakes
    });
});

app.post('/api/save-mistakes', (req, res) => {
    const { userMistakes, sharedMistakes } = req.body;
    const data = loadData();
    if (userMistakes) data.userMistakes = userMistakes;
    if (sharedMistakes) data.sharedMistakes = sharedMistakes;
    saveData(data);
    res.json({ success: true });
});

// ============ ПОЛНЫЙ ИМПОРТ ВСЕХ ДАННЫХ ============
app.post('/api/import-all', (req, res) => {
    const importedData = req.body;
    const currentData = loadData();
    
    // Обновляем только те поля, которые пришли
    if (importedData.users) currentData.users = importedData.users;
    if (importedData.completedTasks) currentData.completedTasks = importedData.completedTasks;
    if (importedData.adminExamples) currentData.adminExamples = importedData.adminExamples;
    if (importedData.adminPractice) currentData.adminPractice = importedData.adminPractice;
    if (importedData.adminTheory) currentData.adminTheory = importedData.adminTheory;
    if (importedData.adminAlgorithm) currentData.adminAlgorithm = importedData.adminAlgorithm;
    if (importedData.testQuestions) currentData.testQuestions = importedData.testQuestions;
    if (importedData.userMistakes) currentData.userMistakes = importedData.userMistakes;
    if (importedData.sharedMistakes) currentData.sharedMistakes = importedData.sharedMistakes;
    
    saveData(currentData);
    res.json({ success: true, message: 'Все данные импортированы' });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`📁 Данные: ${DATA_FILE}`);
});

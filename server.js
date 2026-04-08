const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_FILE = path.join(__dirname, 'database.json');

// Инициализация базы данных
function initDatabase() {
    // ВРЕМЕННО: удаляем старую БД при запуске
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            users: [],
            completedTasks: {},
            userAccess: {},
            adminExamples: { 13: [], 15: [], 18: [] },
            adminPractice: { 13: [], 15: [], 18: [] },
            adminTheory: { 13: '', 15: '', 18: '' },
            adminAlgorithm: { 13: '', 15: '', 18: '' },
            testQuestions: [],
            userMistakes: [],
            sharedMistakes: [],
            ownerEmail: null
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Создан новый database.json');
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

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
function isOwner(email) {
    const data = loadData();
    return data.ownerEmail === email;
}

function isAdmin(email) {
    const data = loadData();
    const user = data.users.find(u => u.email === email);
    return user && (user.role === 'admin' || user.role === 'owner');
}

function hasAccessToTask(userEmail, taskId) {
    const data = loadData();
    const user = data.users.find(u => u.email === userEmail);
    if (user && (user.role === 'owner' || user.role === 'admin')) return true;
    const access = data.userAccess[userEmail];
    return access && access.canAccess && access.canAccess.includes(taskId);
}

// ============ АВТОРИЗАЦИЯ ============
app.post('/api/register', (req, res) => {
    const { email, username, password } = req.body;
    const data = loadData();
    
    if (data.users.find(u => u.email === email)) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
    }
    
    let finalRole = 'user';
    if (data.users.length === 0) {
        finalRole = 'owner';
        data.ownerEmail = email;
    }
    
    const newUser = {
        email,
        username,
        password,
        role: finalRole,
        createdBy: null,
        registeredAt: new Date().toISOString()
    };
    
    data.users.push(newUser);
    data.completedTasks[email] = [];
    data.userAccess[email] = { canAccess: [], teacherEmail: null };
    saveData(data);
    
    res.json({ success: true, user: { email, username, role: finalRole } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const data = loadData();
    const user = data.users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { email: user.email, username: user.username, role: user.role } });
    } else {
        res.json({ success: false, message: 'Неверный email или пароль' });
    }
});

// ============ УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ============
app.get('/api/users', (req, res) => {
    const { email } = req.query;
    const data = loadData();
    
    if (!isAdmin(email)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
    
    if (!isOwner(email)) {
        const filteredUsers = data.users.filter(u => u.createdBy === email || u.email === email);
        return res.json({ users: filteredUsers });
    }
    
    res.json({ users: data.users });
});

app.post('/api/set-role', (req, res) => {
    const { ownerEmail, targetEmail, newRole } = req.body;
    const data = loadData();
    
    if (!isOwner(ownerEmail)) {
        return res.json({ success: false, message: 'Только владелец может назначать роли' });
    }
    
    const user = data.users.find(u => u.email === targetEmail);
    if (user && user.role !== 'owner') {
        user.role = newRole;
        saveData(data);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Пользователь не найден' });
    }
});

app.post('/api/add-student', (req, res) => {
    const { teacherEmail, studentEmail, studentName, password } = req.body;
    const data = loadData();
    
    if (!isAdmin(teacherEmail)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
    
    if (data.users.find(u => u.email === studentEmail)) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
    }
    
    const newUser = {
        email: studentEmail,
        username: studentName,
        password: password,
        role: 'user',
        createdBy: teacherEmail,
        registeredAt: new Date().toISOString()
    };
    
    data.users.push(newUser);
    data.completedTasks[studentEmail] = [];
    data.userAccess[studentEmail] = { canAccess: [], teacherEmail: teacherEmail };
    saveData(data);
    
    res.json({ success: true, user: newUser });
});

app.post('/api/grant-access', (req, res) => {
    const { teacherEmail, studentEmail, taskId } = req.body;
    const data = loadData();
    
    if (!isAdmin(teacherEmail)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
    
    if (!data.userAccess[studentEmail]) {
        data.userAccess[studentEmail] = { canAccess: [], teacherEmail: teacherEmail };
    }
    
    if (!data.userAccess[studentEmail].canAccess.includes(taskId)) {
        data.userAccess[studentEmail].canAccess.push(taskId);
        saveData(data);
    }
    
    res.json({ success: true });
});

app.post('/api/revoke-access', (req, res) => {
    const { teacherEmail, studentEmail, taskId } = req.body;
    const data = loadData();
    
    if (!isAdmin(teacherEmail)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
    
    if (data.userAccess[studentEmail]) {
        const index = data.userAccess[studentEmail].canAccess.indexOf(taskId);
        if (index > -1) {
            data.userAccess[studentEmail].canAccess.splice(index, 1);
            saveData(data);
        }
    }
    
    res.json({ success: true });
});

app.get('/api/my-tasks/:email', (req, res) => {
    const { email } = req.params;
    const data = loadData();
    const user = data.users.find(u => u.email === email);
    
    if (!user) {
        return res.json({ tasks: [] });
    }
    
    if (user.role === 'owner' || user.role === 'admin') {
        const allTasks = [];
        for (let taskNumber of [13, 15, 18]) {
            for (let i = 0; i < (data.adminPractice[taskNumber] || []).length; i++) {
                allTasks.push(`${taskNumber}_${i}`);
            }
        }
        return res.json({ tasks: allTasks });
    }
    
    const access = data.userAccess[email] || { canAccess: [] };
    res.json({ tasks: access.canAccess });
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
    
    if (!hasAccessToTask(email, taskId) && !isAdmin(email)) {
        return res.json({ success: false, message: 'Нет доступа к этому заданию' });
    }
    
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

// ============ АДМИН-ДАННЫЕ ============
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
    const { email, taskNumber, examples } = req.body;
    if (!isAdmin(email)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
    const data = loadData();
    data.adminExamples[taskNumber] = examples;
    saveData(data);
    res.json({ success: true });
});

app.post('/api/save-practice', (req, res) => {
    const { email, taskNumber, practice } = req.body;
    if (!isAdmin(email)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
    const data = loadData();
    data.adminPractice[taskNumber] = practice;
    saveData(data);
    res.json({ success: true });
});

app.post('/api/save-theory', (req, res) => {
    const { email, taskNumber, type, content } = req.body;
    if (!isAdmin(email)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
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
    const { email, questions } = req.body;
    if (!isAdmin(email)) {
        return res.json({ success: false, message: 'Доступ запрещён' });
    }
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

// ============ ПОЛНЫЙ ИМПОРТ ============
app.post('/api/import-all', (req, res) => {
    const importedData = req.body;
    const currentData = loadData();
    
    if (importedData.users) currentData.users = importedData.users;
    if (importedData.completedTasks) currentData.completedTasks = importedData.completedTasks;
    if (importedData.userAccess) currentData.userAccess = importedData.userAccess;
    if (importedData.adminExamples) currentData.adminExamples = importedData.adminExamples;
    if (importedData.adminPractice) currentData.adminPractice = importedData.adminPractice;
    if (importedData.adminTheory) currentData.adminTheory = importedData.adminTheory;
    if (importedData.adminAlgorithm) currentData.adminAlgorithm = importedData.adminAlgorithm;
    if (importedData.testQuestions) currentData.testQuestions = importedData.testQuestions;
    if (importedData.userMistakes) currentData.userMistakes = importedData.userMistakes;
    if (importedData.sharedMistakes) currentData.sharedMistakes = importedData.sharedMistakes;
    if (importedData.ownerEmail) currentData.ownerEmail = importedData.ownerEmail;
    
    saveData(currentData);
    res.json({ success: true, message: 'Все данные импортированы' });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`📁 Данные: ${DATA_FILE}`);
});

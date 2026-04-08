const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'database.json');

// Инициализация базы данных
function initDatabase() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = {
            users: [],
            completedTasks: {}
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

// Регистрация
app.post('/api/register', (req, res) => {
    const { email, username, password } = req.body;
    const data = loadData();
    
    if (data.users.find(u => u.email === email)) {
        return res.json({ success: false, message: 'Пользователь уже существует' });
    }
    
    data.users.push({ email, username, password });
    data.completedTasks[email] = [];
    saveData(data);
    
    res.json({ success: true, user: { email, username } });
});

// Вход
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

// Получить выполненные задания
app.get('/api/completed/:email', (req, res) => {
    const { email } = req.params;
    const data = loadData();
    const completed = data.completedTasks[email] || [];
    res.json({ completed });
});

// Отметить задание
app.post('/api/mark-completed', (req, res) => {
    const { email, taskId } = req.body;
    const data = loadData();
    
    if (!data.completedTasks[email]) {
        data.completedTasks[email] = [];
    }
    
    if (!data.completedTasks[email].includes(taskId)) {
        data.completedTasks[email].push(taskId);
        saveData(data);
    }
    
    res.json({ success: true });
});

// Снять отметку
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

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен!`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📁 Данные: ${DATA_FILE}`);
});
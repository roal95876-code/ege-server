const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_FILE = path.join(__dirname, 'database.json');

// Инициализация базы данных с ДЕФОЛТНЫМИ заданиями
function initDatabase() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultTasks = {
            13: [
                {
                    id: "default_13_1",
                    source: "Реальное ЕГЭ 2023",
                    difficulty: "medium",
                    question: "Решите уравнение: <div class=\"math-formula\">2sin²x + sinx - 1 = 0</div>",
                    answer: "<div class='solution'><h4><i class='fas fa-check-circle'></i> Решение:</h4><div class='solution-step'><strong>Шаг 1:</strong> Сделаем замену t = sinx</div><div class='solution-step'><strong>Шаг 2:</strong> Получаем: 2t² + t - 1 = 0</div><div class='solution-step'><strong>Шаг 3:</strong> Решаем: t₁ = 1/2, t₂ = -1</div><div class='solution-step'><strong>Шаг 4:</strong> Обратная замена: sinx = 1/2 или sinx = -1</div><div class='solution-step'><strong>Ответ:</strong> x = (-1)ⁿ·π/6 + πn, x = -π/2 + 2πk</div></div>"
                },
                {
                    id: "default_13_2",
                    source: "Реальное ЕГЭ 2023",
                    difficulty: "medium",
                    question: "Решите уравнение: <div class=\"math-formula\">2cos²x - 3cosx + 1 = 0</div>",
                    answer: "<div class='solution'><h4><i class='fas fa-check-circle'></i> Решение:</h4><div class='solution-step'><strong>Шаг 1:</strong> Замена t = cosx</div><div class='solution-step'><strong>Шаг 2:</strong> 2t² - 3t + 1 = 0</div><div class='solution-step'><strong>Шаг 3:</strong> t₁ = 1, t₂ = 1/2</div><div class='solution-step'><strong>Ответ:</strong> x = 2πn, x = ±π/3 + 2πn</div></div>"
                }
            ],
            15: [
                {
                    id: "default_15_1",
                    source: "Реальное ЕГЭ 2023",
                    difficulty: "medium",
                    question: "Решите неравенство: <div class=\"math-formula\">log₂(x+3) > 1</div>",
                    answer: "<div class='solution'><h4><i class='fas fa-check-circle'></i> Решение:</h4><div class='solution-step'><strong>ОДЗ:</strong> x+3 > 0 → x > -3</div><div class='solution-step'><strong>Решение:</strong> log₂(x+3) > log₂2</div><div class='solution-step'><strong>Ответ:</strong> x > -1</div></div>"
                }
            ],
            18: [
                {
                    id: "default_18_1",
                    source: "Реальное ЕГЭ 2023",
                    difficulty: "hard",
                    question: "Найдите все значения параметра a, при которых уравнение |x² - 4x| = a имеет ровно 2 корня.",
                    answer: "<div class='solution'><h4><i class='fas fa-check-circle'></i> Решение:</h4><div class='solution-step'><strong>Ответ:</strong> a = 0 или a > 4</div></div>"
                }
            ]
        };
        
        const initialData = {
            users: [],
            completedTasks: {},
            userAccess: {},
            adminExamples: { 13: [], 15: [], 18: [] },
            adminPractice: defaultTasks, // ← ВАЖНО: добавляем дефолтные задания!
            adminTheory: { 
                13: '<div class="theory-section"><h4>Теория по уравнениям</h4><p>Основные методы решения уравнений...</p></div>',
                15: '<div class="theory-section"><h4>Теория по неравенствам</h4><p>Метод интервалов...</p></div>',
                18: '<div class="theory-section"><h4>Теория по параметрам</h4><p>Графический метод...</p></div>'
            },
            adminAlgorithm: {
                13: '<div class="algorithm-steps"><div class="step"><div class="step-number">1</div><div class="step-content"><strong>Определите тип уравнения</strong></div></div></div>',
                15: '<div class="algorithm-steps"><div class="step"><div class="step-number">1</div><div class="step-content"><strong>Найдите ОДЗ</strong></div></div></div>',
                18: '<div class="algorithm-steps"><div class="step"><div class="step-number">1</div><div class="step-content"><strong>Проанализируйте условие</strong></div></div></div>'
            },
            testQuestions: [],
            userMistakes: [],
            sharedMistakes: [],
            ownerEmail: null
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Создан новый database.json с дефолтными заданиями');
    }
}

function loadData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return null;
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

initDatabase();

// ============ API ENDPOINTS ============

// ГЛАВНЫЙ ЭНДПОИНТ - возвращает все данные для сайта
app.get('/api/admin-data', (req, res) => {
    const data = loadData();
    if (!data) {
        return res.status(500).json({ error: 'Не удалось загрузить данные' });
    }
    res.json({
        adminExamples: data.adminExamples,
        adminPractice: data.adminPractice,
        adminTheory: data.adminTheory,
        adminAlgorithm: data.adminAlgorithm,
        testQuestions: data.testQuestions
    });
});

// Регистрация
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

// Вход
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

// Получить выполненные задания
app.get('/api/completed/:email', (req, res) => {
    const { email } = req.params;
    const data = loadData();
    res.json({ completed: data.completedTasks[email] || [] });
});

// Отметить задание выполненным
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

// Сохранить примеры
app.post('/api/save-examples', (req, res) => {
    const { email, taskNumber, examples } = req.body;
    const data = loadData();
    data.adminExamples[taskNumber] = examples;
    saveData(data);
    res.json({ success: true });
});

// Сохранить практические задания
app.post('/api/save-practice', (req, res) => {
    const { email, taskNumber, practice } = req.body;
    const data = loadData();
    data.adminPractice[taskNumber] = practice;
    saveData(data);
    res.json({ success: true });
});

// Сохранить теорию
app.post('/api/save-theory', (req, res) => {
    const { email, taskNumber, type, content } = req.body;
    const data = loadData();
    if (type === 'theory') {
        data.adminTheory[taskNumber] = content;
    } else {
        data.adminAlgorithm[taskNumber] = content;
    }
    saveData(data);
    res.json({ success: true });
});

// Сохранить тестовые вопросы
app.post('/api/save-test-questions', (req, res) => {
    const { email, questions } = req.body;
    const data = loadData();
    data.testQuestions = questions;
    saveData(data);
    res.json({ success: true });
});

// Получить ошибки
app.get('/api/mistakes', (req, res) => {
    const data = loadData();
    res.json({
        userMistakes: data.userMistakes || [],
        sharedMistakes: data.sharedMistakes || []
    });
});

// Сохранить ошибки
app.post('/api/save-mistakes', (req, res) => {
    const { userMistakes, sharedMistakes } = req.body;
    const data = loadData();
    if (userMistakes !== undefined) data.userMistakes = userMistakes;
    if (sharedMistakes !== undefined) data.sharedMistakes = sharedMistakes;
    saveData(data);
    res.json({ success: true });
});

// Получить пользователей
app.get('/api/users', (req, res) => {
    const data = loadData();
    res.json({ users: data.users });
});

// Добавить ученика
app.post('/api/add-student', (req, res) => {
    const { teacherEmail, studentEmail, studentName, password } = req.body;
    const data = loadData();
    
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

// Выдать доступ
app.post('/api/grant-access', (req, res) => {
    const { teacherEmail, studentEmail, taskId } = req.body;
    const data = loadData();
    
    if (!data.userAccess[studentEmail]) {
        data.userAccess[studentEmail] = { canAccess: [], teacherEmail: teacherEmail };
    }
    
    if (!data.userAccess[studentEmail].canAccess.includes(taskId)) {
        data.userAccess[studentEmail].canAccess.push(taskId);
        saveData(data);
    }
    
    res.json({ success: true });
});

// Забрать доступ
app.post('/api/revoke-access', (req, res) => {
    const { teacherEmail, studentEmail, taskId } = req.body;
    const data = loadData();
    
    if (data.userAccess[studentEmail]) {
        const index = data.userAccess[studentEmail].canAccess.indexOf(taskId);
        if (index > -1) {
            data.userAccess[studentEmail].canAccess.splice(index, 1);
            saveData(data);
        }
    }
    
    res.json({ success: true });
});

// Получить задания ученика
app.get('/api/my-tasks/:email', (req, res) => {
    const { email } = req.params;
    const data = loadData();
    const access = data.userAccess[email] || { canAccess: [] };
    res.json({ tasks: access.canAccess });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`📁 Файл данных: ${DATA_FILE}`);
});

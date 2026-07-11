import { Router } from 'express';
import { pool } from '../db';
import {
    createTest,
    getTests,
    getTestWithQuestions,
    saveTestResult,
    getStudentResults,
    getTestStatistics,
    getStudentAttempts
} from '../db/testQueries';

const router = Router();

router.post('/create', async (req, res) => {
    const { title, description, createdBy, questions } = req.body;
    
    console.log(`Создание теста: "${title}" пользователем ${createdBy}`);
    
    if (!title || !createdBy || !questions || questions.length === 0) {
        return res.status(400).json({ error: 'Название, создатель и вопросы обязательны' });
    }
    
    try {
        const userCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [createdBy]
        );
        
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return res.status(403).json({ error: 'Только преподаватель может создавать тесты' });
        }
        
        const test = await createTest(title, description, createdBy, questions);
        if (!test) {
            return res.status(500).json({ error: 'Ошибка создания теста' });
        }
        console.log(`Тест создан: id=${test.id}`);
        res.status(201).json(test);
    } catch (err) {
        console.error('Ошибка создания теста:', err);
        res.status(500).json({ error: 'Ошибка создания теста' });
    }
});

router.get('/', async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    try {
        const tests = await getTests(includeInactive);
        res.json(tests);
    } catch (err) {
        console.error('Ошибка получения тестов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:testId', async (req, res) => {
    const testId = parseInt(req.params.testId);
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    
    if (isNaN(testId) || testId <= 0) {
        return res.status(400).json({ error: 'Неверный ID теста' });
    }
    try {
        const test = await getTestWithQuestions(testId, userId);
        if (!test) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        res.json(test);
    } catch (err) {
        console.error('Ошибка получения теста:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:testId/submit', async (req, res) => {
    const testId = parseInt(req.params.testId);
    const { userId, answers } = req.body;
    
    if (isNaN(testId) || testId <= 0) {
        return res.status(400).json({ error: 'Неверный ID теста' });
    }
    
    if (!userId || !answers || answers.length === 0) {
        return res.status(400).json({ error: 'UserId и ответы обязательны' });
    }
    
    try {
        const userCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (userCheck.rows[0].role === 'teacher') {
            return res.status(403).json({ error: 'Преподаватели не могут проходить тесты' });
        }
        
        const result = await saveTestResult(testId, userId, answers);
        if (!result) {
            return res.status(400).json({ error: 'Тест уже пройден или произошла ошибка' });
        }
        res.json(result);
    } catch (err) {
        console.error('Ошибка сохранения результатов:', err);
        res.status(500).json({ error: 'Ошибка сохранения результатов' });
    }
});

router.get('/results/student/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    try {
        const results = await getStudentResults(userId);
        res.json(results);
    } catch (err) {
        console.error('Ошибка получения результатов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:testId/statistics', async (req, res) => {
    const testId = parseInt(req.params.testId);
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    
    if (isNaN(testId) || testId <= 0) {
        return res.status(400).json({ error: 'Неверный ID теста' });
    }
    
    if (!userId) {
        return res.status(400).json({ error: 'Не указан пользователь' });
    }
    
    try {
        const userCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return res.status(403).json({ error: 'Только преподаватель может просматривать статистику' });
        }
        
        const stats = await getTestStatistics(testId);
        if (!stats) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        res.json(stats);
    } catch (err) {
        console.error('Ошибка получения статистики:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:testId/attempts/:userId', async (req, res) => {
    const testId = parseInt(req.params.testId);
    const userId = parseInt(req.params.userId);
    
    if (isNaN(testId) || testId <= 0 || isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    try {
        const attempts = await getStudentAttempts(testId, userId);
        res.json(attempts);
    } catch (err) {
        console.error('Ошибка получения попыток:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:testId/reset/:userId', async (req, res) => {
    const testId = parseInt(req.params.testId);
    const userId = parseInt(req.params.userId);
    const { teacherId } = req.body;
    
    if (isNaN(testId) || testId <= 0 || isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    try {
        const teacherCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [teacherId]
        );
        
        if (teacherCheck.rows.length === 0 || teacherCheck.rows[0].role !== 'teacher') {
            return res.status(403).json({ error: 'Только преподаватель может сбрасывать результаты' });
        }
        
        const studentCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        if (studentCheck.rows.length === 0 || studentCheck.rows[0].role === 'teacher') {
            return res.status(400).json({ error: 'Некорректный ID студента' });
        }
        
        await pool.query(
            'DELETE FROM test_results WHERE test_id = $1 AND user_id = $2',
            [testId, userId]
        );
        
        res.json({ message: 'Результаты сброшены' });
    } catch (err) {
        console.error('Ошибка сброса результатов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


export default router;
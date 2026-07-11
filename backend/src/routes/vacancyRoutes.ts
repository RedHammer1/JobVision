import { Router } from 'express';
import { pool } from '../db';
import {
    getVacanciesPaginated,
    getVacancyById,
    searchVacanciesPaginated,
    getVacanciesByCity
} from '../db/vacancyQueries';

const router = Router();

router.get('/requirements', async (req, res) => {
    console.log('[GET] /api/vacancies/requirements - Запрос на получение требований');
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT v.id, v.title, v.salary, v.url, v.city,
                        tvr.test_id, t.title as test_title
                 FROM vacancies v
                 LEFT JOIN test_vacancy_requirements tvr ON v.id = tvr.vacancy_id
                 LEFT JOIN tests t ON t.id = tvr.test_id
                 ORDER BY v.id`
            );
            console.log(`Найдено ${result.rows.length} вакансий с требованиями`);
            res.json(result.rows);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Ошибка получения вакансий с требованиями:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


router.post('/requirements', async (req, res) => {
    const { testId, vacancyId, teacherId } = req.body;

    console.log(`📝 [POST] /api/vacancies/requirements - Добавление требования: тест ${testId} -> вакансия ${vacancyId}, преподаватель ${teacherId}`);

    if (!testId || !vacancyId || !teacherId) {
        return res.status(400).json({ error: 'testId, vacancyId и teacherId обязательны' });
    }

    try {
        const client = await pool.connect();
        try {
            const userCheck = await client.query(
                'SELECT role FROM users WHERE id = $1',
                [teacherId]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            if (userCheck.rows[0].role !== 'teacher') {
                return res.status(403).json({ error: 'Только преподаватель может добавлять требования' });
            }

            const vacancyCheck = await client.query(
                'SELECT id FROM vacancies WHERE id = $1',
                [vacancyId]
            );
            if (vacancyCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Вакансия не найдена' });
            }

            const testCheck = await client.query(
                'SELECT id, title FROM tests WHERE id = $1 AND is_active = true',
                [testId]
            );
            if (testCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Тест не найден или неактивен' });
            }

            await client.query(
                `INSERT INTO test_vacancy_requirements (test_id, vacancy_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (test_id, vacancy_id) DO UPDATE 
                 SET test_id = EXCLUDED.test_id`,
                [testId, vacancyId]
            );

            console.log(`Требование добавлено: тест "${testCheck.rows[0].title}" -> вакансия ${vacancyId}`);
            res.json({
                message: 'Требование добавлено',
                testId,
                vacancyId,
                testTitle: testCheck.rows[0].title
            });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Ошибка добавления требования:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/requirements/:vacancyId', async (req, res) => {
    const vacancyId = req.params.vacancyId;
    const { teacherId } = req.body;

    console.log(`🗑️ [DELETE] /api/vacancies/requirements/${vacancyId} - Удаление требования, преподаватель ${teacherId}`);

    if (!teacherId) {
        return res.status(400).json({ error: 'teacherId обязателен' });
    }

    try {
        const client = await pool.connect();
        try {
            const userCheck = await client.query(
                'SELECT role FROM users WHERE id = $1',
                [teacherId]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            if (userCheck.rows[0].role !== 'teacher') {
                return res.status(403).json({ error: 'Только преподаватель может удалять требования' });
            }

            const result = await client.query(
                'DELETE FROM test_vacancy_requirements WHERE vacancy_id = $1',
                [vacancyId]
            );

            if ((result.rowCount || 0) === 0) {
                return res.status(404).json({ error: 'Требование не найдено' });
            }

            console.log(`Требование удалено для вакансии ${vacancyId}`);
            res.json({ message: 'Требование удалено', vacancyId });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Ошибка удаления требования:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/requirements/:vacancyId', async (req, res) => {
    const vacancyId = req.params.vacancyId;
    const { testId, teacherId } = req.body;

    console.log(`🔄 PUT /requirements/${vacancyId}: testId=${testId}, teacherId=${teacherId}`);

    if (!teacherId) {
        return res.status(400).json({ error: 'teacherId обязателен' });
    }

    try {
        const client = await pool.connect();
        try {
            const userCheck = await client.query(
                'SELECT role FROM users WHERE id = $1',
                [teacherId]
            );
            if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
                return res.status(403).json({ error: 'Только преподаватель' });
            }

            const vacancyCheck = await client.query(
                'SELECT id FROM vacancies WHERE id = $1',
                [vacancyId]
            );
            if (vacancyCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Вакансия не найдена' });
            }

            if (testId) {
                const testCheck = await client.query(
                    'SELECT id, title FROM tests WHERE id = $1 AND is_active = true',
                    [testId]
                );
                if (testCheck.rows.length === 0) {
                    return res.status(404).json({ error: 'Тест не найден или неактивен' });
                }
            }

            if (testId) {
                await client.query(
                    `INSERT INTO test_vacancy_requirements (test_id, vacancy_id) 
                     VALUES ($1, $2) 
                     ON CONFLICT (test_id, vacancy_id) DO UPDATE 
                     SET test_id = EXCLUDED.test_id`,
                    [testId, vacancyId]
                );
            } else {
                await client.query(
                    'DELETE FROM test_vacancy_requirements WHERE vacancy_id = $1',
                    [vacancyId]
                );
            }

            await client.query(
                'UPDATE messages SET required_test_id = $1 WHERE vacancy_id = $2',
                [testId || null, vacancyId]
            );

            await client.query('COMMIT');

            const io = req.app.get('io');
            if (io) {
                io.emit('vacancy_requirement_updated', {
                    vacancyId,
                    testId: testId || null,
                    timestamp: new Date()
                });
            }

            res.json({
                message: testId ? 'Требование обновлено' : 'Требование удалено',
                vacancyId,
                testId: testId || null
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Ошибка обновления требования:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


router.get('/', async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    console.log(`Загрузка вакансий: page=${page}, limit=${limit}`);

    try {
        const result = await getVacanciesPaginated(limit, offset);

        const response = {
            data: result.rows,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        };

        console.log(`Загружено: ${result.rows.length} из ${result.total}`);
        res.json(response);
    } catch (err) {
        console.error('Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/search', async (req, res) => {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    console.log(`Поиск: query="${query}", page=${page}, limit=${limit}`);

    if (!query || query.trim().length < 2) {
        return res.json({
            data: [],
            pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0,
                search: query || ''
            }
        });
    }

    try {
        const result = await searchVacanciesPaginated(query.trim(), limit, offset);

        const response = {
            data: result.rows,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
                search: query.trim()
            }
        };

        console.log(`Найдено: ${result.rows.length} из ${result.total}`);
        res.json(response);
    } catch (err) {
        console.error('Ошибка поиска:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const vacancy = await getVacancyById(req.params.id);
        if (!vacancy) {
            return res.status(404).json({ error: 'Вакансия не найдена' });
        }
        res.json(vacancy);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/city/:city', async (req, res) => {
    try {
        const vacancies = await getVacanciesByCity(req.params.city);
        res.json(vacancies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});




export default router;
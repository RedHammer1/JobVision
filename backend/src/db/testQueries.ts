import { pool } from './index';

export interface Test {
    id: number;
    title: string;
    description: string | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
}

export interface TestQuestion {
    id: number;
    test_id: number;
    question_text: string;
    question_type: 'single' | 'multiple' | 'exclude';
    points: number;
    sort_order: number;
    options?: TestOption[];
}

export interface TestOption {
    id: number;
    question_id: number;
    option_text: string;
    is_correct: boolean;
    sort_order: number;
}

export interface TestResult {
    id: number;
    test_id: number;
    user_id: number;
    score: number;
    max_score: number;
    passed: boolean;
    started_at: Date;
    completed_at: Date | null;
}

export async function createTest(
    title: string,
    description: string | null,
    createdBy: number,
    questions: Omit<TestQuestion, 'id' | 'test_id'>[]
): Promise<Test | null> {
    const client = await pool.connect();
    try {
        const userCheck = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [createdBy]
        );
        
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return null;
        }

        await client.query('BEGIN');

        const testResult = await client.query(
            `INSERT INTO tests (title, description, created_by) 
             VALUES ($1, $2, $3) RETURNING *`,
            [title, description, createdBy]
        );
        const test = testResult.rows[0];

        for (const q of questions) {
            const questionResult = await client.query(
                `INSERT INTO test_questions (test_id, question_text, question_type, points, sort_order) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [test.id, q.question_text, q.question_type, q.points || 1, q.sort_order || 0]
            );
            const question = questionResult.rows[0];

            if (q.options && q.options.length > 0) {
                for (const opt of q.options) {
                    await client.query(
                        `INSERT INTO test_options (question_id, option_text, is_correct, sort_order) 
                         VALUES ($1, $2, $3, $4)`,
                        [question.id, opt.option_text, opt.is_correct, opt.sort_order || 0]
                    );
                }
            }
        }

        await client.query('COMMIT');
        return test;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка создания теста:', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getTests(includeInactive: boolean = false): Promise<Test[]> {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM tests';
        if (!includeInactive) {
            query += ' WHERE is_active = true';
        }
        query += ' ORDER BY created_at DESC';
        
        const result = await client.query(query);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function saveTestResult(
    testId: number,
    userId: number,
    answers: { question_id: number; option_ids: number[] }[]
): Promise<TestResult | null> {
    const client = await pool.connect();
    try {
        const userCheck = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0) {
            return null;
        }
        
        if (userCheck.rows[0].role === 'teacher') {
            console.log('Преподаватель не может проходить тесты');
            return null;
        }

        await client.query('BEGIN');

        const existingResult = await client.query(
            'SELECT * FROM test_results WHERE test_id = $1 AND user_id = $2 AND passed = true',
            [testId, userId]
        );

        if (existingResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const incompleteResult = await client.query(
            'SELECT * FROM test_results WHERE test_id = $1 AND user_id = $2 AND passed = false AND completed_at IS NULL',
            [testId, userId]
        );

        let testResult;
        let isNew = false;

        if (incompleteResult.rows.length > 0) {
            testResult = incompleteResult.rows[0];
            await client.query(
                'DELETE FROM test_answers WHERE result_id = $1',
                [testResult.id]
            );
        } else {
            const result = await client.query(
                `INSERT INTO test_results (test_id, user_id, started_at) 
                 VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *`,
                [testId, userId]
            );
            testResult = result.rows[0];
            isNew = true;
        }

        const questions = await client.query(
            'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY sort_order, id',
            [testId]
        );

        let totalScore = 0;
        let maxScore = 0;

        for (const q of questions.rows) {
            const points = q.points || 1;
            maxScore += points;
            
            const userAnswer = answers.find(a => a.question_id === q.id);
            if (!userAnswer || userAnswer.option_ids.length === 0) {
                continue;
            }

            const correctOptions = await client.query(
                'SELECT id FROM test_options WHERE question_id = $1 AND is_correct = true ORDER BY id',
                [q.id]
            );
            const correctIds = correctOptions.rows.map(row => row.id);
            
            let isCorrect = false;
            
            if (q.question_type === 'single') {
                isCorrect = userAnswer.option_ids.length === 1 && 
                           correctIds.length === 1 && 
                           userAnswer.option_ids[0] === correctIds[0];
            } else if (q.question_type === 'multiple') {
                const sortedUser = [...userAnswer.option_ids].sort();
                const sortedCorrect = [...correctIds].sort();
                isCorrect = sortedUser.length === sortedCorrect.length && 
                           sortedUser.every((val, idx) => val === sortedCorrect[idx]);
            } else if (q.question_type === 'exclude') {
                const incorrectOptions = await client.query(
                    'SELECT id FROM test_options WHERE question_id = $1 AND is_correct = false ORDER BY id',
                    [q.id]
                );
                const incorrectIds = incorrectOptions.rows.map(row => row.id);
                const sortedUser = [...userAnswer.option_ids].sort();
                const sortedIncorrect = [...incorrectIds].sort();
                isCorrect = sortedUser.length === sortedIncorrect.length && 
                           sortedUser.every((val, idx) => val === sortedIncorrect[idx]);
            }

            if (isCorrect) {
                totalScore += points;
            }

            for (const optionId of userAnswer.option_ids) {
                await client.query(
                    `INSERT INTO test_answers (result_id, question_id, option_id, is_correct) 
                     VALUES ($1, $2, $3, $4)`,
                    [testResult.id, q.id, optionId, isCorrect]
                );
            }
        }

        const passed = totalScore >= maxScore * 0.6;
        
        const updatedResult = await client.query(
            `UPDATE test_results 
             SET score = $1, max_score = $2, passed = $3, completed_at = CURRENT_TIMESTAMP 
             WHERE id = $4
             RETURNING *`,
            [totalScore, maxScore, passed, testResult.id]
        );

        await client.query('COMMIT');

        return {
            ...updatedResult.rows[0],
            score: totalScore,
            max_score: maxScore,
            passed
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка сохранения результатов:', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getStudentResults(userId: number): Promise<any[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT tr.*, t.title, t.description, u.name as teacher_name
             FROM test_results tr
             JOIN tests t ON tr.test_id = t.id
             LEFT JOIN users u ON t.created_by = u.id
             WHERE tr.user_id = $1 AND tr.passed = true
             ORDER BY tr.completed_at DESC NULLS LAST`,
            [userId]
        );
        return result.rows;
    } catch (err) {
        console.error('Ошибка получения результатов:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function getTestStatistics(testId: number): Promise<any> {
    const client = await pool.connect();
    try {
        const statsResult = await client.query(
            `SELECT 
                COUNT(*) as total_attempts,
                COUNT(DISTINCT user_id) as total_students,
                AVG(score) as avg_score,
                MAX(score) as max_score,
                MIN(score) as min_score,
                SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_count,
                SUM(CASE WHEN NOT passed AND completed_at IS NOT NULL THEN 1 ELSE 0 END) as failed_count
             FROM test_results
             WHERE test_id = $1 AND completed_at IS NOT NULL`,
            [testId]
        );

        const detailsResult = await client.query(
            `SELECT DISTINCT ON (tr.user_id) 
                u.name, u.tag, tr.score, tr.max_score, tr.passed, tr.completed_at,
                tr.id as result_id
             FROM test_results tr
             JOIN users u ON tr.user_id = u.id
             WHERE tr.test_id = $1 AND tr.completed_at IS NOT NULL
             ORDER BY tr.user_id, tr.completed_at DESC`,
            [testId]
        );
        
        return {
            statistics: statsResult.rows[0],
            details: detailsResult.rows
        };
    } catch (err) {
        console.error('Ошибка получения статистики:', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getStudentAttempts(testId: number, userId: number): Promise<any[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT * FROM test_results 
             WHERE test_id = $1 AND user_id = $2
             ORDER BY started_at DESC`,
            [testId, userId]
        );
        return result.rows;
    } catch (err) {
        console.error('Ошибка получения попыток:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function getTestWithQuestions(testId: number, userId?: number): Promise<any | null> {
    const client = await pool.connect();
    try {
        const testResult = await client.query(
            'SELECT * FROM tests WHERE id = $1 AND is_active = true',
            [testId]
        );
        
        if (testResult.rows.length === 0) return null;
        const test = testResult.rows[0];

        if (!userId) {
            return test;
        }

        const userCheck = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        const isTeacher = userCheck.rows[0]?.role === 'teacher';

        if (isTeacher) {
            const statsResult = await client.query(
                `SELECT 
                    COUNT(*) as total_attempts,
                    COUNT(DISTINCT user_id) as total_students,
                    AVG(score) as avg_score,
                    SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_count
                 FROM test_results
                 WHERE test_id = $1 AND completed_at IS NOT NULL`,
                [testId]
            );
            
            return {
                ...test,
                is_teacher: true,
                statistics: statsResult.rows[0],
                can_take: false
            };
        }

        const passedResult = await client.query(
            'SELECT * FROM test_results WHERE test_id = $1 AND user_id = $2 AND passed = true',
            [testId, userId]
        );
        
        if (passedResult.rows.length > 0) {
            return {
                ...test,
                is_completed: true,
                result: passedResult.rows[0],
                can_take: false
            };
        }

        const incompleteResult = await client.query(
            'SELECT * FROM test_results WHERE test_id = $1 AND user_id = $2 AND completed_at IS NULL',
            [testId, userId]
        );

        const questionsResult = await client.query(
            `SELECT * FROM test_questions 
             WHERE test_id = $1 
             ORDER BY sort_order, id`,
            [testId]
        );

        const questions = [];
        
        for (const q of questionsResult.rows) {
            const optionsResult = await client.query(
                `SELECT id, option_text, sort_order 
                 FROM test_options 
                 WHERE question_id = $1 
                 ORDER BY sort_order, id`,
                [q.id]
            );
            
            questions.push({
                ...q,
                options: optionsResult.rows.map(opt => ({
                    ...opt,
                    is_correct: false
                }))
            });
        }

        return {
            ...test,
            questions,
            can_take: true,
            has_incomplete: incompleteResult.rows.length > 0
        };
    } finally {
        client.release();
    }
}

export async function checkStudentTestPassed(
    userId: number,
    vacancyId: string
): Promise<{ passed: boolean; testId?: number; testTitle?: string }> {
    const client = await pool.connect();
    try {
        const userCheck = await client.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows[0]?.role === 'teacher') {
            return { passed: true };
        }

        const requirementResult = await client.query(
            `SELECT tvr.test_id, t.title 
             FROM test_vacancy_requirements tvr
             JOIN tests t ON t.id = tvr.test_id
             WHERE tvr.vacancy_id = $1 AND t.is_active = true`,
            [vacancyId]
        );
        
        if (requirementResult.rows.length === 0) {
            return { passed: true };
        }
        
        const requirement = requirementResult.rows[0];
        const testId = requirement.test_id;
        const testTitle = requirement.title;
        
        const resultCheck = await client.query(
            `SELECT * FROM test_results 
             WHERE test_id = $1 AND user_id = $2 AND passed = true`,
            [testId, userId]
        );
        
        if (resultCheck.rows.length > 0) {
            return { passed: true, testId, testTitle };
        }
        
        return { passed: false, testId, testTitle };
    } finally {
        client.release();
    }
}



export async function addVacancyRequirement(
    testId: number,
    vacancyId: string
): Promise<boolean> {
    const client = await pool.connect();
    try {
        const vacancyCheck = await client.query(
            'SELECT id FROM vacancies WHERE id = $1',
            [vacancyId]
        );
        if (vacancyCheck.rows.length === 0) {
            console.log(`Вакансия ${vacancyId} не найдена`);
            return false;
        }
        
        const testCheck = await client.query(
            'SELECT id FROM tests WHERE id = $1 AND is_active = true',
            [testId]
        );
        if (testCheck.rows.length === 0) {
            console.log(`Тест ${testId} не найден или неактивен`);
            return false;
        }
        
        await client.query(
            `INSERT INTO test_vacancy_requirements (test_id, vacancy_id) 
             VALUES ($1, $2) 
             ON CONFLICT (test_id, vacancy_id) DO UPDATE 
             SET test_id = EXCLUDED.test_id`,
            [testId, vacancyId]
        );
        
        console.log(`Требование добавлено: тест ${testId} -> вакансия ${vacancyId}`);
        return true;
    } catch (err) {
        console.error('Ошибка добавления требования:', err);
        return false;
    } finally {
        client.release();
    }
}


export async function removeVacancyRequirement(
    vacancyId: string
): Promise<boolean> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'DELETE FROM test_vacancy_requirements WHERE vacancy_id = $1',
            [vacancyId]
        );
        
        const deleted = (result.rowCount || 0) > 0;
        if (deleted) {
            console.log(`Требование удалено для вакансии ${vacancyId}`);
        } else {
            console.log(`Требование для вакансии ${vacancyId} не найдено`);
        }
        return deleted;
    } catch (err) {
        console.error('Ошибка удаления требования:', err);
        return false;
    } finally {
        client.release();
    }
}

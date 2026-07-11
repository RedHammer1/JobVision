import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CreateTestModal from '../components/Tests/CreateTestModal';
import TakeTestModal from '../components/Tests/TakeTestModal';
import Layout from '../components/Layout/Layout';
import './Page.css';

const API_URL = 'http://localhost:8080/api';

const TestsPage: React.FC = () => {
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTakeModal, setShowTakeModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);

    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        loadTests();
        if (user && !isTeacher) {
            loadResults();
        }
    }, [user]);

    const loadTests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tests`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error('Ошибка загрузки тестов');
            const data = await response.json();
            setTests(data);
        } catch (err) {
            console.error('Ошибка:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadResults = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tests/results/student/${user.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error('Ошибка загрузки результатов');
            const data = await response.json();
            setResults(data);
        } catch (err) {
            console.error('Ошибка:', err);
        }
    };

    const handleCreateTest = async (testData: any) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tests/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(testData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка создания');
            }
            
            alert('Тест успешно создан!');
            await loadTests();
        } catch (err) {
            console.error('Ошибка:', err);
            alert('Не удалось создать тест');
        }
    };

    const handleTakeTest = async (testId: number, userId: number, answers: any[]) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tests/${testId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ userId, answers })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка отправки');
            }
            
            const result = await response.json();
            
            const score = result.score || 0;
            const maxScore = result.max_score || 0;
            const passed = result.passed || false;
            
            alert(`Тест завершен!\nРезультат: ${score} из ${maxScore} баллов (${passed ? 'Пройдено' : 'Не пройдено'})`);
            await loadResults();
            await loadTests();
        } catch (err) {
            console.error('Ошибка:', err);
            alert(`Не удалось отправить ответы: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
        }
    };

    const handleOpenTest = async (testId: number) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tests/${testId}?userId=${user?.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error('Ошибка загрузки теста');
            const data = await response.json();
            
            if (data.can_take === false) {
                if (data.is_teacher) {
                    alert('Преподаватели не могут проходить тесты. Вы можете просматривать статистику.');
                } else if (data.is_completed) {
                    alert(`Вы уже прошли этот тест!\nРезультат: ${data.result?.score || 0} из ${data.result?.max_score || 0} баллов`);
                } else {
                    alert('Этот тест недоступен для прохождения');
                }
                return;
            }
            
            setSelectedTest(data);
            setShowTakeModal(true);
        } catch (err) {
            console.error('Ошибка:', err);
            alert('Не удалось загрузить тест');
        }
    };

    const isTestPassed = (testId: number): boolean => {
        return results.some(r => r.test_id === testId && r.passed === true);
    };

    const getTestResult = (testId: number) => {
        return results.find(r => r.test_id === testId && r.passed === true);
    };

    const pageContent = (
        <div className="page tests-page">
            <div className="vacancies-page__header">
                <h1 className="page__title">Тесты</h1>
                {isTeacher && (
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        Создать тест
                    </button>
                )}
            </div>
            <p className="page__description">
                {isTeacher 
                    ? 'Создавайте и управляйте тестами для студентов. Преподаватели не могут проходить тесты.'
                    : 'Проходите тесты и проверяйте свои знания'
                }
            </p>

            {loading ? (
                <div className="loading-spinner">Загрузка...</div>
            ) : (
                <div className="vacancies-list">
                    {tests.length === 0 ? (
                        <div className="vacancies-empty">
                            <div className="empty-icon">📝</div>
                            <h3>Тестов пока нет</h3>
                            <p>
                                {isTeacher 
                                    ? 'Создайте первый тест для студентов'
                                    : 'Преподаватель еще не создал тесты'
                                }
                            </p>
                        </div>
                    ) : (
                        tests.map((test: any) => {
                            const passed = isTestPassed(test.id);
                            const result = getTestResult(test.id);
                            
                            return (
                                <div key={test.id} className="vacancy-card">
                                    <div className="vacancy-card__header">
                                        <h3 className="vacancy-card__title">{test.title}</h3>
                                        {isTeacher ? (
                                            <span className="status-badge status-badge--offline">Для студентов</span>
                                        ) : passed ? (
                                            <span className="status-badge status-badge--online">Пройден</span>
                                        ) : (
                                            <span className="status-badge status-badge--offline">Не пройден</span>
                                        )}
                                    </div>
                                    <div className="vacancy-card__details">
                                        <div className="vacancy-card__detail">
                                            <span className="vacancy-card__icon">📋</span>
                                            <span className="vacancy-card__text">
                                                {test.description || 'Описание отсутствует'}
                                            </span>
                                        </div>
                                        <div className="vacancy-card__detail">
                                            <span className="vacancy-card__icon">📅</span>
                                            <span className="vacancy-card__text">
                                                {new Date(test.created_at).toLocaleDateString('ru-RU')}
                                            </span>
                                        </div>
                                        {result && (
                                            <div className="vacancy-card__detail">
                                                <span className="vacancy-card__icon">📊</span>
                                                <span className="vacancy-card__text">
                                                    {result.score} / {result.max_score} баллов
                                                </span>
                                            </div>
                                        )}
                                        {isTeacher && (
                                            <div className="vacancy-card__detail">
                                                <span className="vacancy-card__icon">👥</span>
                                                <span className="vacancy-card__text">
                                                    Статистика доступна
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="vacancy-card__footer">
                                        {isTeacher ? (
                                            <span className="test-teacher-info">
                                                Только для студентов
                                            </span>
                                        ) : !passed ? (
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => handleOpenTest(test.id)}
                                            >
                                                Пройти тест
                                            </button>
                                        ) : (
                                            <span className="test-result-passed">
                                                Пройден с результатом {result?.score || 0} / {result?.max_score || 0}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            <CreateTestModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreateTest={handleCreateTest}
                userId={user?.id || 0}
            />

            <TakeTestModal
                isOpen={showTakeModal}
                onClose={() => {
                    setShowTakeModal(false);
                    setSelectedTest(null);
                }}
                test={selectedTest}
                userId={user?.id || 0}
                onSubmit={handleTakeTest}
            />
        </div>
    );

    return (
        <Layout>
            {pageContent}
        </Layout>
    );
};

export default TestsPage;
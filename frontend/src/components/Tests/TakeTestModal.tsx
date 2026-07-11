import React, { useState, useEffect } from 'react';
import './TestStyles.css';

interface TakeTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    test: any;
    userId: number;
    onSubmit: (testId: number, userId: number, answers: any[]) => Promise<void>;
}

const TakeTestModal: React.FC<TakeTestModalProps> = ({
    isOpen,
    onClose,
    test,
    userId,
    onSubmit
}) => {
    const [answers, setAnswers] = useState<{ [key: number]: number[] }>({});
    const [submitting, setSubmitting] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    useEffect(() => {
        if (isOpen && test) {
            if (test.is_teacher) {
                alert('Преподаватели не могут проходить тесты');
                onClose();
                return;
            }
            
            if (test.is_completed) {
                alert(`Вы уже прошли этот тест!\nРезультат: ${test.result?.score || 0} из ${test.result?.max_score || 0} баллов`);
                onClose();
                return;
            }
            
            if (!test.can_take) {
                alert('Этот тест недоступен для прохождения');
                onClose();
                return;
            }
            
            const initialAnswers: { [key: number]: number[] } = {};
            test.questions?.forEach((q: any) => {
                initialAnswers[q.id] = [];
            });
            setAnswers(initialAnswers);
            setCurrentQuestionIndex(0);
        }
    }, [isOpen, test, onClose]);

    if (!isOpen || !test) return null;
    
    if (!test.questions || test.questions.length === 0) {
        return null;
    }

    const questions = test.questions || [];
    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswer = (questionId: number, optionId: number) => {
        const question = questions.find((q: any) => q.id === questionId);
        if (!question) return;

        let currentAnswers = [...(answers[questionId] || [])];

        if (question.question_type === 'single') {
            currentAnswers = [optionId];
        } else {
            const index = currentAnswers.indexOf(optionId);
            if (index > -1) {
                currentAnswers.splice(index, 1);
            } else {
                currentAnswers.push(optionId);
            }
        }

        setAnswers({
            ...answers,
            [questionId]: currentAnswers
        });
    };

    const isAnswerSelected = (questionId: number, optionId: number): boolean => {
        return (answers[questionId] || []).includes(optionId);
    };

    const goToNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const goToPrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleSubmit = async () => {
        const allAnswered = questions.every((q: any) => 
            answers[q.id] && answers[q.id].length > 0
        );

        if (!allAnswered) {
            alert('Ответьте на все вопросы перед отправкой');
            return;
        }

        if (!confirm('Вы уверены, что хотите отправить ответы?')) {
            return;
        }

        setSubmitting(true);
        try {
            const formattedAnswers = questions.map((q: any) => ({
                question_id: q.id,
                option_ids: answers[q.id] || []
            }));
            await onSubmit(test.id, userId, formattedAnswers);
            onClose();
        } catch (err) {
            console.error('Ошибка отправки:', err);
            alert('Произошла ошибка при отправке ответов');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeLabel = (type: string) => {
        switch(type) {
            case 'single': return 'Выберите один ответ';
            case 'multiple': return 'Выберите несколько ответов (1-3)';
            case 'exclude': return 'Выберите лишние варианты';
            default: return '';
        }
    };

    return (
        <div className="test-modal-overlay" onClick={onClose}>
            <div className="test-modal take-test" onClick={(e) => e.stopPropagation()}>
                <div className="test-modal-header">
                    <h3>📝 {test.title}</h3>
                    <button className="test-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="test-modal-body">
                    <div className="test-progress">
                        Вопрос {currentQuestionIndex + 1} из {questions.length}
                        <div className="test-progress-bar">
                            <div 
                                className="test-progress-fill"
                                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {currentQuestion && (
                        <div className="test-question-container">
                            <div className="test-question-text">
                                {currentQuestion.question_text}
                            </div>
                            <div className="test-question-type-badge">
                                {getTypeLabel(currentQuestion.question_type)}
                            </div>
                            <div className="test-options-list">
                                {currentQuestion.options?.map((option: any) => (
                                    <label key={option.id} className="test-option-label">
                                        <input
                                            type={currentQuestion.question_type === 'single' ? 'radio' : 'checkbox'}
                                            name={`question-${currentQuestion.id}`}
                                            checked={isAnswerSelected(currentQuestion.id, option.id)}
                                            onChange={() => handleAnswer(currentQuestion.id, option.id)}
                                        />
                                        <span>{option.option_text}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="test-navigation">
                        <button 
                            className="test-nav-btn"
                            onClick={goToPrevious}
                            disabled={currentQuestionIndex === 0}
                        >
                            ← Назад
                        </button>
                        {currentQuestionIndex === questions.length - 1 ? (
                            <button 
                                className="test-submit-btn"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Отправка...' : 'Отправить'}
                            </button>
                        ) : (
                            <button 
                                className="test-nav-btn"
                                onClick={goToNext}
                            >
                                Далее →
                            </button>
                        )}
                    </div>

                    <div className="test-mini-nav">
                        {questions.map((_: any, index: number) => (
                            <button
                                key={index}
                                className={`test-mini-dot ${index === currentQuestionIndex ? 'active' : ''} ${answers[questions[index]?.id]?.length > 0 ? 'answered' : ''}`}
                                onClick={() => setCurrentQuestionIndex(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeTestModal;
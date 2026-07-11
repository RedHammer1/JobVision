import React, { useState } from 'react';
import './TestStyles.css';

interface CreateTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateTest: (testData: any) => Promise<void>;
    userId: number;
}

const CreateTestModal: React.FC<CreateTestModalProps> = ({
    isOpen,
    onClose,
    onCreateTest,
    userId
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState({
        text: '',
        type: 'single',
        points: 1,
        options: ['', '', '', ''],
        correctAnswers: [] as number[]
    });

    if (!isOpen) return null;

    const addQuestion = () => {
        if (!currentQuestion.text.trim()) {
            alert('Введите текст вопроса');
            return;
        }
        
        const filteredOptions = currentQuestion.options.filter(opt => opt.trim());
        if (filteredOptions.length < 2) {
            alert('Добавьте минимум 2 варианта ответа');
            return;
        }

        const options = filteredOptions.map((text, index) => ({
            option_text: text,
            is_correct: currentQuestion.correctAnswers.includes(index),
            sort_order: index
        }));

        if (currentQuestion.type === 'single' && currentQuestion.correctAnswers.length !== 1) {
            alert('Для вопроса с одним ответом выберите ровно 1 правильный вариант');
            return;
        }

        if (currentQuestion.type === 'multiple') {
            if (currentQuestion.correctAnswers.length < 1 || currentQuestion.correctAnswers.length > 3) {
                alert('Для вопроса с несколькими ответами выберите от 1 до 3 правильных вариантов');
                return;
            }
        }

        if (currentQuestion.type === 'exclude') {
            const incorrectCount = filteredOptions.length - currentQuestion.correctAnswers.length;
            if (incorrectCount < 1) {
                alert('Для вопроса на исключение выберите хотя бы один неправильный вариант');
                return;
            }
        }

        const question = {
            question_text: currentQuestion.text,
            question_type: currentQuestion.type,
            points: currentQuestion.points || 1,
            sort_order: questions.length,
            options: options
        };

        setQuestions([...questions, question]);
        setCurrentQuestion({
            text: '',
            type: 'single',
            points: 1,
            options: ['', '', '', ''],
            correctAnswers: []
        });
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...currentQuestion.options];
        newOptions[index] = value;
        setCurrentQuestion({ ...currentQuestion, options: newOptions });
    };

    const toggleCorrectAnswer = (index: number) => {
        const type = currentQuestion.type;
        let newCorrect = [...currentQuestion.correctAnswers];

        if (type === 'single') {
            if (newCorrect.includes(index)) {
                newCorrect = [];
            } else {
                newCorrect = [index];
            }
        } else {
            if (newCorrect.includes(index)) {
                newCorrect = newCorrect.filter(i => i !== index);
            } else {
                if (type === 'multiple' && newCorrect.length >= 3) {
                    alert('Максимум 3 правильных ответа');
                    return;
                }
                newCorrect.push(index);
            }
        }
        
        setCurrentQuestion({ ...currentQuestion, correctAnswers: newCorrect });
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            alert('Введите название теста');
            return;
        }
        if (questions.length === 0) {
            alert('Добавьте хотя бы один вопрос');
            return;
        }

        const testData = {
            title: title.trim(),
            description: description.trim() || null,
            createdBy: userId,
            questions: questions
        };

        await onCreateTest(testData);
        setTitle('');
        setDescription('');
        setQuestions([]);
        onClose();
    };

    const getTypeLabel = (type: string) => {
        switch(type) {
            case 'single': return 'Один ответ';
            case 'multiple': return 'Несколько ответов';
            case 'exclude': return 'Исключение лишнего';
            default: return type;
        }
    };

    return (
        <div className="test-modal-overlay" onClick={onClose}>
            <div className="test-modal" onClick={(e) => e.stopPropagation()}>
                <div className="test-modal-header">
                    <h3>Создание теста</h3>
                    <button className="test-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="test-modal-body">
                    <div className="test-form-group">
                        <label>Название теста *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введите название теста"
                        />
                    </div>

                    <div className="test-form-group">
                        <label>Описание</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Введите описание теста"
                            rows={2}
                        />
                    </div>

                    <hr className="test-divider" />

                    <div className="test-form-group">
                        <label>Добавить вопрос</label>
                        <input
                            type="text"
                            value={currentQuestion.text}
                            onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                            placeholder="Текст вопроса"
                            className="test-question-input"
                        />
                    </div>

                    <div className="test-form-row">
                        <div className="test-form-group">
                            <label>Тип вопроса</label>
                            <select
                                value={currentQuestion.type}
                                onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    type: e.target.value,
                                    correctAnswers: [] 
                                })}
                            >
                                <option value="single">Один ответ</option>
                                <option value="multiple">Несколько ответов</option>
                                <option value="exclude">Исключение лишнего</option>
                            </select>
                        </div>
                        <div className="test-form-group">
                            <label>Баллы</label>
                            <input
                                type="number"
                                value={currentQuestion.points}
                                onChange={(e) => setCurrentQuestion({ 
                                    ...currentQuestion, 
                                    points: parseInt(e.target.value) || 1 
                                })}
                                min="1"
                                max="10"
                            />
                        </div>
                    </div>

                    <div className="test-form-group">
                        <label>Варианты ответов</label>
                        {currentQuestion.options.map((opt, index) => (
                            <div key={index} className="test-option-row">
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Вариант ${index + 1}`}
                                    className="test-option-input"
                                />
                                <label className="test-correct-label">
                                    <input
                                        type={currentQuestion.type === 'single' ? 'radio' : 'checkbox'}
                                        name="correct-answers"
                                        checked={currentQuestion.correctAnswers.includes(index)}
                                        onChange={() => toggleCorrectAnswer(index)}
                                    />
                                    Правильный
                                </label>
                            </div>
                        ))}
                        <div className="test-hint">
                            {currentQuestion.type === 'single' && 'Выберите 1 правильный ответ'}
                            {currentQuestion.type === 'multiple' && 'Выберите от 1 до 3 правильных ответов'}
                            {currentQuestion.type === 'exclude' && 'Выберите неправильные варианты (лишние)'}
                        </div>
                    </div>

                    <button className="test-add-question-btn" onClick={addQuestion}>
                        ➕ Добавить вопрос
                    </button>

                    {questions.length > 0 && (
                        <div className="test-questions-list">
                            <h4>Добавленные вопросы ({questions.length})</h4>
                            {questions.map((q, index) => (
                                <div key={index} className="test-question-item">
                                    <span className="test-question-number">{index + 1}.</span>
                                    <span className="test-question-text">{q.question_text}</span>
                                    <span className="test-question-type">{getTypeLabel(q.question_type)}</span>
                                    <span className="test-question-points">{q.points} балла</span>
                                    <button 
                                        className="test-remove-question"
                                        onClick={() => removeQuestion(index)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="test-modal-footer">
                    <button className="test-btn-cancel" onClick={onClose}>
                        Отмена
                    </button>
                    <button 
                        className="test-btn-create"
                        onClick={handleSubmit}
                        disabled={!title.trim() || questions.length === 0}
                    >
                        Создать тест
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTestModal;
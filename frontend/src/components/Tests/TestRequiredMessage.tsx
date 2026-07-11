import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TestRequiredMessage.css';

interface TestRequiredMessageProps {
    testId: number;
    testTitle: string;
    vacancyTitle: string;
    userId: number;
    onTakeTest?: (testId: number, testTitle: string) => void;
}

const TestRequiredMessage: React.FC<TestRequiredMessageProps> = ({
    testId,
    testTitle,
    vacancyTitle,
    userId,
    onTakeTest
}) => {
    const navigate = useNavigate();

    const handleTakeTest = () => {
        if (onTakeTest) {
            onTakeTest(testId, testTitle);
        } else {
            navigate(`/tests`);
        }
    };

    return (
        <div className="test-required-message">
            <div className="test-required-message__icon">🔒</div>
            <div className="test-required-message__content">
                <h4 className="test-required-message__title">
                    Для доступа к вакансии "{vacancyTitle}" необходимо пройти тест
                </h4>
                <p className="test-required-message__description">
                    Пройдите тест "{testTitle}", чтобы получить доступ к рекомендованной вакансии
                </p>
                <button 
                    className="test-required-message__btn"
                    onClick={handleTakeTest}
                >
                    📝 Пройти тест
                </button>
            </div>
        </div>
    );
};

export default TestRequiredMessage;
import React, { type RefObject } from 'react';
import { type Message } from '../../../api/chats';
import MessageVacancyCard from '../../MessageVacancyCard/MessageVacancyCard';
import TestRequiredMessage from '../../Tests/TestRequiredMessage';
import './MessageList.css';

interface MessageListProps {
    messages: Message[];
    typingText: string | null;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    formatTime: (dateStr: string) => string;
    userId: number;
    isTeacher?: boolean;
    onManageRequirement?: (vacancyId: string, vacancyTitle: string, messageId: number) => void;
    onTakeTest?: (testId: number, testTitle: string) => void;
    tests?: any[];
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    typingText,
    messagesEndRef,
    formatTime,
    userId,
    isTeacher = false,
    onManageRequirement,
    onTakeTest,
    tests = []
}) => {
    React.useEffect(() => {
        messages.forEach(msg => {
            if (msg.vacancy_id) {
                console.log(`📌 Рендер сообщения ${msg.id}: vacancy=${msg.vacancy_title}, requiredTestId=${msg.required_test_id}, testPassed=${msg.test_passed}, isTeacher=${isTeacher}`);
            }
        });
    }, [messages]);

    return (
        <div className="message-list">
            {messages.map(msg => {
                const hasVacancy = msg.vacancy_id && msg.vacancy_title;
                const testPassed = isTeacher ? true : (msg.test_passed || false);
                const showTestRequired = hasVacancy && !testPassed && msg.required_test_id;

                if (hasVacancy) {
                    console.log(`📌 Решение для сообщения ${msg.id}: hasVacancy=${hasVacancy}, testPassed=${testPassed}, requiredTestId=${msg.required_test_id}, showTestRequired=${showTestRequired}`);
                }

                return (
                    <div
                        key={msg.id}
                        className={`message-list__wrapper ${
                            msg.isOwn ? 'message-list__wrapper--own' : 'message-list__wrapper--other'
                        }`}
                    >
                        <div className={`message-list__message ${msg.isOwn ? 'message-list__message--own' : 'message-list__message--other'}`}>
                            {!msg.isOwn && (
                                <div className="message-list__sender">
                                    {msg.sender_name}
                                </div>
                            )}
                            <div className="message-list__text">
                                {msg.text}
                            </div>
                            
                            {hasVacancy && (
                                <>
                                    {showTestRequired ? (
                                        <TestRequiredMessage
                                            testId={msg.required_test_id || 0}
                                            testTitle={msg.test_title || 'Тест'}
                                            vacancyTitle={msg.vacancy_title || 'Вакансия'}
                                            userId={userId}
                                            onTakeTest={onTakeTest}
                                        />
                                    ) : (
                                        <MessageVacancyCard
                                            title={msg.vacancy_title || 'Вакансия'}
                                            salary={msg.salary || 'Зарплата не указана'}
                                            city={msg.city || 'Город не указан'}
                                            url={msg.url || '#'}
                                            isOwn={msg.isOwn}
                                            isRecommended={msg.is_recommended || false}
                                            recommendedBy={msg.recommended_by ? msg.sender_name : undefined}
                                            isTeacher={isTeacher}
                                            onManageRequirement={
                                                isTeacher && onManageRequirement && msg.vacancy_id && msg.vacancy_title
                                                    ? () => onManageRequirement(msg.vacancy_id!, msg.vacancy_title!, msg.id)
                                                    : undefined
                                            }
                                        />
                                    )}
                                </>
                            )}
                            
                            <div className="message-list__time">
                                {formatTime(msg.created_at)}
                            </div>
                        </div>
                    </div>
                );
            })}
            {typingText && (
                <div className="message-list__typing">
                    <span className="message-list__typing-dots">...</span>
                    {typingText}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
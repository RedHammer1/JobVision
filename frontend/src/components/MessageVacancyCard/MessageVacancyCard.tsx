import React from 'react';
import './MessageVacancyCard.css';

interface MessageVacancyCardProps {
    title: string;
    salary: string;
    city: string;
    url: string;
    isOwn?: boolean;
    isRecommended?: boolean;
    recommendedBy?: string;
    recommendedByName?: string;
    onShare?: () => void;
    isTeacher?: boolean;
    onManageRequirement?: () => void;
}

const MessageVacancyCard: React.FC<MessageVacancyCardProps> = ({
    title,
    salary,
    city,
    url,
    isOwn = false,
    isRecommended = false,
    recommendedBy,
    recommendedByName,
    onShare,
    isTeacher = false,
    onManageRequirement,
}) => {
    const displayTitle = title || 'Вакансия';
    const displaySalary = salary || 'Зарплата не указана';
    const displayCity = city || 'Город не указан';
    const displayUrl = url || '#';

    const showRecommended = isRecommended === true;

    return (
        <div className={`vacancy-card-message ${isOwn ? 'vacancy-card-message--own' : 'vacancy-card-message--other'}`}>
            {showRecommended && (
                <div className="vacancy-card-message__recommended-badge">
                    <span className="vacancy-card-message__recommended-icon">⭐</span>
                    Рекомендовано куратором
                    {recommendedBy && <span className="vacancy-card-message__recommended-by"> {recommendedBy}</span>}
                </div>
            )}

            <div className="vacancy-card-message__header">
                <h4 className="vacancy-card-message__title">{displayTitle}</h4>
            </div>

            <div className="vacancy-card-message__details">
                <div className="vacancy-card-message__detail">
                    <span className="vacancy-card-message__icon">💰</span>
                    <span className="vacancy-card-message__text">{displaySalary}</span>
                </div>
                <div className="vacancy-card-message__detail">
                    <span className="vacancy-card-message__icon">📍</span>
                    <span className="vacancy-card-message__text">{displayCity}</span>
                </div>
                <div className="vacancy-card-message__detail">
                    <span className="vacancy-card-message__icon">🔗</span>
                    {displayUrl !== '#' ? (
                        <a 
                            href={displayUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="vacancy-card-message__link"
                        >
                            Перейти к вакансии
                        </a>
                    ) : (
                        <span className="vacancy-card-message__text">Ссылка отсутствует</span>
                    )}
                </div>
            </div>

            <div className="vacancy-card-message__actions">
                {onShare && (
                    <button 
                        className="vacancy-card-message__share-btn"
                        onClick={onShare}
                    >
                        📤 Поделиться
                    </button>
                )}
                {displayUrl !== '#' && (
                    <a 
                        href={displayUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="vacancy-card-message__apply-btn"
                    >
                        Откликнуться →
                    </a>
                )}
                {isTeacher && onManageRequirement && (
                    <button 
                        className="vacancy-card-message__manage-btn"
                        onClick={onManageRequirement}
                    >
                        🔒 Управление доступом
                    </button>
                )}
            </div>
        </div>
    );
};

export default MessageVacancyCard;
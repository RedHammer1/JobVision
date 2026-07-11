import React, { useState, useEffect } from 'react';
import { type Vacancy } from '../../types/vacancy';
import { type Chat } from '../../api/chats';
import { formatVacancyMessage } from '../../utils/vacancyFormatter';
import './VacancyShareModal.css';

interface VacancyShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    vacancy: Vacancy | null;
    chats: Chat[];
    currentUserId: number;
    onShare: (chatId: number, vacancyId: string, message: string, isRecommendation: boolean) => void;
}

const VacancyShareModal: React.FC<VacancyShareModalProps> = ({
    isOpen,
    onClose,
    vacancy,
    chats,
    currentUserId,
    onShare
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [customMessage, setCustomMessage] = useState('');
    const [isRecommendation, setIsRecommendation] = useState(false);
    const [useTemplate, setUseTemplate] = useState(true);

    useEffect(() => {
        if (chats) {
            setFilteredChats(chats);
        }
    }, [chats]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSelectedChatId(null);
            setCustomMessage('');
            setIsRecommendation(false);
            setUseTemplate(true);
        }
    }, [isOpen]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredChats(chats);
        } else {
            const q = query.toLowerCase().trim();
            const filtered = chats.filter(chat => {
                const name = chat.type === 'group'
                    ? chat.name || 'Групповой чат'
                    : chat.participants?.find(p => p.id !== currentUserId)?.name || 'Пользователь';
                return name.toLowerCase().includes(q);
            });
            setFilteredChats(filtered);
        }
    };

    const getChatDisplayName = (chat: Chat): string => {
        if (chat.type === 'group') {
            return chat.name || 'Групповой чат';
        }
        const other = chat.participants?.find(p => p.id !== currentUserId);
        return other?.name || 'Пользователь';
    };

    const getChatTypeIcon = (chat: Chat): string => {
        return chat.type === 'group' ? '👥' : '💬';
    };

    const getMessageText = (): string => {
        if (!vacancy) return '';

        if (useTemplate) {
            return formatVacancyMessage({
                title: vacancy.title,
                salary: vacancy.salary,
                city: vacancy.city,
                url: vacancy.url
            });
        }

        return customMessage.trim() || `Вакансия: ${vacancy.title}`;
    };

    const handleShare = () => {
        if (!selectedChatId || !vacancy) return;
        const messageText = getMessageText();
        onShare(selectedChatId, vacancy.id, messageText, isRecommendation);
        onClose();
    };

    if (!isOpen || !vacancy) return null;

    return (
        <div className="vacancy-share-modal-overlay" onClick={onClose}>
            <div className="vacancy-share-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vacancy-share-modal-header">
                    <h3>Отправить вакансию в чат</h3>
                    <button className="vacancy-share-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="vacancy-share-modal-body">
                    <div className="vacancy-share-preview">
                        <h4>{vacancy.title}</h4>
                        <div className="vacancy-share-preview-details">
                            <span>💰 {vacancy.salary}</span>
                            <span>📍 {vacancy.city}</span>
                        </div>
                        <a href={vacancy.url} target="_blank" rel="noopener noreferrer" className="vacancy-share-preview-link">
                            🔗 {vacancy.url}
                        </a>
                    </div>

                    <div className="vacancy-share-format">
                        <label className="vacancy-share-format-label">Формат сообщения:</label>
                        <div className="vacancy-share-format-options">
                            <label className="vacancy-share-format-option">
                                <input
                                    type="radio"
                                    checked={useTemplate}
                                    onChange={() => setUseTemplate(true)}
                                />
                                <span>📋 Шаблон с эмодзи</span>
                            </label>
                            <label className="vacancy-share-format-option">
                                <input
                                    type="radio"
                                    checked={!useTemplate}
                                    onChange={() => setUseTemplate(false)}
                                />
                                <span>✏️ Своё сообщение</span>
                            </label>
                        </div>
                    </div>

                    <div className="vacancy-share-preview-message">
                        <label>Предпросмотр:</label>
                        <div className="vacancy-share-preview-text">
                            {getMessageText()}
                        </div>
                    </div>

                    {!useTemplate && (
                        <div className="vacancy-share-message">
                            <label>Ваше сообщение</label>
                            <textarea
                                className="vacancy-share-textarea"
                                placeholder="Напишите сообщение к вакансии..."
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}

                    <div className="vacancy-share-chat-select">
                        <label>Выберите чат</label>
                        <input
                            type="text"
                            className="vacancy-share-search"
                            placeholder="Поиск чатов..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <div className="vacancy-share-chat-list">
                            {filteredChats.length === 0 ? (
                                <div className="vacancy-share-empty">Чаты не найдены</div>
                            ) : (
                                filteredChats.map(chat => (
                                    <div
                                        key={chat.id}
                                        className={`vacancy-share-chat-item ${selectedChatId === chat.id ? 'vacancy-share-chat-item--selected' : ''}`}
                                        onClick={() => setSelectedChatId(chat.id)}
                                    >
                                        <span className="vacancy-share-chat-icon">
                                            {getChatTypeIcon(chat)}
                                        </span>
                                        <span className="vacancy-share-chat-name">
                                            {getChatDisplayName(chat)}
                                        </span>
                                        {chat.type === 'group' && (
                                            <span className="vacancy-share-chat-badge">Группа</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="vacancy-share-recommend">
                        <label className="vacancy-share-checkbox">
                            <input
                                type="checkbox"
                                checked={isRecommendation}
                                onChange={(e) => setIsRecommendation(e.target.checked)}
                            />
                            <span>⭐ Рекомендовать как куратор</span>
                        </label>
                        {isRecommendation && (
                            <div className="vacancy-share-recommend-hint">
                                Вакансия будет отмечена как рекомендованная куратором
                            </div>
                        )}
                    </div>
                </div>

                <div className="vacancy-share-modal-footer">
                    <button className="vacancy-share-btn-cancel" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className="vacancy-share-btn-send"
                        onClick={handleShare}
                        disabled={!selectedChatId}
                    >
                        📤 Отправить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VacancyShareModal;
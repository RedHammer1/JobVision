import React from 'react';
import { type Chat } from '../../../api/chats';
import './ChatList.css';

interface ChatListProps {
    chats: Chat[];
    selectedChatId: number | null;
    searchQuery: string;
    isMobile: boolean;
    showChatList: boolean;
    onSelectChat: (chatId: number) => void;
    onSearchChange: (query: string) => void;
    onCreatePrivateChat: () => void;
    onCreateGroup: () => void;
    getChatName: (chat: Chat) => string;
    getChatAvatar: (chat: Chat) => string;
    formatTime: (dateStr: string) => string;
}

const ChatList: React.FC<ChatListProps> = ({
    chats,
    selectedChatId,
    searchQuery,
    isMobile,
    showChatList,
    onSelectChat,
    onSearchChange,
    onCreatePrivateChat,
    onCreateGroup,
    getChatName,
    getChatAvatar,
    formatTime,
}) => {
    const isVisible = !isMobile || (isMobile && showChatList);

    if (!isVisible) return null;

    return (
        <div className="chat-list">
            <div className="chat-list__header">
                <h2>Чаты</h2>
                <div className="chat-list__actions">
                    <button
                        className="chat-list__btn-icon"
                        onClick={onCreatePrivateChat}
                        title="Новый личный чат"
                    >
                        ✉️
                    </button>
                    <button
                        className="chat-list__btn-icon"
                        onClick={onCreateGroup}
                        title="Создать группу"
                    >
                        ➕
                    </button>
                </div>
            </div>

            <div className="chat-list__search">
                <input
                    type="text"
                    className="chat-list__search-input"
                    placeholder="Поиск чатов..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <div className="chat-list__items">
                {chats.length === 0 ? (
                    <div className="chat-list__empty">
                        {searchQuery ? 'Чаты не найдены' : 'Нет чатов'}
                    </div>
                ) : (
                    chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-list__item ${selectedChatId === chat.id ? 'chat-list__item--active' : ''}`}
                            onClick={() => onSelectChat(chat.id)}
                        >
                            <div className="chat-list__avatar">
                                {getChatAvatar(chat)}
                            </div>
                            <div className="chat-list__info">
                                <div className="chat-list__name">
                                    {getChatName(chat)}
                                    {chat.type === 'group' && (
                                        <span className="chat-list__badge">Группа</span>
                                    )}
                                </div>
                                {chat.last_message && (
                                    <div className="chat-list__last">
                                        <span className="chat-list__sender">
                                            {chat.last_message.sender_name}:
                                        </span>
                                        {chat.last_message.text.length > 40
                                            ? chat.last_message.text.substring(0, 40) + '...'
                                            : chat.last_message.text}
                                    </div>
                                )}
                            </div>
                            {chat.last_message && (
                                <div className="chat-list__time">
                                    {formatTime(chat.last_message.created_at)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatList;
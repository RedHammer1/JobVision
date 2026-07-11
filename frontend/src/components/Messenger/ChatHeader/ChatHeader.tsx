import React from 'react';
import { type Chat } from '../../../api/chats';
import './ChatHeader.css';

interface ChatHeaderProps {
    chat: Chat;
    isMobile: boolean;
    isCreator: boolean;
    userRole: string | null;
    onBack: () => void;
    onManageMembers: () => void;
    onLeaveGroup: () => void;
    getChatName: (chat: Chat) => string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    chat,
    isMobile,
    isCreator,
    userRole,
    onBack,
    onManageMembers,
    onLeaveGroup,
    getChatName,
}) => {
    return (
        <div className="chat-header">
            {isMobile && (
                <button className="chat-header__back" onClick={onBack}>
                    ←
                </button>
            )}
            <div className="chat-header__info">
                <h3>{getChatName(chat)}</h3>
                {chat.type === 'group' && (
                    <span className="chat-header__status">
                        👥 {chat.participants?.length || 0} участников
                    </span>
                )}
            </div>
            <div className="chat-header__actions">
                {chat.type === 'group' && isCreator && (
                    <button
                        className="chat-header__btn-icon chat-header__btn-icon--manage"
                        onClick={onManageMembers}
                        title="Управление участниками"
                    >
                        👥
                    </button>
                )}
                {chat.type === 'group' && !isCreator && userRole === 'member' && (
                    <button
                        className="chat-header__btn-icon chat-header__btn-icon--leave"
                        onClick={onLeaveGroup}
                        title="Покинуть группу"
                    >
                        🚪
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatHeader;
import React, { useState } from 'react';
import { type Chat } from '../../../api/chats';
import './ManageMembersModal.css';

interface ManageMembersModalProps {
    isOpen: boolean;
    chat: Chat | null;
    user: { id: number; name: string } | null;
    isCreator: boolean;
    onClose: () => void;
    onAddMember: (userId: number) => Promise<boolean>;
    onRemoveMember: (userId: number) => Promise<boolean>;
    onLeaveGroup: () => Promise<boolean>;
    onDeleteGroup: () => Promise<boolean>;
    searchUsers: (query: string) => Promise<{ id: number; name: string; tag: string }[]>;
}

const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
    isOpen,
    chat,
    user,
    isCreator,
    onClose,
    onAddMember,
    onRemoveMember,
    onLeaveGroup,
    onDeleteGroup,
    searchUsers,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: number; name: string; tag: string }[]>([]);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !chat || chat.type !== 'group') return null;

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 1) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const results = await searchUsers(query);
            const existingIds = chat.participants?.map(p => p.id) || [];
            const filtered = results.filter(u => !existingIds.includes(u.id) && u.id !== user?.id);
            setSearchResults(filtered);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (userId: number) => {
        const success = await onAddMember(userId);
        if (success) {
            setSearchQuery('');
            setSearchResults([]);
        }
    };

    return (
        <div className="manage-members__overlay" onClick={onClose}>
            <div className="manage-members__modal" onClick={(e) => e.stopPropagation()}>
                <div className="manage-members__header">
                    <h3>👥 Управление участниками</h3>
                    <button className="manage-members__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="manage-members__body">
                    {isCreator && (
                        <div className="manage-members__field">
                            <label>Добавить участника</label>
                            <div className="manage-members__search">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Введите имя или тег для поиска..."
                                    disabled={loading}
                                />
                                <button 
                                    className="manage-members__search-btn"
                                    onClick={() => handleSearch(searchQuery)}
                                    disabled={loading}
                                >
                                    Поиск
                                </button>
                            </div>
                            {searchResults.length > 0 && (
                                <div className="manage-members__results">
                                    {searchResults.map(u => (
                                        <div
                                            key={u.id}
                                            className="manage-members__result"
                                            onClick={() => handleAddMember(u.id)}
                                        >
                                            <div>
                                                <div><strong>{u.name}</strong></div>
                                                <div className="manage-members__tag">{u.tag}</div>
                                            </div>
                                            <button className="manage-members__add-btn">➕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                                <div className="manage-members__empty">Пользователи не найдены</div>
                            )}
                        </div>
                    )}

                    <div className="manage-members__field">
                        <label>Текущие участники ({chat.participants?.length || 0})</label>
                        <div className="manage-members__list">
                            {chat.participants?.map(participant => {
                                const isCreatorRole = participant.role === 'creator';
                                const isCurrentUser = participant.id === user?.id;
                                
                                return (
                                    <div key={participant.id} className="manage-members__item">
                                        <div className="manage-members__info">
                                            <span className="manage-members__name">
                                                {participant.name}
                                                {isCreatorRole && (
                                                    <span className="manage-members__badge creator">👑 Создатель</span>
                                                )}
                                                {isCurrentUser && (
                                                    <span className="manage-members__badge you">Вы</span>
                                                )}
                                            </span>
                                            <span className="manage-members__tag">{participant.tag}</span>
                                        </div>
                                        <div className="manage-members__actions">
                                            {!isCreatorRole && !isCurrentUser && isCreator && (
                                                <button
                                                    className="manage-members__remove"
                                                    onClick={() => onRemoveMember(participant.id)}
                                                    title="Удалить участника"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                            {!isCreatorRole && !isCurrentUser && !isCreator && (
                                                <span className="manage-members__role">Участник</span>
                                            )}
                                            {isCurrentUser && !isCreatorRole && (
                                                <span className="manage-members__role you-role">Вы</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="manage-members__footer">
                    <button className="manage-members__btn-cancel" onClick={onClose}>
                        Закрыть
                    </button>
                    {!isCreator && (
                        <button 
                            className="manage-members__btn-danger"
                            onClick={onLeaveGroup}
                        >
                            🚪 Покинуть группу
                        </button>
                    )}
                    {isCreator && (
                        <>
                            <button 
                                className="manage-members__btn-danger"
                                onClick={() => {
                                    if (confirm('Вы уверены, что хотите покинуть группу? Это действие нельзя отменить.')) {
                                        onLeaveGroup();
                                    }
                                }}
                            >
                                🚪 Покинуть группу
                            </button>
                            <button 
                                className="manage-members__btn-danger manage-members__btn-danger--delete"
                                onClick={() => {
                                    if (confirm('Вы уверены, что хотите удалить группу?\n\nЭто действие НЕЛЬЗЯ отменить. Все сообщения будут удалены.')) {
                                        onDeleteGroup();
                                    }
                                }}
                            >
                                🗑️ Удалить группу
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageMembersModal;
import React, { useState } from 'react';
import './CreateGroupModal.css';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateGroup: (name: string, participantIds: number[]) => Promise<unknown>;
    searchUsers: (query: string) => Promise<{ id: number; name: string; tag: string }[]>;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    isOpen,
    onClose,
    onCreateGroup,
    searchUsers,
}) => {
    const [groupName, setGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: number; name: string; tag: string }[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<{ id: number; name: string; tag: string }[]>([]);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 1) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const results = await searchUsers(query);
            setSearchResults(results);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = (user: { id: number; name: string; tag: string }) => {
        if (!selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers([...selectedUsers, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemoveUser = (userId: number) => {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
    };

    const handleCreate = async () => {
        if (!groupName.trim()) return;
        await onCreateGroup(groupName.trim(), selectedUsers.map(u => u.id));
        setGroupName('');
        setSelectedUsers([]);
        setSearchQuery('');
        setSearchResults([]);
        onClose(); 
    };

    return (
        <div className="create-group__overlay" onClick={onClose}>
            <div className="create-group__modal" onClick={(e) => e.stopPropagation()}>
                <div className="create-group__header">
                    <h3>👥 Создать групповой чат</h3>
                    <button className="create-group__close" onClick={onClose}>
                        ✕
                    </button>
                </div>
                <div className="create-group__body">
                    <div className="create-group__field">
                        <label>Название группы *</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Введите название группы"
                        />
                    </div>
                    <div className="create-group__field">
                        <label>Поиск пользователей</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Введите имя или тег..."
                            disabled={loading}
                        />
                        {searchResults.length > 0 && (
                            <div className="create-group__results">
                                {searchResults.map(u => (
                                    <div
                                        key={u.id}
                                        className="create-group__result"
                                        onClick={() => handleAddUser(u)}
                                    >
                                        <div>
                                            <div><strong>{u.name}</strong></div>
                                            <div className="create-group__tag">{u.tag}</div>
                                        </div>
                                        <button className="create-group__add-btn">➕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedUsers.length > 0 && (
                        <div className="create-group__selected">
                            <label>Выбранные участники:</label>
                            <div className="create-group__selected-list">
                                {selectedUsers.map(u => (
                                    <div key={u.id} className="create-group__selected-user">
                                        <span>{u.name}</span>
                                        <button onClick={() => handleRemoveUser(u.id)}>✕</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="create-group__footer">
                    <button className="create-group__btn-cancel" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        className="create-group__btn-create"
                        onClick={handleCreate}
                        disabled={!groupName.trim()}
                    >
                        Создать
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
import React, { useState } from 'react';
import './CreateChatModal.css';

interface CreateChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateChat: (userId: number) => Promise<unknown>; 
    searchUsers: (query: string) => Promise<{ id: number; name: string; tag: string }[]>;
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({
    isOpen,
    onClose,
    onCreateChat,
    searchUsers,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: number; name: string; tag: string }[]>([]);
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

    const handleCreate = async (userId: number) => {
        await onCreateChat(userId);
        setSearchQuery('');
        setSearchResults([]);
        onClose();
    };

    return (
        <div className="create-chat__overlay" onClick={onClose}>
            <div className="create-chat__modal" onClick={(e) => e.stopPropagation()}>
                <div className="create-chat__header">
                    <h3>✉️ Новый личный чат</h3>
                    <button className="create-chat__close" onClick={onClose}>
                        ✕
                    </button>
                </div>
                <div className="create-chat__body">
                    <div className="create-chat__field">
                        <label>Поиск пользователя</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Введите имя или тег..."
                            autoFocus
                            disabled={loading}
                        />
                        {searchResults.length > 0 && (
                            <div className="create-chat__results">
                                {searchResults.map(u => (
                                    <div
                                        key={u.id}
                                        className="create-chat__result"
                                        onClick={() => handleCreate(u.id)}
                                    >
                                        <div>
                                            <div><strong>{u.name}</strong></div>
                                            <div className="create-chat__tag">{u.tag}</div>
                                        </div>
                                        <button className="create-chat__add-btn">➕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
                            <div className="create-chat__empty">Пользователи не найдены</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateChatModal;
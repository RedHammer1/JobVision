import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getUserChats,
    createPrivateChat,
    createGroupChat,
    getChat,
    addParticipant,
    removeParticipant,
    leaveGroup,
    getRoleInChat,
    deleteGroup,
    type Chat,
    type Message
} from '../api/chats';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';

export const useMessenger = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showChatList, setShowChatList] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isCreator, setIsCreator] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const { sendMessage, sendTyping } = useSocket({
        userId: user?.id || 0,
        userName: user?.name || '',
        chatId: selectedChatId,
        onNewMessage: (msg) => {
            const isRecommended = msg.isRecommended === true;
            setMessages(prev => [...prev, {
                id: parseInt(msg.id),
                chat_id: parseInt(msg.chatId),
                sender_id: parseInt(msg.senderId),
                sender_name: msg.senderName,
                text: msg.text,
                created_at: msg.timestamp,
                updated_at: msg.timestamp,
                isOwn: parseInt(msg.senderId) === user?.id,
                vacancy_id: msg.vacancyId,
                vacancy_title: msg.vacancyTitle,
                salary: msg.salary,
                url: msg.url,
                city: msg.city,
                recommended_by: msg.recommendedBy,
                is_recommended: isRecommended,
                recommended_at: msg.recommendedAt
            }]);
        },
        onMessageUpdated: (msg) => {
            console.log('Обновление сообщения:', msg);
            setMessages(prev => prev.map(m =>
                m.id === parseInt(msg.id)
                    ? {
                        ...m,
                        required_test_id: msg.requiredTestId || null,
                        test_title: msg.testTitle || null,
                        test_passed: msg.testPassed !== undefined ? msg.testPassed : true,
                        updated_at: msg.timestamp || m.updated_at
                    }
                    : m
            ));
        },

        onUserTyping: (userId, userName, isTyping) => {
            setTypingUsers(prev => {
                const newMap = new Map(prev);
                if (isTyping) {
                    newMap.set(userId, userName);
                } else {
                    newMap.delete(userId);
                }
                return newMap;
            });
        },
        onChatHistory: (history) => {
            console.log('📜 История чата получена в useMessenger:', history.length);

            const formattedMessages = history.map(msg => {
                const isOwn = parseInt(msg.senderId) === user?.id;
                const testPassed = msg.testPassed !== undefined ? msg.testPassed : true;

                console.log(`📌 Сообщение ${msg.id}: testPassed=${testPassed}, requiredTestId=${msg.requiredTestId}`);

                return {
                    id: parseInt(msg.id),
                    chat_id: parseInt(msg.chatId),
                    sender_id: parseInt(msg.senderId),
                    sender_name: msg.senderName,
                    text: msg.text,
                    created_at: msg.timestamp,
                    updated_at: msg.timestamp,
                    isOwn: isOwn,
                    vacancy_id: msg.vacancyId,
                    vacancy_title: msg.vacancyTitle,
                    salary: msg.salary,
                    url: msg.url,
                    city: msg.city,
                    recommended_by: msg.recommendedBy,
                    is_recommended: msg.isRecommended === true,
                    recommended_at: msg.recommendedAt,
                    required_test_id: msg.requiredTestId || null,
                    test_title: msg.testTitle || null,
                    test_passed: testPassed
                };
            });

            setMessages(formattedMessages);
        },

    });

    const loadChats = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getUserChats(user.id);
            const chatsWithParticipants = data.map(chat => ({
                ...chat,
                participants: chat.participants || []
            }));
            setChats(chatsWithParticipants);
            setFilteredChats(chatsWithParticipants);
            if (chatsWithParticipants.length > 0 && !selectedChatId) {
                setSelectedChatId(chatsWithParticipants[0].id);
                if (isMobile) {
                    setShowChatList(false);
                }
            }
        } catch (err) {
            console.error('Ошибка загрузки чатов:', err);
        } finally {
            setLoading(false);
        }
    }, [user, selectedChatId, isMobile]);

    const loadChatInfo = useCallback(async (chatId: number) => {
        if (!user) return;
        try {
            const data = await getChat(user.id, chatId);
            setSelectedChat({
                ...data,
                participants: data.participants || []
            });
        } catch (err) {
            console.error('Ошибка загрузки информации о чате:', err);
        }
    }, [user]);

    const checkUserRole = useCallback(async (chatId: number) => {
        if (!user) return;
        try {
            const role = await getRoleInChat(user.id, chatId);
            setUserRole(role);
            setIsCreator(role === 'creator');
        } catch (err) {
            console.error('Ошибка получения роли:', err);
            setUserRole(null);
            setIsCreator(false);
        }
    }, [user]);

    const handleCreatePrivateChat = useCallback(async (contactId: number) => {
        if (!user) return;
        try {
            const chat = await createPrivateChat(user.id, contactId);
            const chatWithParticipants = {
                ...chat,
                participants: chat.participants || []
            };
            setChats(prev => [chatWithParticipants, ...prev]);
            setFilteredChats(prev => [chatWithParticipants, ...prev]);
            setSelectedChatId(chat.id);
            if (isMobile) {
                setShowChatList(false);
            }
            return chat;
        } catch (err) {
            console.error('Ошибка создания личного чата:', err);
            alert('Не удалось создать чат. Возможно, чат уже существует.');
            return null;
        }
    }, [user, isMobile]);

    const handleCreateGroup = useCallback(async (name: string, participantIds: number[]) => {
        if (!user || !name.trim()) return null;
        try {
            const chat = await createGroupChat(name.trim(), user.id, participantIds);
            const chatWithParticipants = {
                ...chat,
                participants: chat.participants || []
            };
            setChats(prev => [chatWithParticipants, ...prev]);
            setFilteredChats(prev => [chatWithParticipants, ...prev]);
            setSelectedChatId(chat.id);
            if (isMobile) {
                setShowChatList(false);
            }
            return chat;
        } catch (err) {
            console.error('Ошибка создания группы:', err);
            alert('Не удалось создать группу. Только преподаватель может создавать группы.');
            return null;
        }
    }, [user, isMobile]);

    const handleAddMember = useCallback(async (userId: number) => {
        if (!selectedChatId || !user) return false;
        try {
            await addParticipant(selectedChatId, userId, user.id);
            await loadChatInfo(selectedChatId);
            return true;
        } catch (err) {
            console.error('Ошибка добавления участника:', err);
            alert('Не удалось добавить участника');
            return false;
        }
    }, [selectedChatId, user, loadChatInfo]);

    const handleRemoveMember = useCallback(async (userId: number) => {
        if (!selectedChatId || !user) return false;
        if (userId === user.id) {
            alert('Вы не можете удалить себя из группы');
            return false;
        }

        const member = selectedChat?.participants?.find(p => p.id === userId);
        if (!member) return false;

        if (!confirm(`Удалить ${member.name} из группы?`)) return false;

        try {
            await removeParticipant(selectedChatId, userId, user.id);
            await loadChatInfo(selectedChatId);
            alert('Участник удалён');
            return true;
        } catch (err) {
            console.error('Ошибка удаления участника:', err);
            alert('Не удалось удалить участника');
            return false;
        }
    }, [selectedChatId, user, selectedChat, loadChatInfo]);

    const handleLeaveGroup = useCallback(async () => {
        if (!selectedChatId || !user) return false;
        if (isCreator) {
            alert('Создатель не может покинуть группу');
            return false;
        }

        if (!confirm('Вы уверены, что хотите покинуть группу?')) return false;

        try {
            await leaveGroup(selectedChatId, user.id);
            setSelectedChatId(null);
            setSelectedChat(null);
            await loadChats();
            alert('Вы покинули группу');
            return true;
        } catch (err) {
            console.error('Ошибка выхода из группы:', err);
            alert('Не удалось покинуть группу');
            return false;
        }
    }, [selectedChatId, user, isCreator, loadChats]);

    const handleDeleteGroup = useCallback(async () => {
        if (!selectedChatId || !user) return false;
        if (!isCreator) {
            alert('Только создатель может удалить группу');
            return false;
        }

        const groupName = selectedChat?.name || 'Группа';
        if (!confirm(`Вы уверены, что хотите удалить группу "${groupName}"?\n\nЭто действие НЕЛЬЗЯ отменить. Все сообщения будут удалены.`)) return false;

        try {
            await deleteGroup(selectedChatId, user.id);
            setSelectedChatId(null);
            setSelectedChat(null);
            await loadChats();
            alert('Группа успешно удалена');
            return true;
        } catch (err) {
            console.error('Ошибка удаления группы:', err);
            alert('Не удалось удалить группу');
            return false;
        }
    }, [selectedChatId, user, isCreator, selectedChat, loadChats]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !selectedChatId || !user) return;
        setSending(true);
        try {
            sendMessage(text.trim());
            return true;
        } catch (err) {
            console.error('Ошибка отправки:', err);
            return false;
        } finally {
            setSending(false);
        }
    }, [selectedChatId, user, sendMessage]);

    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 1) return [];
        try {
            let cleanQuery = query;
            if (cleanQuery.startsWith('@')) {
                cleanQuery = cleanQuery.substring(1);
            }

            const response = await fetch(
                `http://localhost:8080/api/users/search?q=${encodeURIComponent(cleanQuery)}`,
                {
                    headers: {
                        'X-User-Id': user?.id?.toString() || '',
                    },
                }
            );

            if (!response.ok) return [];
            return await response.json();
        } catch (err) {
            console.error('Ошибка поиска:', err);
            return [];
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadChats();
        }
    }, [user, loadChats]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredChats(chats);
        } else {
            const query = searchQuery.toLowerCase().trim();
            const filtered = chats.filter(chat => {
                const chatName = getChatName(chat).toLowerCase();
                return chatName.includes(query);
            });
            setFilteredChats(filtered);
        }
    }, [searchQuery, chats]);

    useEffect(() => {
        if (selectedChatId && user) {
            loadChatInfo(selectedChatId);
            checkUserRole(selectedChatId);
        }
    }, [selectedChatId, user, loadChatInfo, checkUserRole]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) {
                setShowChatList(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getChatName = useCallback((chat: Chat): string => {
        if (chat.type === 'group') {
            return chat.name || 'Групповой чат';
        }
        if (!chat.participants || chat.participants.length === 0) {
            return 'Пользователь';
        }
        const other = chat.participants.find(p => p.id !== user?.id);
        return other?.name || 'Пользователь';
    }, [user]);

    const getChatAvatar = useCallback((chat: Chat): string => {
        if (chat.type === 'group') {
            return '👥';
        }
        if (!chat.participants || chat.participants.length === 0) {
            return '?';
        }
        const other = chat.participants.find(p => p.id !== user?.id);
        return other?.name?.charAt(0)?.toUpperCase() || '?';
    }, [user]);

    const getTypingText = useCallback((): string | null => {
        if (typingUsers.size === 0) return null;
        const names = Array.from(typingUsers.values());
        if (names.length === 1) return `${names[0]} печатает...`;
        if (names.length === 2) return `${names[0]} и ${names[1]} печатают...`;
        return `${names.length} человек печатают...`;
    }, [typingUsers]);

    const formatTime = useCallback((dateStr: string): string => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const hours = diff / (1000 * 60 * 60);

            if (hours < 24) {
                return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        } catch {
            return '';
        }
    }, []);

    return {
        user,
        chats,
        filteredChats,
        messages,
        selectedChatId,
        selectedChat,
        loading,
        sending,
        typingUsers,
        searchQuery,
        isMobile,
        showChatList,
        userRole,
        isCreator,
        messagesEndRef,

        setSearchQuery,
        setShowChatList,
        setSelectedChatId,

        loadChats,
        loadChatInfo,
        handleCreatePrivateChat,
        handleCreateGroup,
        handleAddMember,
        handleRemoveMember,
        handleLeaveGroup,
        handleDeleteGroup,
        handleSendMessage,
        searchUsers,
        getChatName,
        getChatAvatar,
        getTypingText,
        formatTime,
        sendTyping,
        setMessages,
    };
};
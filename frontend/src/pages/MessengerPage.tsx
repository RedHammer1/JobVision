import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../hooks/useMessenger';
import ChatList from '../components/Messenger/ChatList/ChatList';
import ChatHeader from '../components/Messenger/ChatHeader/ChatHeader';
import MessageList from '../components/Messenger/MessageList/MessageList';
import MessageInput from '../components/Messenger/MessageInput/MessageInput';
import CreateChatModal from '../components/Messenger/CreateChatModal/CreateChatModal';
import CreateGroupModal from '../components/Messenger/CreateGroupModal/CreateGroupModal';
import ManageMembersModal from '../components/Messenger/ManageMembersModal/ManageMembersModal';
import VacancyTestRequirementModal from '../components/Tests/VacancyTestRequirementModal';
import './MessengerPage.css';

const API_URL = 'http://localhost:8080/api';

const MessengerPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        chats,
        filteredChats,
        messages,
        selectedChatId,
        selectedChat,
        loading,
        searchQuery,
        isMobile,
        showChatList,
        isCreator,
        userRole,
        messagesEndRef,
        setSearchQuery,
        setShowChatList,
        setSelectedChatId,
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
    } = useMessenger();

    const [showCreateChat, setShowCreateChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showManageMembers, setShowManageMembers] = useState(false);
    const [showRequirementModal, setShowRequirementModal] = useState(false);
    const [selectedVacancy, setSelectedVacancy] = useState<{ 
        id: string; 
        title: string; 
        messageId: number 
    } | null>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [vacancyRequirements, setVacancyRequirements] = useState<Record<string, number>>({});

    const isTeacher = user?.role === 'teacher';

    React.useEffect(() => {
        if (isTeacher && user) {
            loadTests();
            loadRequirements();
        }
    }, [isTeacher, user]);

    const loadTests = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tests`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error('Ошибка загрузки тестов');
            const data = await response.json();
            setTests(data);
        } catch (err) {
            console.error('Ошибка загрузки тестов:', err);
        }
    };

    const loadRequirements = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/vacancies/requirements`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка загрузки требований: ${response.status}`);
            }
            
            const data = await response.json();
            const requirementsMap: Record<string, number> = {};
            data.forEach((item: any) => {
                if (item.test_id) {
                    requirementsMap[item.id] = item.test_id;
                }
            });
            setVacancyRequirements(requirementsMap);
        } catch (err) {
            console.error('Ошибка загрузки требований:', err);
        }
    };

    const handleManageRequirement = (vacancyId: string, vacancyTitle: string, messageId: number) => {
        setSelectedVacancy({ id: vacancyId, title: vacancyTitle, messageId });
        setShowRequirementModal(true);
    };

    const handleSaveRequirement = async (vacancyId: string, testId: number | null, messageId: number) => {
        if (!user) {
            alert('❌ Пользователь не авторизован');
            return;
        }
        
        if (!selectedChatId) {
            alert('❌ Чат не выбран');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(
                `${API_URL}/chats/${user.id}/chat/${selectedChatId}/message/${messageId}/requirement`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ requiredTestId: testId })
                }
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка обновления');
            }
            
            const result = await response.json();
            console.log('✅ Требование обновлено:', result);
            
            alert('✅ Требование обновлено! Сообщение обновлено в чате.');
            await loadRequirements();
        } catch (err) {
            console.error('❌ Ошибка сохранения требования:', err);
            alert(`❌ ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
        }
    };

    const handleTakeTest = (testId: number, testTitle: string) => {
        navigate('/tests');
    };

    if (!user) {
        return <div className="messenger-page__auth">Пожалуйста, войдите в систему</div>;
    }

    if (loading) {
        return <div className="messenger-page__loading">Загрузка...</div>;
    }

    const handleSelectChat = (chatId: number) => {
        setSelectedChatId(chatId);
        if (isMobile) {
            setShowChatList(false);
        }
    };

    const handleBackToChats = () => {
        setShowChatList(true);
    };

    const handleCreateGroupWithClose = async (name: string, participantIds: number[]) => {
        const result = await handleCreateGroup(name, participantIds);
        if (result) {
            setShowCreateGroup(false);
        }
        return result;
    };

    return (
        <div className="messenger-page">
            <ChatList
                chats={filteredChats}
                selectedChatId={selectedChatId}
                searchQuery={searchQuery}
                isMobile={isMobile}
                showChatList={showChatList}
                onSelectChat={handleSelectChat}
                onSearchChange={setSearchQuery}
                onCreatePrivateChat={() => setShowCreateChat(true)}
                onCreateGroup={() => setShowCreateGroup(true)}
                getChatName={getChatName}
                getChatAvatar={getChatAvatar}
                formatTime={formatTime}
            />

            <div className={`messenger-page__chat ${selectedChatId ? '' : 'messenger-page__chat--empty'}`}>
                {selectedChatId && selectedChat ? (
                    <>
                        <ChatHeader
                            chat={selectedChat}
                            isMobile={isMobile}
                            isCreator={isCreator}
                            userRole={userRole}
                            onBack={handleBackToChats}
                            onManageMembers={() => setShowManageMembers(true)}
                            onLeaveGroup={handleLeaveGroup}
                            getChatName={getChatName}
                        />

                        <MessageList
                            messages={messages}
                            typingText={getTypingText()}
                            messagesEndRef={messagesEndRef}
                            formatTime={formatTime}
                            userId={user.id}
                            isTeacher={isTeacher}
                            onManageRequirement={handleManageRequirement}
                            onTakeTest={handleTakeTest}
                            tests={tests}
                        />

                        <MessageInput
                            onSendMessage={handleSendMessage}
                            onTyping={sendTyping}
                        />
                    </>
                ) : (
                    <div className="messenger-page__empty">
                        <div className="messenger-page__empty-icon">💬</div>
                        <h3>Выберите чат</h3>
                        <p>Выберите чат из списка слева, чтобы начать общение</p>
                    </div>
                )}
            </div>

            <CreateChatModal
                isOpen={showCreateChat}
                onClose={() => setShowCreateChat(false)}
                onCreateChat={handleCreatePrivateChat}
                searchUsers={searchUsers}
            />

            <CreateGroupModal
                isOpen={showCreateGroup}
                onClose={() => setShowCreateGroup(false)}
                onCreateGroup={handleCreateGroupWithClose}
                searchUsers={searchUsers}
            />

            <ManageMembersModal
                isOpen={showManageMembers}
                chat={selectedChat}
                user={user}
                isCreator={isCreator}
                onClose={() => setShowManageMembers(false)}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onLeaveGroup={handleLeaveGroup}
                onDeleteGroup={handleDeleteGroup}
                searchUsers={searchUsers}
            />

            <VacancyTestRequirementModal
                isOpen={showRequirementModal}
                onClose={() => {
                    setShowRequirementModal(false);
                    setSelectedVacancy(null);
                }}
                vacancy={{
                    id: selectedVacancy?.id || '',
                    title: selectedVacancy?.title || '',
                    salary: '',
                    city: '',
                    url: ''
                }}
                messageId={selectedVacancy?.messageId || 0}
                tests={tests}
                currentTestId={selectedVacancy ? vacancyRequirements[selectedVacancy.id] : null}
                userId={user.id}
                onSave={handleSaveRequirement}
            />
        </div>
    );
};

export default MessengerPage;
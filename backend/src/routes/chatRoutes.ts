import { Router } from 'express';
import { pool } from '../db';
import {
    getOrCreatePrivateChat,
    createGroupChat,
    getUserChats,
    getChatWithParticipants,
    getChatMessages,
    addParticipantToGroup,
    removeParticipantFromGroup,
    getUserRoleInChat,
    leaveGroup,
    saveMessage,
    searchMessagesInChat,
    getRecommendedVacancies,
    deleteGroup,
    updateMessageWithTestRequirement 
} from '../db/chatQueries';

const router = Router();

router.post('/group', async (req, res) => {
    const { name, createdBy, participants } = req.body;
    
    console.log(`📝 Создание группового чата: name="${name}", createdBy=${createdBy}`);
    
    if (!name || !createdBy) {
        return res.status(400).json({ error: 'Название группы и создатель обязательны' });
    }
    
    const creatorId = parseInt(createdBy);
    if (isNaN(creatorId) || creatorId <= 0) {
        return res.status(400).json({ error: 'Неверный ID создателя' });
    }
    
    try {
        const chat = await createGroupChat(name, creatorId, participants || []);
        if (!chat) {
            return res.status(403).json({ error: 'Только преподаватель может создавать группы' });
        }
        console.log(`Групповой чат создан: id=${chat.id}`);
        res.json(chat);
    } catch (err) {
        console.error('Ошибка создания группы:', err);
        res.status(500).json({ error: 'Ошибка создания группы' });
    }
});

router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    try {
        const chats = await getUserChats(userId);
        res.json(chats);
    } catch (err) {
        console.error('Ошибка получения чатов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:userId/chat/:chatId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    
    if (isNaN(userId) || userId <= 0 || isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    try {
        const chat = await getChatWithParticipants(chatId, userId);
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }
        res.json(chat);
    } catch (err) {
        console.error('Ошибка получения чата:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:userId/chat/:chatId/message/:messageId/requirement', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    const messageId = parseInt(req.params.messageId);
    const { requiredTestId } = req.body;
    
    console.log(`📝 Обновление требования: userId=${userId}, chatId=${chatId}, messageId=${messageId}, requiredTestId=${requiredTestId}`);
    
    if (isNaN(userId) || userId <= 0 || isNaN(chatId) || chatId <= 0 || isNaN(messageId) || messageId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    try {
        const userCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );
        
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return res.status(403).json({ error: 'Только преподаватель может изменять требования' });
        }
        
        const messageCheck = await pool.query(
            'SELECT id, vacancy_id FROM messages WHERE id = $1 AND chat_id = $2',
            [messageId, chatId]
        );
        
        if (messageCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Сообщение не найдено' });
        }
        
        if (!messageCheck.rows[0].vacancy_id) {
            return res.status(400).json({ error: 'Сообщение не содержит вакансию' });
        }
        
        if (requiredTestId) {
            await pool.query(
                `INSERT INTO test_vacancy_requirements (test_id, vacancy_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (vacancy_id) DO UPDATE SET test_id = EXCLUDED.test_id`,
                [requiredTestId, messageCheck.rows[0].vacancy_id]
            );
        } else {
            await pool.query(
                'DELETE FROM test_vacancy_requirements WHERE vacancy_id = $1',
                [messageCheck.rows[0].vacancy_id]
            );
        }

        await pool.query(
            `UPDATE messages SET required_test_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [requiredTestId || null, messageId]
        );

        const updatedMessage = await getChatMessages(chatId, 100, 0);
        const targetMessage = updatedMessage.find(m => m.id === messageId);
        
        if (!targetMessage) {
            return res.status(404).json({ error: 'Обновленное сообщение не найдено' });
        }

        const participants = await pool.query(
            'SELECT user_id FROM chat_participants WHERE chat_id = $1',
            [chatId]
        );
        
        const io = req.app.get('io');

        for (const participant of participants.rows) {
            const pUserId = participant.user_id;
            let testPassed = true;
            
            if (requiredTestId) {
                const userCheck2 = await pool.query(
                    'SELECT role FROM users WHERE id = $1',
                    [pUserId]
                );
                const isTeacher = userCheck2.rows[0]?.role === 'teacher';
                
                if (!isTeacher) {
                    const resultCheck = await pool.query(
                        `SELECT * FROM test_results 
                         WHERE test_id = $1 AND user_id = $2 AND passed = true`,
                        [requiredTestId, pUserId]
                    );
                    testPassed = resultCheck.rows.length > 0;
                }
            }
            
            const formattedMessage = {
                id: targetMessage.id.toString(),
                text: targetMessage.text,
                senderId: targetMessage.sender_id.toString(),
                senderName: targetMessage.sender_name || 'Unknown',
                chatId: targetMessage.chat_id.toString(),
                timestamp: targetMessage.updated_at,
                vacancyId: targetMessage.vacancy_id,
                recommendedBy: targetMessage.recommended_by,
                isRecommended: targetMessage.is_recommended,
                vacancyTitle: targetMessage.vacancy_title,
                salary: targetMessage.salary,
                url: targetMessage.url,
                city: targetMessage.city,
                requiredTestId: requiredTestId || null,
                testTitle: targetMessage.test_title || null,
                testPassed: testPassed
            };
            
            if (io) {
                io.to(`user_${pUserId}`).emit('message_updated', formattedMessage);
            }
        }

        if (io) {
            const formattedMessage = {
                id: targetMessage.id.toString(),
                text: targetMessage.text,
                senderId: targetMessage.sender_id.toString(),
                senderName: targetMessage.sender_name || 'Unknown',
                chatId: targetMessage.chat_id.toString(),
                timestamp: targetMessage.updated_at,
                vacancyId: targetMessage.vacancy_id,
                recommendedBy: targetMessage.recommended_by,
                isRecommended: targetMessage.is_recommended,
                vacancyTitle: targetMessage.vacancy_title,
                salary: targetMessage.salary,
                url: targetMessage.url,
                city: targetMessage.city,
                requiredTestId: requiredTestId || null,
                testTitle: targetMessage.test_title || null,
                testPassed: true
            };
            io.to(chatId.toString()).emit('message_updated', formattedMessage);
        }
        
        res.json({ 
            message: 'Требование обновлено',
            updatedMessage: targetMessage
        });
    } catch (err) {
        console.error('❌ Ошибка обновления требования:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:userId/chat/:chatId/messages', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    const { text, vacancyId, recommendedBy } = req.body;
    
    console.log(`📝 Отправка сообщения: userId=${userId}, chatId=${chatId}, text="${text}"`);
    
    if (isNaN(userId) || userId <= 0 || isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Текст сообщения обязателен' });
    }
    
    try {
        const chat = await getChatWithParticipants(chatId, userId);
        if (!chat) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        
        const message = await saveMessage(
            chatId,
            userId,
            text.trim(),
            vacancyId,
            recommendedBy ? parseInt(recommendedBy) : undefined
        );
        
        if (!message) {
            return res.status(500).json({ error: 'Ошибка сохранения сообщения' });
        }
        
        console.log(`Сообщение сохранено: id=${message.id}`);
        res.status(201).json(message);
    } catch (err) {
        console.error('Ошибка отправки сообщения:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:userId/chat/:chatId/recommended', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    
    if (isNaN(userId) || userId <= 0 || isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    try {
        const vacancies = await getRecommendedVacancies(chatId);
        res.json(vacancies);
    } catch (err) {
        console.error('Ошибка получения рекомендованных вакансий:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/private', async (req, res) => {
    const { userId1, userId2 } = req.body;
    
    console.log(`📝 Создание личного чата: userId1=${userId1}, userId2=${userId2}`);
    
    if (!userId1 || !userId2) {
        return res.status(400).json({ error: 'Оба ID пользователей обязательны' });
    }
    
    const id1 = parseInt(userId1);
    const id2 = parseInt(userId2);
    
    if (isNaN(id1) || id1 <= 0 || isNaN(id2) || id2 <= 0) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    if (id1 === id2) {
        return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });
    }
    
    try {
        const chat = await getOrCreatePrivateChat(id1, id2);
        if (!chat) {
            return res.status(500).json({ error: 'Ошибка создания чата' });
        }
        console.log(`Личный чат создан: id=${chat.id}`);
        res.json(chat);
    } catch (err) {
        console.error('Ошибка создания личного чата:', err);
        res.status(500).json({ error: 'Ошибка создания чата' });
    }
});



router.get('/:userId/chat/:chatId/role', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    
    if (isNaN(userId) || userId <= 0 || isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }
    
    try {
        const role = await getUserRoleInChat(chatId, userId);
        res.json({ role: role || 'none' });
    } catch (err) {
        console.error('Ошибка получения роли:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/group/:chatId/add-participant', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { targetUserId, currentUserId } = req.body;
    
    if (isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID чата' });
    }
    
    try {
        const success = await addParticipantToGroup(chatId, targetUserId, currentUserId);
        if (!success) {
            return res.status(403).json({ error: 'Недостаточно прав для добавления участника' });
        }
        res.json({ message: 'Участник добавлен' });
    } catch (err) {
        console.error('Ошибка добавления участника:', err);
        res.status(500).json({ error: 'Ошибка добавления участника' });
    }
});

router.delete('/group/:chatId', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { userId } = req.body;
    
    console.log(`🗑️ Удаление группы: chatId=${chatId}, userId=${userId}`);
    
    if (isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID чата' });
    }
    
    if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    try {
        const success = await deleteGroup(chatId, userId);
        if (!success) {
            return res.status(403).json({ 
                error: 'Невозможно удалить группу. Только создатель может удалить группу.' 
            });
        }
        
        console.log(`Группа ${chatId} удалена`);
        res.json({ message: 'Группа успешно удалена' });
    } catch (err) {
        console.error('Ошибка удаления группы:', err);
        res.status(500).json({ error: 'Ошибка удаления группы' });
    }
});


router.delete('/group/:chatId/remove-participant', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { targetUserId, currentUserId } = req.body;
    
    if (isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID чата' });
    }
    
    try {
        const success = await removeParticipantFromGroup(chatId, targetUserId, currentUserId);
        if (!success) {
            return res.status(403).json({ error: 'Недостаточно прав для удаления участника' });
        }
        res.json({ message: 'Участник удалён' });
    } catch (err) {
        console.error('Ошибка удаления участника:', err);
        res.status(500).json({ error: 'Ошибка удаления участника' });
    }
});

router.post('/group/:chatId/leave', async (req, res) => {
    const chatId = parseInt(req.params.chatId);
    const { userId } = req.body;
    
    if (isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID чата' });
    }
    
    try {
        const success = await leaveGroup(chatId, userId);
        if (!success) {
            return res.status(400).json({ error: 'Невозможно выйти из группы (вы создатель)' });
        }
        res.json({ message: 'Вы вышли из группы' });
    } catch (err) {
        console.error('Ошибка выхода из группы:', err);
        res.status(500).json({ error: 'Ошибка выхода из группы' });
    }
});

router.get('/:userId/chat/:chatId/search', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const chatId = parseInt(req.params.chatId);
    const query = req.query.q as string || '';

    if (isNaN(userId) || userId <= 0 || isNaN(chatId) || chatId <= 0) {
        return res.status(400).json({ error: 'Неверный ID' });
    }

    if (query.length < 2) {
        return res.json([]);
    }

    try {
        const messages = await searchMessagesInChat(chatId, query, userId);
        res.json(messages);
    } catch (err) {
        console.error('Ошибка поиска:', err);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

export default router;
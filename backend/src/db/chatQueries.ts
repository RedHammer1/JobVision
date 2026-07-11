import { pool } from './index';
import { checkStudentTestPassed } from './testQueries';

export interface Chat {
    id: number;
    name: string | null;
    type: 'private' | 'group';
    created_by: number;
    created_at: Date;
    updated_at: Date;
}

export interface ChatParticipant {
    id: number;
    chat_id: number;
    user_id: number;
    role: 'creator' | 'moderator' | 'member';
    joined_by: number | null;
    joined_at: Date;
}


export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender_name?: string;
    text: string;
    vacancy_id?: string;
    recommended_by?: boolean;
    is_recommended: boolean;
    created_at: Date;
    updated_at: Date;
    recommended_at?: Date;
    vacancy_title?: string;
    salary?: string;
    url?: string;
    city?: string;
    required_test_id?: number | null; 
    test_title?: string | null;       
    test_passed?: boolean;        
}

export interface ChatWithDetails extends Chat {
    participants: { id: number; name: string; tag: string; role: string; joined_by?: number }[];
    last_message?: Message;
}

export async function getOrCreatePrivateChat(userId1: number, userId2: number): Promise<Chat | null> {
    const client = await pool.connect();
    try {
        const existing = await client.query(
            `SELECT c.id, c.name, c.type, c.created_by, c.created_at, c.updated_at
             FROM chats c
             JOIN chat_participants cp1 ON c.id = cp1.chat_id
             JOIN chat_participants cp2 ON c.id = cp2.chat_id
             WHERE c.type = 'private' 
               AND cp1.user_id = $1 
               AND cp2.user_id = $2`,
            [userId1, userId2]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        const result = await client.query(
            `INSERT INTO chats (type, created_by) VALUES ($1, $2) RETURNING *`,
            ['private', userId1]
        );

        const chat = result.rows[0];

        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id, role, joined_by) 
             VALUES ($1, $2, 'member', $3), ($1, $4, 'member', $3)`,
            [chat.id, userId1, userId1, userId2]
        );

        return chat;
    } catch (err) {
        console.error('Ошибка создания личного чата:', err);
        return null;
    } finally {
        client.release();
    }
}


export async function createGroupChat(
    name: string,
    createdBy: number,
    participantIds: number[] = []
): Promise<Chat | null> {
    const client = await pool.connect();
    try {
        const userCheck = await client.query(
            `SELECT role FROM users WHERE id = $1`,
            [createdBy]
        );

        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return null;
        }

        const result = await client.query(
            `INSERT INTO chats (name, type, created_by) VALUES ($1, 'group', $2) RETURNING *`,
            [name, createdBy]
        );

        const chat = result.rows[0];

        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id, role, joined_by) 
             VALUES ($1, $2, 'creator', NULL)`,
            [chat.id, createdBy]
        );

        for (const userId of participantIds) {
            if (userId !== createdBy) {
                await client.query(
                    `INSERT INTO chat_participants (chat_id, user_id, role, joined_by) 
                     VALUES ($1, $2, 'member', $3) ON CONFLICT DO NOTHING`,
                    [chat.id, userId, createdBy]
                );
            }
        }

        return chat;
    } catch (err) {
        console.error('Ошибка создания группы:', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getUserChats(userId: number): Promise<ChatWithDetails[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT c.*, 
                    (SELECT json_agg(json_build_object(
                        'id', u.id, 
                        'name', u.name, 
                        'tag', u.tag, 
                        'role', cp.role,
                        'joined_by', cp.joined_by
                     ))
                     FROM chat_participants cp
                     JOIN users u ON cp.user_id = u.id
                     WHERE cp.chat_id = c.id) as participants,
                    (SELECT row_to_json(m)
                     FROM messages m
                     WHERE m.chat_id = c.id
                     ORDER BY m.created_at DESC
                     LIMIT 1) as last_message
             FROM chats c
             JOIN chat_participants cp ON c.id = cp.chat_id
             WHERE cp.user_id = $1
             ORDER BY c.updated_at DESC`,
            [userId]
        );

        return result.rows.map(row => ({
            ...row,
            participants: row.participants || [],
            last_message: row.last_message
        }));
    } catch (err) {
        console.error('Ошибка получения чатов:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function getChatWithParticipants(chatId: number, userId?: number): Promise<ChatWithDetails | null> {
    const client = await pool.connect();
    try {
        const chatResult = await client.query(
            `SELECT * FROM chats WHERE id = $1`,
            [chatId]
        );

        if (chatResult.rows.length === 0) return null;

        const chat = chatResult.rows[0];

        if (userId) {
            const participantCheck = await client.query(
                `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
                [chatId, userId]
            );
            if (participantCheck.rows.length === 0) return null;
        }

        const participantsResult = await client.query(
            `SELECT u.id, u.name, u.tag, cp.role, cp.joined_by
             FROM chat_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.chat_id = $1`,
            [chatId]
        );

        return {
            ...chat,
            participants: participantsResult.rows
        };
    } catch (err) {
        console.error('Ошибка получения чата:', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getChatMessages(chatId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT m.*, u.name as sender_name, 
                    v.title as vacancy_title, v.salary, v.url, v.city,
                    tvr.test_id as required_test_id,
                    t.title as test_title
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             LEFT JOIN vacancies v ON m.vacancy_id = v.id
             LEFT JOIN test_vacancy_requirements tvr ON v.id = tvr.vacancy_id
             LEFT JOIN tests t ON t.id = tvr.test_id
             WHERE m.chat_id = $1
             ORDER BY m.created_at ASC
             LIMIT $2 OFFSET $3`,
            [chatId, limit, offset]
        );
        
        return result.rows.map(row => ({
            id: row.id,
            chat_id: row.chat_id,
            sender_id: row.sender_id,
            sender_name: row.sender_name || 'Unknown',
            text: row.text,
            vacancy_id: row.vacancy_id,
            recommended_by: row.recommended_by,
            is_recommended: row.is_recommended === true || row.is_recommended === 'true' || row.is_recommended === 1 || row.is_recommended === '1',
            created_at: row.created_at,
            updated_at: row.updated_at,
            recommended_at: row.recommended_at,
            vacancy_title: row.vacancy_title,
            salary: row.salary,
            url: row.url,
            city: row.city,
            required_test_id: row.required_test_id || null,
            test_title: row.test_title || null
        }));
    } catch (err) {
        console.error('Ошибка получения сообщений:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function saveMessage(
    chatId: number,
    senderId: number,
    text: string,
    vacancyId?: string,
    recommendedBy?: number
): Promise<Message | null> {
    const client = await pool.connect();
    try {
        let requiredTestId = null;
        let canAccess = true;

        if (vacancyId) {
            const requirementResult = await client.query(
                `SELECT test_id FROM test_vacancy_requirements WHERE vacancy_id = $1`,
                [vacancyId]
            );
            if (requirementResult.rows.length > 0) {
                requiredTestId = requirementResult.rows[0].test_id;

                const userCheck = await client.query(
                    'SELECT role FROM users WHERE id = $1',
                    [senderId]
                );

                if (userCheck.rows[0]?.role !== 'teacher') {
                    const resultCheck = await client.query(
                        `SELECT * FROM test_results 
                         WHERE test_id = $1 AND user_id = $2 AND passed = true`,
                        [requiredTestId, senderId]
                    );
                    canAccess = resultCheck.rows.length > 0;
                }
            }
        }

        if (!canAccess && vacancyId) {
            console.log(`Доступ к вакансии ${vacancyId} запрещен для пользователя ${senderId}`);
            return null;
        }



        const isRecommended = !!recommendedBy;

        const result = await client.query(
            `INSERT INTO messages (chat_id, sender_id, text, vacancy_id, recommended_by, is_recommended, required_test_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [chatId, senderId, text, vacancyId || null, recommendedBy || null, isRecommended, requiredTestId]
        );


        await client.query(
            `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [chatId]
        );

        const message = result.rows[0];

        const senderResult = await client.query(
            `SELECT name FROM users WHERE id = $1`,
            [senderId]
        );

        let vacancyData = null;
        if (vacancyId) {
            const vacancyResult = await client.query(
                `SELECT title, salary, url, city FROM vacancies WHERE id = $1`,
                [vacancyId]
            );
            if (vacancyResult.rows.length > 0) {
                vacancyData = vacancyResult.rows[0];
            }
        }

        return {
            ...message,
            sender_name: senderResult.rows[0]?.name,
            vacancy_title: vacancyData?.title,
            salary: vacancyData?.salary,
            url: vacancyData?.url,
            city: vacancyData?.city,
            is_recommended: message.is_recommended === true || message.is_recommended === 'true' || message.is_recommended === 1 || message.is_recommended === '1'
        };
    } catch (err) {
        console.error('Ошибка сохранения сообщения:', err);
        return null;
    } finally {
        client.release();
    }
}

export async function getRecommendedVacancies(chatId: number): Promise<any[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT DISTINCT v.id, v.title, v.salary, v.url, v.city,
                    m.recommended_by, u.name as recommended_by_name,
                    m.recommended_at
             FROM messages m
             JOIN vacancies v ON m.vacancy_id = v.id
             JOIN users u ON m.recommended_by = u.id
             WHERE m.chat_id = $1 AND m.is_recommended = true
             ORDER BY m.recommended_at DESC`,
            [chatId]
        );
        return result.rows;
    } catch (err) {
        console.error('Ошибка получения рекомендованных вакансий:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function getUserRoleInChat(chatId: number, userId: number): Promise<string | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT role FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        return result.rows[0]?.role || null;
    } finally {
        client.release();
    }
}

export async function addParticipantToGroup(chatId: number, targetUserId: number, currentUserId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const userCheck = await client.query(
            `SELECT role FROM users WHERE id = $1`,
            [currentUserId]
        );

        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return false;
        }

        const chatCheck = await client.query(
            `SELECT id, type FROM chats WHERE id = $1`,
            [chatId]
        );

        if (chatCheck.rows.length === 0 || chatCheck.rows[0].type !== 'group') {
            return false;
        }

        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id, role, joined_by) 
             VALUES ($1, $2, 'member', $3) ON CONFLICT DO NOTHING`,
            [chatId, targetUserId, currentUserId]
        );

        return true;
    } catch (err) {
        console.error('Ошибка добавления участника:', err);
        return false;
    } finally {
        client.release();
    }
}

export async function removeParticipantFromGroup(chatId: number, targetUserId: number, currentUserId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const userCheck = await client.query(
            `SELECT role FROM users WHERE id = $1`,
            [currentUserId]
        );

        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'teacher') {
            return false;
        }

        const chatCheck = await client.query(
            `SELECT id, type FROM chats WHERE id = $1`,
            [chatId]
        );

        if (chatCheck.rows.length === 0 || chatCheck.rows[0].type !== 'group') {
            return false;
        }

        const creatorCheck = await client.query(
            `SELECT created_by FROM chats WHERE id = $1`,
            [chatId]
        );

        if (creatorCheck.rows[0].created_by === targetUserId) {
            return false;
        }

        const result = await client.query(
            `DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, targetUserId]
        );

        return (result.rowCount || 0) > 0;
    } catch (err) {
        console.error('Ошибка удаления участника:', err);
        return false;
    } finally {
        client.release();
    }
}

export async function leaveGroup(chatId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const chatResult = await client.query(
            `SELECT created_by FROM chats WHERE id = $1 AND type = 'group'`,
            [chatId]
        );

        if (chatResult.rows.length === 0) return false;
        if (chatResult.rows[0].created_by === userId) return false;

        const result = await client.query(
            `DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );

        return (result.rowCount || 0) > 0;
    } catch (err) {
        console.error('Ошибка выхода из группы:', err);
        return false;
    } finally {
        client.release();
    }
}

export async function searchMessagesInChat(chatId: number, query: string, userId: number): Promise<Message[]> {
    const client = await pool.connect();
    try {
        const participantCheck = await client.query(
            `SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [chatId, userId]
        );

        if (participantCheck.rows.length === 0) {
            return [];
        }

        const result = await client.query(
            `SELECT m.*, u.name as sender_name, v.title as vacancy_title, v.salary, v.url, v.city
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             LEFT JOIN vacancies v ON m.vacancy_id = v.id
             WHERE m.chat_id = $1 
               AND m.text ILIKE $2
             ORDER BY m.created_at DESC
             LIMIT 100`,
            [chatId, `%${query}%`]
        );

        return result.rows.reverse();
    } catch (err) {
        console.error('Ошибка поиска сообщений:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function deleteGroup(chatId: number, userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
        const chatResult = await client.query(
            `SELECT created_by, type FROM chats WHERE id = $1`,
            [chatId]
        );

        if (chatResult.rows.length === 0) {
            return false;
        }

        const chat = chatResult.rows[0];

        if (chat.type !== 'group') {
            return false;
        }

        if (chat.created_by !== userId) {
            return false;
        }

        await client.query(`DELETE FROM messages WHERE chat_id = $1`, [chatId]);

        await client.query(`DELETE FROM chat_participants WHERE chat_id = $1`, [chatId]);

        await client.query(`DELETE FROM chats WHERE id = $1`, [chatId]);

        return true;
    } catch (err) {
        console.error('Ошибка удаления группы:', err);
        return false;
    } finally {
        client.release();
    }
}

export async function updateMessageWithTestRequirement(
    messageId: number,
    requiredTestId: number | null
): Promise<Message | null> {
    const client = await pool.connect();
    try {
        const messageResult = await client.query(
            'SELECT * FROM messages WHERE id = $1',
            [messageId]
        );
        
        if (messageResult.rows.length === 0) return null;
        const message = messageResult.rows[0];

        if (!message.vacancy_id) return null;

        const result = await client.query(
            `UPDATE messages 
             SET required_test_id = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [requiredTestId, messageId]
        );
        
        const updatedMessage = result.rows[0];

        const senderResult = await client.query(
            'SELECT name FROM users WHERE id = $1',
            [updatedMessage.sender_id]
        );

        let vacancyData = null;
        if (updatedMessage.vacancy_id) {
            const vacancyResult = await client.query(
                `SELECT title, salary, url, city FROM vacancies WHERE id = $1`,
                [updatedMessage.vacancy_id]
            );
            if (vacancyResult.rows.length > 0) {
                vacancyData = vacancyResult.rows[0];
            }
        }

        let testData = null;
        if (requiredTestId) {
            const testResult = await client.query(
                `SELECT title FROM tests WHERE id = $1`,
                [requiredTestId]
            );
            if (testResult.rows.length > 0) {
                testData = testResult.rows[0];
            }
        }
        
        return {
            ...updatedMessage,
            sender_name: senderResult.rows[0]?.name,
            vacancy_title: vacancyData?.title,
            salary: vacancyData?.salary,
            url: vacancyData?.url,
            city: vacancyData?.city,
            is_recommended: updatedMessage.is_recommended === true || updatedMessage.is_recommended === 'true' || updatedMessage.is_recommended === 1 || updatedMessage.is_recommended === '1',
            test_title: testData?.title
        };
    } catch (err) {
        console.error('Ошибка обновления сообщения:', err);
        return null;
    } finally {
        client.release();
    }
}
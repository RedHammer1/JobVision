import { Server, Socket } from 'socket.io';
import { saveMessage, getChatMessages } from '../db/chatQueries';
import { pool } from '../db';

interface ConnectedUser {
    socketId: string;
    userId: string;
    userName: string;
    chatRooms: Set<string>;
}

export class MessageHandler {
    private io: Server;
    private connectedUsers: Map<string, ConnectedUser>;
    private userSockets: Map<number, string[]>;

    constructor(io: Server) {
        this.io = io;
        this.connectedUsers = new Map();
        this.userSockets = new Map();
    }

    public handleConnection(socket: Socket): void {
        socket.on('join', async (data: { userId: string; userName: string; chatId: string }) => {
            await this.handleJoin(socket, data);
        });

        socket.on('send_message', async (messageData: { 
            text: string; 
            senderId: string; 
            senderName: string; 
            chatId: string;
            vacancyId?: string;
            recommendedBy?: number;
        }) => {
            await this.handleSendMessage(socket, messageData);
        });

        socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
            this.handleTyping(socket, data);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket);
        });
    }

    private async handleJoin(socket: Socket, data: { userId: string; userName: string; chatId: string }): Promise<void> {
        const { userId, userName, chatId } = data;
        const userIdNum = parseInt(userId);
        
        console.log(`📥 Пользователь ${userName} (${userId}) присоединился к чату ${chatId}`);
        
        this.connectedUsers.set(socket.id, {
            socketId: socket.id,
            userId: userId,
            userName: userName,
            chatRooms: new Set()
        });
        
        if (!this.userSockets.has(userIdNum)) {
            this.userSockets.set(userIdNum, []);
        }
        this.userSockets.get(userIdNum)!.push(socket.id);
        
        socket.join(chatId);
        this.connectedUsers.get(socket.id)?.chatRooms.add(chatId);
        
        try {
            const chatMessages = await getChatMessages(parseInt(chatId), 100, 0);
            console.log(`📊 Получено ${chatMessages.length} сообщений для чата ${chatId}`);
            
            const formattedMessages = await Promise.all(chatMessages.map(async (msg) => {
                let testPassed = true;
                let requiredTestId = msg.required_test_id;
                let testTitle = msg.test_title;
                
                if (msg.vacancy_id) {
                    const userCheck = await pool.query(
                        'SELECT role FROM users WHERE id = $1',
                        [userIdNum]
                    );
                    const isTeacher = userCheck.rows[0]?.role === 'teacher';
                    
                    if (!isTeacher) {
                        const requirementResult = await pool.query(
                            `SELECT test_id FROM test_vacancy_requirements WHERE vacancy_id = $1`,
                            [msg.vacancy_id]
                        );
                        
                        if (requirementResult.rows.length > 0) {
                            requiredTestId = requirementResult.rows[0].test_id;
                            
                            const testResult = await pool.query(
                                `SELECT title FROM tests WHERE id = $1`,
                                [requiredTestId]
                            );
                            testTitle = testResult.rows[0]?.title || null;
                            
                            const resultCheck = await pool.query(
                                `SELECT * FROM test_results 
                                 WHERE test_id = $1 AND user_id = $2 AND passed = true`,
                                [requiredTestId, userIdNum]
                            );
                            testPassed = resultCheck.rows.length > 0;
                            console.log(`Студент ${userId} ${testPassed ? 'прошел' : 'не прошел'} тест ${requiredTestId}`);

                        }
                    }
                }
                
                return {
                    id: msg.id.toString(),
                    text: msg.text,
                    senderId: msg.sender_id.toString(),
                    senderName: msg.sender_name || 'Unknown',
                    chatId: msg.chat_id.toString(),
                    timestamp: msg.created_at,
                    vacancyId: msg.vacancy_id,
                    recommendedBy: msg.recommended_by,
                    isRecommended: msg.is_recommended,
                    vacancyTitle: msg.vacancy_title,
                    salary: msg.salary,
                    url: msg.url,
                    city: msg.city,
                    requiredTestId: requiredTestId,
                    testTitle: testTitle,
                    testPassed: testPassed
                };
            }));
            
            console.log(`📤 Отправка ${formattedMessages.length} сообщений пользователю ${userId}`);
            socket.emit('chat_history', formattedMessages);
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
            socket.emit('chat_history', []);
        }
        
        socket.to(chatId).emit('user_connected', {
            userId,
            userName,
            message: `${userName} присоединился к чату`
        });
        
        this.sendOnlineUsers(chatId);
    }

    private async handleSendMessage(socket: Socket, messageData: { 
        text: string; 
        senderId: string; 
        senderName: string; 
        chatId: string;
        vacancyId?: string;
        recommendedBy?: number;
    }): Promise<void> {
        const { text, senderId, senderName, chatId, vacancyId, recommendedBy } = messageData;
        const senderIdNum = parseInt(senderId);
        
        try {
            let requiredTestId = null;
            let testTitle = null;
            let testPassed = true;
            
            if (vacancyId) {
                const userCheck = await pool.query(
                    'SELECT role FROM users WHERE id = $1',
                    [senderIdNum]
                );
                const isTeacher = userCheck.rows[0]?.role === 'teacher';
                
                if (!isTeacher) {
                    const requirementResult = await pool.query(
                        `SELECT test_id FROM test_vacancy_requirements WHERE vacancy_id = $1`,
                        [vacancyId]
                    );
                    
                    if (requirementResult.rows.length > 0) {
                        requiredTestId = requirementResult.rows[0].test_id;
                        
                        const testResult = await pool.query(
                            `SELECT title FROM tests WHERE id = $1`,
                            [requiredTestId]
                        );
                        testTitle = testResult.rows[0]?.title || null;
                        
                        const resultCheck = await pool.query(
                            `SELECT * FROM test_results 
                             WHERE test_id = $1 AND user_id = $2 AND passed = true`,
                            [requiredTestId, senderIdNum]
                        );
                        testPassed = resultCheck.rows.length > 0;
                        
                        if (!testPassed) {
                            socket.emit('error', {
                                message: 'Для отправки этой вакансии необходимо пройти тест',
                                testId: requiredTestId,
                                testTitle: testTitle
                            });
                            return;
                        }
                    }
                }
            }
            
            const savedMessage = await saveMessage(
                parseInt(chatId),
                senderIdNum,
                text,
                vacancyId,
                recommendedBy
            );
            
            if (savedMessage) {
                const newMessage = {
                    id: savedMessage.id.toString(),
                    text: savedMessage.text,
                    senderId: savedMessage.sender_id.toString(),
                    senderName: senderName,
                    chatId: savedMessage.chat_id.toString(),
                    timestamp: savedMessage.created_at,
                    vacancyId: savedMessage.vacancy_id,
                    recommendedBy: savedMessage.recommended_by,
                    isRecommended: savedMessage.is_recommended === true,
                    vacancyTitle: savedMessage.vacancy_title,
                    salary: savedMessage.salary,
                    url: savedMessage.url,
                    city: savedMessage.city,
                    requiredTestId: requiredTestId,
                    testTitle: testTitle,
                    testPassed: testPassed
                };
                
                console.log(`📤 Отправка сообщения с testPassed=${testPassed}`);
                this.io.to(chatId).emit('new_message', newMessage);
            }
        } catch (err) {
            console.error('Ошибка сохранения сообщения:', err);
        }
    }

    private handleTyping(socket: Socket, data: { chatId: string; isTyping: boolean }): void {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
            socket.to(data.chatId).emit('user_typing', {
                chatId: data.chatId,
                userId: user.userId,
                userName: user.userName,
                isTyping: data.isTyping
            });
        }
    }

    private handleDisconnect(socket: Socket): void {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
            const userIdNum = parseInt(user.userId);
            const sockets = this.userSockets.get(userIdNum);
            if (sockets) {
                const index = sockets.indexOf(socket.id);
                if (index !== -1) sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.userSockets.delete(userIdNum);
                }
            }
            
            user.chatRooms.forEach(chatId => {
                socket.to(chatId).emit('user_disconnected', {
                    userId: user.userId,
                    userName: user.userName,
                    message: `${user.userName} покинул чат`
                });
            });
            this.connectedUsers.delete(socket.id);
        }
        console.log(`Пользователь отключился: ${socket.id}`);
    }

    private sendOnlineUsers(chatId: string): void {
        const onlineUsers: { userId: string; userName: string }[] = [];
        this.connectedUsers.forEach(user => {
            if (user.chatRooms.has(chatId)) {
                onlineUsers.push({
                    userId: user.userId,
                    userName: user.userName
                });
            }
        });
        this.io.to(chatId).emit('online_users', onlineUsers);
    }

    public getUsersCount(): number {
        const uniqueUsers = new Set<string>();
        this.connectedUsers.forEach(user => {
            uniqueUsers.add(user.userId);
        });
        return uniqueUsers.size;
    }
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    chatId: string;
    timestamp: string;
    isOwn?: boolean;
    vacancyId?: string;
    vacancyTitle?: string;
    salary?: string;
    url?: string;
    city?: string;
    recommendedBy?: number;
    isRecommended?: boolean;
    recommendedAt?: string;
    requiredTestId?: number | null;
    testTitle?: string | null;
    testPassed?: boolean;
}

interface UseSocketOptions {
    userId: number;
    userName: string;
    chatId: number | null;
    onNewMessage?: (message: Message) => void;
    onMessageUpdated?: (message: Message) => void;
    onUserTyping?: (userId: string, userName: string, isTyping: boolean) => void;
    onUserConnected?: (userId: string, userName: string) => void;
    onUserDisconnected?: (userId: string, userName: string) => void;
    onChatHistory?: (messages: Message[]) => void;
    onOnlineUsers?: (users: { userId: string; userName: string }[]) => void;
}

export const useSocket = ({
    userId,
    userName,
    chatId,
    onNewMessage,
    onMessageUpdated,
    onUserTyping,
    onUserConnected,
    onUserDisconnected,
    onChatHistory,
    onOnlineUsers,
}: UseSocketOptions) => {
    const socketRef = useRef<Socket | null>(null);
    const [_, setIsConnected] = useState(false);

    useEffect(() => {
        if (!chatId) return;

        const socket = io('http://localhost:8080', {
            transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);

            socket.emit('join', {
                userId: userId.toString(),
                userName: userName,
                chatId: chatId.toString()
            });
        });

        socket.on('chat_history', (messages: Message[]) => {
            console.log('Получена история чата:', messages.length, 'сообщений');

            messages.forEach(msg => {
                if (msg.vacancyId) {
                    console.log(`Сообщение ${msg.id}: вакансия ${msg.vacancyTitle}, requiredTestId=${msg.requiredTestId}, testPassed=${msg.testPassed}`);
                }
            });

            const formatted = messages.map(msg => ({
                ...msg,
                isOwn: parseInt(msg.senderId) === userId,
                timestamp: msg.timestamp || new Date().toISOString(),
                isRecommended: msg.isRecommended === true,
                testPassed: msg.testPassed !== undefined ? msg.testPassed : true
            }));
            onChatHistory?.(formatted);
        });

        socket.on('new_message', (message: Message) => {
            console.log('Получено новое сообщение:', message);
            console.log(`requiredTestId=${message.requiredTestId}, testPassed=${message.testPassed}`);

            const formatted = {
                ...message,
                isOwn: parseInt(message.senderId) === userId,
                timestamp: message.timestamp || new Date().toISOString(),
                isRecommended: message.isRecommended === true,
                testPassed: message.testPassed !== undefined ? message.testPassed : true
            };
            onNewMessage?.(formatted);
        });

        socket.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
            onUserTyping?.(data.userId, data.userName, data.isTyping);
        });

        socket.on('message_updated', (message: Message) => {
            console.log('Сообщение обновлено:', message);
            if (onMessageUpdated) {
                onMessageUpdated(message);
            }
        });



        socket.on('user_connected', (data: { userId: string; userName: string }) => {
            onUserConnected?.(data.userId, data.userName);
        });

        socket.on('user_disconnected', (data: { userId: string; userName: string }) => {
            onUserDisconnected?.(data.userId, data.userName);
        });

        socket.on('online_users', (users: { userId: string; userName: string }[]) => {
            onOnlineUsers?.(users);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [chatId, userId, userName]);

    const sendMessage = useCallback((text: string) => {
        if (socketRef.current && chatId) {
            socketRef.current.emit('send_message', {
                text,
                senderId: userId.toString(),
                senderName: userName,
                chatId: chatId.toString()
            });
        }
    }, [chatId, userId, userName]);

    const sendTyping = useCallback((isTyping: boolean) => {
        if (socketRef.current && chatId) {
            socketRef.current.emit('typing', {
                chatId: chatId.toString(),
                isTyping
            });
        }
    }, [chatId]);

    return {
        sendMessage,
        sendTyping,
    };
};
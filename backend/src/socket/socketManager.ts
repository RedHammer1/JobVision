import { Server } from 'socket.io';
import { MessageHandler } from './messageHandler';

export class SocketManager {
    private io: Server;
    private messageHandler: MessageHandler;

    constructor(io: Server) {
        this.io = io;
        this.messageHandler = new MessageHandler(io);
    }

    public initialize(): void {
        this.io.on('connection', (socket) => {
            console.log(`Пользователь подключился: ${socket.id}`);
            this.messageHandler.handleConnection(socket);
        });
        console.log('Socket.IO сервер запущен');
    }

    public getStats(): { usersCount: number; chatsCount: number } {
        return {
            usersCount: this.messageHandler.getUsersCount(),
            chatsCount: 0
        };
    }
}
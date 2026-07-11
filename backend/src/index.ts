import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { testDatabaseConnection, initDatabase } from './db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import vacancyRoutes from './routes/vacancyRoutes';
import testRoutes from './routes/testRoutes';
import { SocketManager } from './socket/socketManager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
         origin: ['http://localhost:8080'],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/vacancies', vacancyRoutes);
app.use('/api/tests', testRoutes);

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        websocket: true
    });
});

const socketManager = new SocketManager(io);
socketManager.initialize();

const PORT = 8080;

httpServer.listen(PORT, async () => {
    console.log(`\nСервер запущен на порту ${PORT}`);
    console.log(`Socket.IO готов к подключениям на порту ${PORT}`);
    console.log(`API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`WebSocket доступен по адресу: ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`\nПодключение к базе данных...`);

    initDatabase();
    await testDatabaseConnection();
});

export { app, io, socketManager, httpServer };
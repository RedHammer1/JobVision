import { Router } from 'express';
import { 
    searchUsers, 
    getUserById, 
    getUserInfo,
    updateUserRole
} from '../db/userQueries';

const router = Router();


router.get('/search', async (req, res) => {
    const query = req.query.q as string;
    const currentUserId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : 0;
    
    console.log(`Поиск пользователей: query="${query}", currentUserId=${currentUserId}`);
    
    if (!query || query.length < 1) {
        return res.json([]);
    }
    
    try {
        const users = await searchUsers(query, currentUserId);
        console.log(`Найдено ${users.length} пользователей`);
        res.json(users);
    } catch (err) {
        console.error('Ошибка поиска пользователей:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


router.get('/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            tag: user.tag,
            role: user.role,
            created_at: user.created_at
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:userId/public', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    try {
        const info = await getUserInfo(userId);
        if (!info) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(info);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:userId/role', async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    
    if (!role || !['student', 'teacher'].includes(role)) {
        return res.status(400).json({ error: 'Некорректная роль' });
    }
    
    try {
        const user = await updateUserRole(userId, role);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            tag: user.tag,
            role: user.role
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;
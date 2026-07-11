import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser, getUserByEmail } from '../db/userQueries';

const router = Router();

router.post('/register', async (req, res) => {
    const { name, email, password, tag, role } = req.body;

    if (!name || !email || !password || !tag) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Некорректный email' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const tagRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!tagRegex.test(tag)) {
        return res.status(400).json({ error: 'Тег должен содержать 3-30 символов (буквы, цифры, _)' });
    }

    const userRole = role === 'teacher' ? 'teacher' : 'student';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser(name, email, hashedPassword, tag, userRole);
        
        if (!user) {
            return res.status(400).json({ error: 'Пользователь с таким email или тегом уже существует' });
        }

        res.status(201).json({ 
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

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    try {
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
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
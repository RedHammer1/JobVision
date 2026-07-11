import { pool } from './index';

export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    tag: string;
    role: 'student' | 'teacher';
    created_at: Date;
}

export interface UserPublicInfo {
    id: number;
    name: string;
    tag: string;
    role: string;
}

export async function createUser(
    name: string, 
    email: string, 
    password: string, 
    tag: string,
    role: 'student' | 'teacher' = 'student'
): Promise<User | null> {
    const client = await pool.connect();
    try {
        const existingTag = await client.query('SELECT id FROM users WHERE tag = $1', [tag]);
        if (existingTag.rows.length > 0) {
            return null;
        }

        const result = await client.query(
            `INSERT INTO users (name, email, password, tag, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, email, tag, role, created_at`,
            [name, email, password, tag, role]
        );
        return result.rows[0];
    } catch (err: any) {
        if (err.code === '23505') {
            console.error('Email already exists');
            return null;
        }
        throw err;
    } finally {
        client.release();
    }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, name, email, password, tag, role, created_at FROM users WHERE email = $1`,
            [email]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function getUserById(id: number): Promise<User | null> {
    if (isNaN(id) || id <= 0) {
        return null;
    }
    
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, name, email, password, tag, role, created_at FROM users WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function getUserInfo(userId: number): Promise<UserPublicInfo | null> {
    if (isNaN(userId) || userId <= 0) {
        return null;
    }
    
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT id, name, tag, role FROM users WHERE id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        
        return {
            id: row.id,
            name: row.name,
            tag: row.tag,
            role: row.role
        };
    } finally {
        client.release();
    }
}

export async function searchUsers(query: string, currentUserId: number): Promise<UserPublicInfo[]> {
    const client = await pool.connect();
    try {
        let cleanQuery = query.trim();
        if (cleanQuery.startsWith('@')) {
            cleanQuery = cleanQuery.substring(1);
        }
        
        const searchQuery = `%${cleanQuery.toLowerCase()}%`;
        
        const result = await client.query(
            `SELECT id, name, tag, role
             FROM users 
             WHERE (LOWER(name) LIKE $1 OR LOWER(tag) LIKE $1) AND id != $2
             ORDER BY 
               CASE 
                 WHEN LOWER(tag) LIKE $1 THEN 1 
                 WHEN LOWER(name) LIKE $1 THEN 2 
                 ELSE 3 
               END
             LIMIT 20`,
            [searchQuery, currentUserId]
        );
        
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            tag: row.tag,
            role: row.role
        }));
    } catch (err) {
        console.error('Ошибка поиска пользователей:', err);
        return [];
    } finally {
        client.release();
    }
}

export async function updateUserRole(userId: number, role: 'student' | 'teacher'): Promise<User | null> {
    if (isNaN(userId) || userId <= 0) {
        return null;
    }
    
    const client = await pool.connect();
    try {
        const result = await client.query(
            `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, tag, role, created_at`,
            [role, userId]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}
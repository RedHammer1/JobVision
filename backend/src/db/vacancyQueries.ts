import { pool } from './index';

export interface Vacancy {
    id: string;
    title: string;
    salary: string;
    url: string;
    city: string;
    scraped_at: Date;
}

export async function getVacancies(): Promise<Vacancy[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, title, salary, url, city FROM vacancies'
        );
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getVacanciesPaginated(
    limit: number = 50,
    offset: number = 0
): Promise<{ rows: Vacancy[]; total: number }> {
    const client = await pool.connect();
    try {
        const countResult = await client.query('SELECT COUNT(*) FROM vacancies');
        const total = parseInt(countResult.rows[0].count, 10);

        const result = await client.query(
            'SELECT id, title, salary, url, city FROM vacancies ORDER BY id LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        return { rows: result.rows, total };
    } finally {
        client.release();
    }
}

export async function searchVacanciesPaginated(
    query: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ rows: Vacancy[]; total: number }> {
    const client = await pool.connect();
    try {
        const cleanQuery = query.replace(/[%_]/g, '\\$&');
        const searchQuery = `%${cleanQuery.toLowerCase()}%`;

        const countResult = await client.query(
            `SELECT COUNT(*) FROM vacancies 
             WHERE LOWER(title) LIKE $1 
                OR LOWER(city) LIKE $1 
                OR LOWER(salary) LIKE $1`,
            [searchQuery]
        );
        const total = parseInt(countResult.rows[0].count, 10);
        
        console.log(`Поиск: "${query}", найдено: ${total}`);

        const result = await client.query(
            `SELECT id, title, salary, url, city 
             FROM vacancies 
             WHERE LOWER(title) LIKE $1 
                OR LOWER(city) LIKE $1 
                OR LOWER(salary) LIKE $1
             ORDER BY 
               CASE 
                 WHEN LOWER(title) LIKE $1 THEN 1
                 WHEN LOWER(city) LIKE $1 THEN 2
                 ELSE 3
               END
             LIMIT $2 OFFSET $3`,
            [searchQuery, limit, offset]
        );
        
        return { rows: result.rows, total };
    } catch (err) {
        console.error('Ошибка поиска вакансий:', err);
        return { rows: [], total: 0 };
    } finally {
        client.release();
    }
}

export async function getVacancyById(id: string): Promise<Vacancy | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, title, salary, url, city FROM vacancies WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function searchVacancies(query: string): Promise<Vacancy[]> {
    const client = await pool.connect();
    try {
        const searchQuery = `%${query.toLowerCase()}%`;
        const result = await client.query(
            `SELECT id, title, salary, url, city 
             FROM vacancies 
             WHERE LOWER(title) LIKE $1 OR LOWER(city) LIKE $1
             LIMIT 50`,
            [searchQuery]
        );
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getVacanciesByCity(city: string): Promise<Vacancy[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, title, salary, url, city FROM vacancies WHERE city = $1',
            [city]
        );
        return result.rows;
    } finally {
        client.release();
    }
}
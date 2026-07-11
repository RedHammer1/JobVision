import { Pool } from 'pg';

const pool = new Pool({
  user: 'admin', 
  host: 'localhost',
  database: 'messenger_db',
  password: 'password',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase(): Promise<void> {
    const client = await pool.connect();
    client.release();
}

export async function testDatabaseConnection(): Promise<void> {
    let client;
    try {
        client = await pool.connect();
        console.log('Успешное подключение к PostgreSQL');
        const res = await client.query('SELECT NOW() as current_time');
        console.log(`Текущее время БД: ${res.rows[0].current_time}`);
    } catch (err) {
        console.error('Ошибка подключения к PostgreSQL:', err);
        throw err;
    } finally {
        if (client) client.release();
    }
}

export { pool };
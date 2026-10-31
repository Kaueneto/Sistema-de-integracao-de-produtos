import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

export const db = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'grupo3_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000,
});

export async function initializeDatabase() {
  const schema = await readFile(
    fileURLToPath(new URL('../../sql/01-schema.sql', import.meta.url)),
    'utf8',
  );
  await db.query(schema);
}

export async function withTransaction(work) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

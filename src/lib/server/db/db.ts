import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema';

const { Pool } = pkg;

let connectionString: string | undefined;

let poolMaxStr: string | undefined;

try {
	const { env } = await import('$env/dynamic/private');
	connectionString = env.DATABASE_URL;
	poolMaxStr = env.DATABASE_POOL_MAX;
} catch (e) {
	const globalProcess = globalThis['process'];
	connectionString = globalProcess?.env?.['DATABASE_URL'];
	poolMaxStr = globalProcess?.env?.['DATABASE_POOL_MAX'];
}

connectionString = connectionString || 'postgres://postgres:password@localhost:5432/stratos';
const maxPool = poolMaxStr ? parseInt(poolMaxStr, 10) : 10;

// Use a connection pool for the server
const pool = new Pool({
  connectionString,
  max: maxPool, // Avoid exhausting connections
});

export const db = drizzle(pool, { schema });


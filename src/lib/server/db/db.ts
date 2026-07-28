import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema';

const { Pool } = pkg;

let connectionString: string | undefined;

try {
	const { env } = await import('$env/dynamic/private');
	connectionString = env.DATABASE_URL;
} catch (e) {
	const globalProcess = globalThis['process'];
	connectionString = globalProcess?.env?.['DATABASE_URL'];
}

connectionString = connectionString || 'postgres://postgres:password@localhost:5432/stratos';

// Use a connection pool for the server
const pool = new Pool({
  connectionString,
  max: 10, // Avoid exhausting connections
});

export const db = drizzle(pool, { schema });


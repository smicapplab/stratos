import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const { Pool } = pkg;

const connectionString = env.DATABASE_URL || (dev ? 'postgres://postgres:password@localhost:5432/stratos' : undefined);

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required in production.');
}

// Use a connection pool for the server
const pool = new Pool({
  connectionString,
  max: 10, // Avoid exhausting connections
});

export const db = drizzle(pool, { schema });

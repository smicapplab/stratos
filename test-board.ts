import { db } from './src/lib/server/db/db';
import { boards } from './src/lib/server/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
	const b = await db.select().from(boards).where(eq(boards.id, '2d6add89-81e0-4d10-94d3-ceecf8eb3860'));
	console.log(b);
	process.exit(0);
}
run().catch(console.error);

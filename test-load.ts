import { load } from './src/routes/(app)/boards/[id]/+page.server.ts';
import { db } from './src/lib/server/db/db';
import { users } from './src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
	const user = await db.select().from(users).where(eq(users.email, 's.torrefranca@gmail.com')).limit(1).then(r => r[0]);
	if (!user) throw new Error('User not found');
	
	const event = {
		params: { id: '2d6add89-81e0-4d10-94d3-ceecf8eb3860' },
		locals: { user: user }
	};
	
	try {
		const result = await load(event as any);
		console.log('SUCCESS');
	} catch (err) {
		console.error('ERROR:', err);
	}
	process.exit(0);
}
run();

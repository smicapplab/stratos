import { db } from '$lib/server/db/db';
import { users } from '$lib/server/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { escapeLikePattern } from '$lib/utils';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const q = url.searchParams.get('q');
	
	const conditions = [eq(users.groupId, locals.user.groupId)];
	if (q && q.trim().length > 0) {
		conditions.push(ilike(users.name, `%${escapeLikePattern(q)}%`));
	}

	const searchResults = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email
		})
		.from(users)
		.where(and(...conditions))
		.limit(10);

	return json(searchResults);
}

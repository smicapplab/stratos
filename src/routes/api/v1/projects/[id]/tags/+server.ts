import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProjectTags, createTag } from '$lib/server/services/tags';
import { db } from '$lib/server/db/db';
import { tags } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const projectId = params.id;
		const projectTags = await getProjectTags(user, projectId);
		return json(projectTags);
	} catch (err: any) {
		console.error('Failed to get project tags:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const projectId = params.id;
		const body = await request.json();
		const name = body.name?.toString().trim();
		const color = body.color?.toString().trim() || 'blue';

		if (!name) {
			return json({ error: 'Tag name required' }, { status: 400 });
		}

		// Case-insensitive upsert lookup to prevent duplicates
		const [existing] = await db.select()
			.from(tags)
			.where(
				and(
					eq(tags.projectId, projectId),
					isNull(tags.deletedAt),
					sql`LOWER(${tags.name}) = LOWER(${name})`
				)
			)
			.limit(1);

		if (existing) {
			return json(existing, { status: 200 });
		}

		const newTag = await createTag(user, projectId, name, color);
		return json(newTag, { status: 201 });
	} catch (err: any) {
		console.error('Failed to upsert tag:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

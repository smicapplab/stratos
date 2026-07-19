import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { tasks } from '$lib/server/db/schema';
import { eq, and, isNull, isNotNull, gte } from 'drizzle-orm';
import { createTask } from '$lib/server/services/tasks';

export const GET: RequestHandler = async ({ locals, url, request }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const projectId = url.searchParams.get('projectId');
		const includeDeleted = url.searchParams.get('includeDeleted') === 'true';
		const onlyDeleted = url.searchParams.get('onlyDeleted') === 'true';
		const updatedSinceStr = url.searchParams.get('updatedSince');

		// 1. Validate updatedSince before building conditions — fail explicitly on bad input
		let updatedSinceDate: Date | null = null;
		if (updatedSinceStr) {
			updatedSinceDate = new Date(updatedSinceStr);
			if (isNaN(updatedSinceDate.getTime())) {
				return json(
					{ error: 'Invalid updatedSince value. Expected an ISO-8601 UTC timestamp (e.g. 2026-07-19T00:00:00Z).' },
					{ status: 400 }
				);
			}
		}

		// 2. Build Query Conditions
		const conditions = [eq(tasks.groupId, user.groupId)];

		if (projectId) {
			conditions.push(eq(tasks.projectId, projectId));
		}

		if (onlyDeleted) {
			conditions.push(isNotNull(tasks.deletedAt));
		} else if (!includeDeleted) {
			conditions.push(isNull(tasks.deletedAt));
		}

		if (updatedSinceDate) {
			conditions.push(gte(tasks.updatedAt, updatedSinceDate));
		}

		// 3. Query Postgres — explicit projection only, no select *
		const fetchedTasks = await db.select({
			id: tasks.id,
			groupId: tasks.groupId,
			projectId: tasks.projectId,
			boardId: tasks.boardId,
			stageId: tasks.stageId,
			parentTaskId: tasks.parentTaskId,
			title: tasks.title,
			description: tasks.description,
			number: tasks.number,
			priority: tasks.priority,
			assigneeId: tasks.assigneeId,
			dueDate: tasks.dueDate,
			orderIndex: tasks.orderIndex,
			sourceId: tasks.sourceId,
			customFields: tasks.customFields,
			checklists: tasks.checklists,
			deletedAt: tasks.deletedAt,
			createdAt: tasks.createdAt,
			updatedAt: tasks.updatedAt
		}).from(tasks).where(and(...conditions));

		// 4. Return X-Sync-Timestamp header representing current server time
		const syncTimestamp = new Date().toISOString();

		// Handle Conditional Fetch (If-Modified-Since check for caching optimization)
		const ifModifiedSince = request.headers.get('If-Modified-Since');
		if (ifModifiedSince && updatedSinceDate && fetchedTasks.length === 0) {
			const modDate = new Date(ifModifiedSince);
			if (!isNaN(modDate.getTime()) && modDate.getTime() >= updatedSinceDate.getTime()) {
				return new Response(null, {
					status: 304,
					headers: { 'X-Sync-Timestamp': syncTimestamp }
				});
			}
		}

		return json(fetchedTasks, {
			headers: { 'X-Sync-Timestamp': syncTimestamp }
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Internal Server Error';
		console.error('Failed to get tasks:', err);
		return json({ error: message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { stageId, title, previousIndex, nextIndex, parentTaskId } = body;

		if (!stageId || !title) {
			return json({ error: 'Missing required fields: stageId, title' }, { status: 400 });
		}

		const newTask = await createTask(
			user,
			stageId,
			title,
			previousIndex || null,
			nextIndex || null,
			parentTaskId || null
		);

		return json(newTask, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Internal Server Error';
		console.error('Failed to create task:', err);
		return json({ error: message }, { status: 500 });
	}
};

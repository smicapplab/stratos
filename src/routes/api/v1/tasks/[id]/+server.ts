import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { updateTask, softDeleteTask } from '$lib/server/services/tasks';
import { getCustomFields } from '$lib/server/services/customFields';
import { invalidateDashboardCache } from '$lib/server/redis';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;
		const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

		const conditions = [
			eq(tasks.id, taskId),
			eq(tasks.groupId, user.groupId)
		];

		if (!includeDeleted) {
			conditions.push(isNull(tasks.deletedAt));
		}

		const [task] = await db.select({
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
		}).from(tasks).where(and(...conditions)).limit(1);

		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		const syncTimestamp = new Date().toISOString();

		return json(task, {
			headers: { 'X-Sync-Timestamp': syncTimestamp }
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Internal Server Error';
		console.error('Failed to get task detail:', err);
		return json({ error: message }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;
		const body = await request.json();

		// Fetch existing task to find boardId for custom field definitions
		const [existingTask] = await db.select({
			boardId: tasks.boardId,
			stageId: tasks.stageId,
			priority: tasks.priority,
			dueDate: tasks.dueDate
		})
		.from(tasks)
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.groupId, user.groupId),
				isNull(tasks.deletedAt)
			)
		)
		.limit(1);

		if (!existingTask) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// 1. Custom Fields Validation
		if (body.customFields && existingTask.boardId) {
			const definitions = await getCustomFields(user, existingTask.boardId);
			const fieldsToValidate = body.customFields;

			for (const key of Object.keys(fieldsToValidate)) {
				const val = fieldsToValidate[key];
				if (val === null || val === undefined) continue;

				const def = definitions.find(d => d.name === key || d.id === key);
				if (!def) {
					return json({ error: `Custom field '${key}' is not defined on this board.` }, { status: 422 });
				}

				// Validate types
				if (def.type === 'number' && typeof val !== 'number') {
					return json({ error: `Custom field '${def.name}' must be a number.` }, { status: 422 });
				}
				if (def.type === 'select' && Array.isArray(def.options)) {
					const opts = def.options as string[];
					if (!opts.includes(String(val))) {
						return json({ error: `Value '${val}' is not a valid option for custom field '${def.name}'.` }, { status: 422 });
					}
				}
				if (def.type === 'multi-select' && Array.isArray(def.options)) {
					const opts = def.options as string[];
					if (!Array.isArray(val) || !val.every(v => opts.includes(String(v)))) {
						return json({ error: `Value for custom field '${def.name}' must be an array of valid options.` }, { status: 422 });
					}
				}
			}
		}

		// 2. Perform Update
		const updatedTask = await updateTask(user, taskId, body);

		// 3. Selective Dashboard Cache Invalidation (Only if metrics-affecting fields change)
		const stageChanged = body.stageId !== undefined && body.stageId !== existingTask.stageId;
		const priorityChanged = body.priority !== undefined && body.priority !== existingTask.priority;
		const dueDateChanged = body.dueDate !== undefined && 
			(existingTask.dueDate ? new Date(body.dueDate).getTime() !== new Date(existingTask.dueDate).getTime() : true);

		if (stageChanged || priorityChanged || dueDateChanged) {
			await invalidateDashboardCache(user.groupId);
		}

		return json(updatedTask);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Internal Server Error';
		console.error('Failed to update task:', err);
		return json({ error: message }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const taskId = params.id;

		// Perform soft delete with child orphan cleanup (handled in service layer transaction)
		await softDeleteTask(user, taskId);

		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Internal Server Error';
		console.error('Failed to delete task:', err);
		return json({ error: message }, { status: 500 });
	}
};

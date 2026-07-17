import { db } from '$lib/server/db/db';
import { boards, users } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getBoardStages, createStage, updateStage, moveStage } from '$lib/server/services/stages';
import { getBoardTasks, createTask, moveTask, softDeleteTask, updateTask, type TaskUpdatePayload } from '$lib/server/services/tasks';
import { updateBoard, deleteBoard } from '$lib/server/services/boards';
import { getCustomFields, createCustomField, deleteCustomField } from '$lib/server/services/customFields';
import { getProjectTags } from '$lib/server/services/tags';
import { fail, error, redirect } from '@sveltejs/kit';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const actor = locals.user!;
	const boardId = params.id;
	
	// Fetch Board
	const [board] = await db.select({
		id: boards.id,
		name: boards.name,
		projectId: boards.projectId,
		groupId: boards.groupId,
		creatorId: boards.creatorId
	}).from(boards).where(
		and(
			eq(boards.id, boardId),
			isNull(boards.deletedAt)
		)
	);
	if (!board || board.groupId !== actor.groupId) {
		throw error(404, 'Board not found');
	}

	// Fetch Stages
	const boardStages = await getBoardStages(actor, boardId);
	const stageIds = boardStages.map(s => s.id);

	// Fetch Tasks
	const tasks = stageIds.length > 0 ? await getBoardTasks(actor.groupId, stageIds) : [];

	// Fetch Group Users for Assignment
	const groupUsers = await db.select({
		id: users.id,
		name: users.name,
		role: users.role
	}).from(users).where(
		and(
			eq(users.groupId, actor.groupId),
			isNull(users.deletedAt)
		)
	);

	// Fetch Custom Fields
	const customFields = await getCustomFields(actor, boardId);

	// Fetch Project Tags if the board belongs to a project
	const projectTags = board.projectId ? await getProjectTags(actor, board.projectId) : [];

	return {
		board,
		stages: boardStages,
		tasks,
		groupUsers,
		customFields,
		projectTags,
		user: actor
	};
}

export const actions: Actions = {
	createStage: async ({ request, params, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const nextIndex = data.get('nextIndex')?.toString() || null;
		const previousIndex = data.get('previousIndex')?.toString() || null;

		if (!name) return fail(400, { error: 'Stage name required' });

		try {
			await createStage(locals.user!, params.id, name, previousIndex, nextIndex);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	updateBoard: async ({ request, params, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const projectId = data.get('projectId')?.toString();

		try {
			await updateBoard(locals.user!, params.id, {
				...(name ? { name } : {}),
				...(projectId ? { projectId } : {})
			});
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(400, { error: error.message });
		}
	},

	deleteBoard: async ({ params, locals }) => {
		try {
			await deleteBoard(locals.user!, params.id);
		} catch (err) {
			const error = err as Error;
			return fail(400, { error: error.message });
		}
		throw redirect(303, '/');
	},

	moveStage: async ({ request, locals }) => {
		const data = await request.formData();
		const stageId = data.get('stageId')?.toString();
		let previousIndex = data.get('previousIndex')?.toString() || null;
		let nextIndex = data.get('nextIndex')?.toString() || null;
		
		if (previousIndex === 'null' || previousIndex === '') previousIndex = null;
		if (nextIndex === 'null' || nextIndex === '') nextIndex = null;

		if (!stageId) return fail(400, { error: 'Stage ID is required' });
		
		try {
			await moveStage(locals.user!, stageId, previousIndex, nextIndex);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(400, { error: error.message });
		}
	},
	updateStage: async ({ request, locals }) => {
		const data = await request.formData();
		const stageId = data.get('stageId')?.toString();
		const name = data.get('name')?.toString();
		const isCompleted = data.get('isCompleted') === 'true';

		if (!stageId) return fail(400, { error: 'Stage ID required' });
		
		try {
			await updateStage(locals.user!, stageId, { 
				...(name ? { name } : {}),
				...(data.has('isCompleted') ? { isCompleted } : {})
			});
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(400, { error: error.message });
		}
	},
	createTask: async ({ request, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const stageId = data.get('stageId')?.toString();
		const previousIndex = data.get('previousIndex')?.toString() || null;
		const nextIndex = data.get('nextIndex')?.toString() || null;
		const parentTaskId = data.get('parentTaskId')?.toString() || null;

		if (!title || !stageId) return fail(400, { error: 'Title and Stage are required' });

		try {
			await createTask(locals.user!, stageId, title, previousIndex, nextIndex, parentTaskId);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	moveTask: async ({ request, locals }) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const stageId = data.get('stageId')?.toString();
		const previousIndex = data.get('previousIndex')?.toString() || null;
		const nextIndex = data.get('nextIndex')?.toString() || null;

		if (!taskId || !stageId) return fail(400, { error: 'Task and Stage are required' });

		try {
			await moveTask(locals.user!, taskId, stageId, previousIndex, nextIndex);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	softDeleteTask: async ({ request, locals }) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();

		if (!taskId) return fail(400, { error: 'Task ID is required' });

		try {
			await softDeleteTask(locals.user!, taskId);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	updateTask: async ({ request, locals }) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const priority = data.get('priority')?.toString() || 'Medium';
		const assigneeId = data.get('assigneeId')?.toString() || null;
		const dueDate = data.get('dueDate')?.toString() || null;
		const stageId = data.get('stageId')?.toString();
		
		let checklists: { id: string; text: string; completed: boolean }[] = [];
		try {
			checklists = JSON.parse(data.get('checklists')?.toString() || '[]');
		} catch (err) {
			// ignore parse error
		}

		let customFields: Record<string, unknown> = {};
		try {
			if (data.has('customFields')) {
				customFields = JSON.parse(data.get('customFields')?.toString() || '{}');
			}
		} catch (err) {
			// ignore parse error
		}

		if (!taskId || !title) return fail(400, { error: 'Task ID and Title are required' });

		try {
			const updatePayload: TaskUpdatePayload = { 
				title, description, priority, 
				assigneeId, 
				dueDate: dueDate ? new Date(dueDate) : null,
				checklists,
				...(stageId ? { stageId } : {})
			};
			if (data.has('customFields')) {
				updatePayload.customFields = customFields;
			}
			await updateTask(locals.user!, taskId, updatePayload);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	linkSubtask: async ({ request, locals }) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const parentTaskId = data.get('parentTaskId')?.toString() ?? null;

		if (!taskId || parentTaskId === null) return fail(400, { error: 'Task ID and Parent Task ID are required' });

		try {
			await updateTask(locals.user!, taskId, { parentTaskId: parentTaskId === '' ? null : parentTaskId });
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	createCustomField: async ({ request, params, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const type = data.get('type')?.toString();
		
		let options: string[] = [];
		try {
			options = JSON.parse(data.get('options')?.toString() || '[]');
		} catch (err) {
			// ignore parse error
		}

		if (!name || !type) return fail(400, { error: 'Name and type are required' });

		try {
			await createCustomField(locals.user!, params.id, name, type, options);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	deleteCustomField: async ({ request, locals }) => {
		const data = await request.formData();
		const fieldId = data.get('fieldId')?.toString();
		if (!fieldId) return fail(400, { error: 'Field ID required' });
		
		try {
			await deleteCustomField(locals.user!, fieldId);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	}
};

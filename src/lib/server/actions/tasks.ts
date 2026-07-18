import { fail } from '@sveltejs/kit';
import { createTask, updateTask, softDeleteTask, moveTask } from '$lib/server/services/tasks';
import type { TaskUpdatePayload } from '$lib/server/services/tasks';
import type { RequestEvent } from '@sveltejs/kit';

export const taskActions = {
	createTask: async ({ request, locals }: RequestEvent) => {
		const actor = locals.user;
		if (!actor) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const title = data.get('title')?.toString();
		const stageId = data.get('stageId')?.toString();
		const previousIndex = data.get('previousIndex')?.toString() || null;
		const nextIndex = data.get('nextIndex')?.toString() || null;
		const parentTaskId = data.get('parentTaskId')?.toString() || null;

		if (!title || !stageId) return fail(400, { error: 'Title and Stage are required' });

		try {
			await createTask(actor, stageId, title, previousIndex, nextIndex, parentTaskId);
			return { success: true };
		} catch (e: unknown) {
			const err = e instanceof Error ? e.message : 'Failed to create task';
			return fail(400, { error: err });
		}
	},

	moveTask: async ({ request, locals }: RequestEvent) => {
		const actor = locals.user;
		if (!actor) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const stageId = data.get('stageId')?.toString();
		const previousIndex = data.get('previousIndex')?.toString() || null;
		const nextIndex = data.get('nextIndex')?.toString() || null;

		if (!taskId || !stageId) return fail(400, { error: 'Task and Stage are required' });

		try {
			await moveTask(actor, taskId, stageId, previousIndex, nextIndex);
			return { success: true };
		} catch (e: unknown) {
			const err = e instanceof Error ? e.message : 'Failed to move task';
			return fail(400, { error: err });
		}
	},
	updateTask: async ({ request, locals }: RequestEvent) => {
		const actor = locals.user;
		if (!actor) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const priority = data.get('priority')?.toString() || 'Medium';
		const assigneeId = data.get('assigneeId')?.toString() || null;
		const dueDateStr = data.get('dueDate')?.toString() || null;
		const stageId = data.get('stageId')?.toString();
		
		let checklists = [];
		try {
			checklists = JSON.parse(data.get('checklists')?.toString() || '[]');
		} catch (err) {
			return fail(400, { error: 'Invalid checklist format' });
		}

		let customFields = {};
		try {
			if (data.has('customFields')) {
				customFields = JSON.parse(data.get('customFields')?.toString() || '{}');
			}
		} catch (err) {
			return fail(400, { error: 'Invalid custom fields format' });
		}

		if (!taskId || !title) return fail(400, { error: 'Task ID and Title are required' });

		if (dueDateStr && isNaN(new Date(dueDateStr).getTime())) {
			return fail(400, { error: 'Invalid due date format' });
		}

		try {
			const updatePayload: TaskUpdatePayload = { 
				title, description, priority, 
				assigneeId, 
				dueDate: dueDateStr ? new Date(dueDateStr) : null,
				checklists,
				...(stageId ? { stageId } : {})
			};
			if (data.has('customFields')) {
				updatePayload.customFields = customFields as Record<string, string | number | boolean | null>;
			}
			await updateTask(actor, taskId, updatePayload);
			return { success: true };
		} catch (e: unknown) {
			const err = e instanceof Error ? e.message : 'Failed to update task';
			return fail(400, { error: err });
		}
	},

	linkSubtask: async ({ request, locals }: RequestEvent) => {
		const actor = locals.user;
		if (!actor) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const parentTaskId = data.get('parentTaskId')?.toString() ?? null;

		if (!taskId || parentTaskId === null) return fail(400, { error: 'Task ID and Parent Task ID are required' });

		try {
			await updateTask(actor, taskId, { parentTaskId: parentTaskId === '' ? null : parentTaskId });
			return { success: true };
		} catch (e: unknown) {
			const err = e instanceof Error ? e.message : 'Failed to link subtask';
			return fail(400, { error: err });
		}
	},

	softDeleteTask: async ({ request, locals }: RequestEvent) => {
		const actor = locals.user;
		if (!actor) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		if (!taskId) return fail(400, { error: 'Task ID required' });

		try {
			await softDeleteTask(actor, taskId);
			return { success: true };
		} catch (e: unknown) {
			const err = e instanceof Error ? e.message : 'Failed to delete task';
			return fail(400, { error: err });
		}
	}
};

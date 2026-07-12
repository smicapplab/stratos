import { fail } from '@sveltejs/kit';
import { createTask, updateTask, softDeleteTask, moveTask } from '$lib/server/services/tasks';
import type { RequestEvent } from '@sveltejs/kit';

export const taskActions = {
	createTask: async ({ request, locals }: RequestEvent) => {
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
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	moveTask: async ({ request, locals }: RequestEvent) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const stageId = data.get('stageId')?.toString();
		const previousIndex = data.get('previousIndex')?.toString() || null;
		const nextIndex = data.get('nextIndex')?.toString() || null;

		if (!taskId || !stageId) return fail(400, { error: 'Task and Stage are required' });

		try {
			await moveTask(locals.user!, taskId, stageId, previousIndex, nextIndex);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},
	updateTask: async ({ request, locals }: RequestEvent) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString() || null;
		const priority = data.get('priority')?.toString() || 'Medium';
		const assigneeId = data.get('assigneeId')?.toString() || null;
		const dueDate = data.get('dueDate')?.toString() || null;
		const stageId = data.get('stageId')?.toString();
		
		let checklists = [];
		try {
			checklists = JSON.parse(data.get('checklists')?.toString() || '[]');
		} catch (e) {}

		let customFields = {};
		try {
			if (data.has('customFields')) {
				customFields = JSON.parse(data.get('customFields')?.toString() || '{}');
			}
		} catch (e) {}

		if (!taskId || !title) return fail(400, { error: 'Task ID and Title are required' });

		try {
			const updatePayload: any = { 
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
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	linkSubtask: async ({ request, locals }: RequestEvent) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		const parentTaskId = data.get('parentTaskId')?.toString() ?? null;

		if (!taskId || parentTaskId === null) return fail(400, { error: 'Task ID and Parent Task ID are required' });

		try {
			await updateTask(locals.user!, taskId, { parentTaskId: parentTaskId === '' ? null : parentTaskId });
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	softDeleteTask: async ({ request, locals }: RequestEvent) => {
		const data = await request.formData();
		const taskId = data.get('taskId')?.toString();
		if (!taskId) return fail(400, { error: 'Task ID required' });

		try {
			await softDeleteTask(locals.user!, taskId);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	}
};

import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { tasks, projects } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const taskId = params.id;

	// Validate UUID format
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(taskId)) {
		throw error(404, 'Task not found');
	}

	// Fetch task and project info
	const [taskInfo] = await db.select({
		boardId: tasks.boardId,
		projectId: tasks.projectId,
		projectName: projects.name
	})
	.from(tasks)
	.innerJoin(projects, eq(tasks.projectId, projects.id))
	.where(
		and(
			eq(tasks.id, taskId),
			eq(tasks.groupId, locals.user.groupId),
			isNull(tasks.deletedAt)
		)
	)
	.limit(1);

	if (!taskInfo) {
		throw error(404, 'Task not found');
	}

	// Route based on project category
	if (taskInfo.projectName === 'System Support & Tickets') {
		throw redirect(302, `/helpdesk/tickets/${taskId}`);
	} else {
		throw redirect(302, `/boards/${taskInfo.boardId}?task=${taskId}`);
	}
};

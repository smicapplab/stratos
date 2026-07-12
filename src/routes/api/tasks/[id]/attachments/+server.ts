import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { attachments, tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const taskId = params.id;

	// Verify the task belongs to the user's group
	const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, locals.user.groupId)));
	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	const taskAttachments = await db.select({
		id: attachments.id,
		taskId: attachments.taskId,
		uploaderId: attachments.uploaderId,
		fileName: attachments.fileName,
		fileUrl: attachments.fileUrl,
		mimeType: attachments.mimeType,
		createdAt: attachments.createdAt
	}).from(attachments).where(eq(attachments.taskId, taskId)).orderBy(attachments.createdAt);

	return json(taskAttachments);
};

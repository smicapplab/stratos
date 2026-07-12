import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { attachments, tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { unlink } from 'fs/promises';
import { join } from 'path';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id: taskId, attachmentId } = params;

	// Verify the task belongs to the user's group
	const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, locals.user.groupId)));
	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	const [attachment] = await db.select({
		id: attachments.id,
		taskId: attachments.taskId,
		fileUrl: attachments.fileUrl,
		uploaderId: attachments.uploaderId
	}).from(attachments).where(eq(attachments.id, attachmentId));
	if (!attachment || attachment.taskId !== taskId) return json({ error: 'Attachment not found' }, { status: 404 });

	// Optional: we can check if locals.user.id === attachment.uploaderId || is Admin, but for now allow anyone in group to delete

	try {
		// Attempt to delete physical file
		if (attachment.fileUrl.startsWith('/uploads/')) {
			const safeName = attachment.fileUrl.split('/').pop() || '';
			if (safeName) {
				const filePath = join(process.cwd(), 'static', 'uploads', safeName);
				await unlink(filePath).catch(() => {}); // Ignore if file already deleted
			}
		}
	} catch (e) {}

	await db.delete(attachments).where(eq(attachments.id, attachmentId));

	return json({ success: true });
};

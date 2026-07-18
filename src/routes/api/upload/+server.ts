import { json } from '@sveltejs/kit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { db } from '$lib/server/db/db';
import { attachments, tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateUploadedFile } from '$lib/server/fileValidation';
import { generateFileToken } from '$lib/server/generateFileToken';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.formData();
		const file = data.get('file') as File;
		const taskId = data.get('taskId') as string;

		if (!file || !taskId) {
			return json({ error: 'Missing file or taskId' }, { status: 400 });
		}

		// Verify the task belongs to the user's group and is not deleted
		const [task] = await db.select({ id: tasks.id })
			.from(tasks)
			.where(and(eq(tasks.id, taskId), eq(tasks.groupId, locals.user.groupId), isNull(tasks.deletedAt)));
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Validate file size and type using our robust validation helper
		const validation = validateUploadedFile(file);
		if (!validation.valid) {
			return json({ error: validation.error }, { status: 400 });
		}

		// Ensure private uploads directory exists
		const uploadDir = path.resolve('uploads');
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}

		// Generate a safe, unique filename
		const uniqueId = crypto.randomUUID();
		const extension = path.extname(file.name);
		const uniqueFileName = `${uniqueId}${extension}`;
		const filePath = path.join(uploadDir, uniqueFileName);

		// Write file buffer to private directory
		const buffer = Buffer.from(await file.arrayBuffer());
		fs.writeFileSync(filePath, buffer);

		const [inserted] = await db.insert(attachments).values({
			taskId,
			uploaderId: locals.user.id,
			fileName: file.name,
			fileUrl: filePath,
			mimeType: file.type
		}).returning();

		// Generate preview token for secure previewing
		const token = await generateFileToken(
			locals.user,
			filePath,
			file.type || 'application/octet-stream',
			file.name
		);

		const tokenUrl = `/api/files/${token}`;

		return json({
			url: tokenUrl,
			attachment: {
				id: inserted.id,
				taskId: inserted.taskId,
				uploaderId: inserted.uploaderId,
				fileName: inserted.fileName,
				fileUrl: tokenUrl,
				mimeType: inserted.mimeType,
				createdAt: inserted.createdAt
			}
		});
	} catch (error) {
		console.error('Upload error:', error);
		const e = error as Error;
		return json({ error: e.message || 'Upload failed' }, { status: 400 });
	}
};

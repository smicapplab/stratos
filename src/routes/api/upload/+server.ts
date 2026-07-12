import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '$lib/server/db/db';
import { attachments, tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

import type { RequestHandler } from './$types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
	'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
	'application/pdf',
	'text/plain', 'text/csv',
]);

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

		// Verify the task belongs to the user's group
		const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.groupId, locals.user.groupId)));
		if (!task) return json({ error: 'Task not found' }, { status: 404 });

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 });
		}

		// Validate MIME type
		if (!ALLOWED_MIME_TYPES.has(file.type)) {
			return json({ error: 'File type not allowed' }, { status: 400 });
		}

		// Ensure uploads directory exists
		const uploadDir = join(process.cwd(), 'static', 'uploads');
		await mkdir(uploadDir, { recursive: true });

		// Use a safe filename derived from UUID, with extension from MIME type (not user input)
		const mimeToExt: Record<string, string> = {
			'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
			'image/webp': 'webp', 'image/svg+xml': 'svg',
			'application/pdf': 'pdf', 'text/plain': 'txt', 'text/csv': 'csv',
		};
		const ext = mimeToExt[file.type] || 'bin';
		const safeName = `${crypto.randomUUID()}.${ext}`;
		const filePath = join(uploadDir, safeName);
		
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filePath, buffer);

		const fileUrl = `/uploads/${safeName}`;

		const [attachment] = await db.insert(attachments).values({
			taskId,
			uploaderId: locals.user.id,
			fileName: file.name,
			fileUrl: fileUrl,
			mimeType: file.type
		}).returning();

		return json({ url: fileUrl, attachment });
	} catch (error) {
		console.error('Upload error:', error);
		return json({ error: 'Upload failed' }, { status: 500 });
	}
};

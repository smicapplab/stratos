import { json } from '@sveltejs/kit';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from '$lib/server/db/db';
import { attachments, tasks } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { validateUploadedFile, isVideoFile } from '$lib/server/fileValidation';
import { generateFileToken } from '$lib/server/generateFileToken';
import type { RequestHandler } from './$types';

const execFileAsync = promisify(execFile);

/**
 * Runs ffmpeg -movflags faststart to relocate the moov atom to the front of the MP4.
 * This is required for range-based seeking without buffering the whole file.
 * Skips silently if ffmpeg is not found on the system.
 */
async function applyFastStart(inputPath: string): Promise<void> {
	const tempPath = inputPath + '.tmp';
	try {
		await execFileAsync('ffmpeg', [
			'-i', inputPath,
			'-movflags', 'faststart',
			'-c', 'copy',
			'-y',
			tempPath
		]);
		fs.renameSync(tempPath, inputPath);
	} catch (err) {
		// ffmpeg not installed or failed — log and continue without fast-start
		console.warn('[Upload] ffmpeg fast-start pass skipped:', (err as Error).message);
		if (fs.existsSync(tempPath)) {
			fs.unlinkSync(tempPath);
		}
	}
}

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

		const validation = validateUploadedFile(file);
		if (!validation.valid) {
			return json({ error: validation.error }, { status: 400 });
		}

		const uploadDir = path.resolve('uploads');
		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true });
		}

		const uniqueId = crypto.randomUUID();
		const extension = path.extname(file.name);
		const uniqueFileName = `${uniqueId}${extension}`;
		const filePath = path.join(uploadDir, uniqueFileName);

		const buffer = Buffer.from(await file.arrayBuffer());
		fs.writeFileSync(filePath, buffer);

		// For video files, run ffmpeg fast-start pass so moov atom is at the front
		if (isVideoFile(file.type, file.name)) {
			await applyFastStart(filePath);
		}

		const [inserted] = await db.insert(attachments).values({
			taskId,
			uploaderId: locals.user.id,
			fileName: file.name,
			fileUrl: filePath,
			mimeType: file.type,
			storageBackend: 'local'
		}).returning();

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
				storageBackend: inserted.storageBackend,
				createdAt: inserted.createdAt
			}
		});
	} catch (error) {
		console.error('Upload error:', error);
		const e = error as Error;
		return json({ error: e.message || 'Upload failed' }, { status: 400 });
	}
};


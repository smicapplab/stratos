import { error, fail } from '@sveltejs/kit';
import { getHelpdeskTicket, submitHelpdeskComment } from '$lib/server/services/helpdesk';
import { markTaskNotificationsAsRead } from '$lib/server/services/notifications';
import { db } from '$lib/server/db/db';
import { attachments } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { generateFileToken } from '$lib/server/generateFileToken';
import { validateUploadedFile } from '$lib/server/fileValidation';
import { env as publicEnv } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Mark task notifications as read for this user
		await markTaskNotificationsAsRead(locals.user, params.id);

		const data = await getHelpdeskTicket(locals.user, params.id);
		
		const processedAttachments = [];
		for (const attachment of data.attachments) {
			const token = await generateFileToken(
				locals.user,
				attachment.fileUrl,
				attachment.mimeType || 'application/octet-stream',
				attachment.fileName
			);
			processedAttachments.push({
				id: attachment.id,
				fileName: attachment.fileName,
				mimeType: attachment.mimeType,
				createdAt: attachment.createdAt,
				uploader: attachment.uploader,
				tokenUrl: `/api/files/${token}`
			});
		}

		return {
			ticket: data.task,
			comments: data.comments,
			auditLogs: data.auditLogs,
			attachments: processedAttachments,
			publicOrigin: publicEnv.PUBLIC_ORIGIN || 'http://localhost:5173'
		};
	} catch (err) {
		const e = err as Error;
		if (e.message === 'Ticket not found') {
			throw error(404, 'Ticket not found');
		} else if (e.message === 'Access denied') {
			throw error(403, 'Access denied');
		}
		console.error('[Helpdesk Ticket Detail Loader] Error:', e);
		throw error(500, 'An unexpected error occurred');
	}
};

export const actions: Actions = {
	postComment: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const content = data.get('content')?.toString().trim();

		if (!content) {
			return fail(400, { error: 'Comment content cannot be empty.' });
		}

		try {
			await submitHelpdeskComment(locals.user, params.id, content);
			return { success: true };
		} catch (err) {
			const e = err as Error;
			return fail(400, { error: e.message || 'Failed to submit comment.' });
		}
	},

	uploadAttachment: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const files = data.getAll('files') as File[];

		if (!files || files.length === 0 || (files.length === 1 && files[0].size === 0)) {
			return fail(400, { error: 'No files provided for upload.' });
		}

		try {
			const uploadDir = path.resolve('uploads');
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}

			const uploadedList = [];

			for (const file of files) {
				if (file.size === 0) continue;

				// Validate file type and size
				const validation = validateUploadedFile(file);
				if (!validation.valid) {
					return fail(400, { error: validation.error });
				}

				const uniqueId = crypto.randomUUID();
				const extension = path.extname(file.name);
				const uniqueFileName = `${uniqueId}${extension}`;
				const filePath = path.join(uploadDir, uniqueFileName);

				const buffer = Buffer.from(await file.arrayBuffer());
				fs.writeFileSync(filePath, buffer);

				const [inserted] = await db.insert(attachments).values({
					taskId: params.id,
					uploaderId: locals.user.id,
					fileName: file.name,
					fileUrl: filePath,
					mimeType: file.type
				}).returning();

				// Generate preview token for immediate UI updates
				const token = await generateFileToken(
					locals.user,
					filePath,
					file.type || 'application/octet-stream',
					file.name
				);

				uploadedList.push({
					id: inserted.id,
					fileName: file.name,
					mimeType: file.type,
					createdAt: inserted.createdAt,
					uploader: {
						id: locals.user.id,
						name: locals.user.name
					},
					tokenUrl: `/api/files/${token}`
				});
			}

			return { success: true, uploadedAttachments: uploadedList };
		} catch (err) {
			const e = err as Error;
			return fail(400, { error: e.message || 'Failed to upload files.' });
		}
	}
};

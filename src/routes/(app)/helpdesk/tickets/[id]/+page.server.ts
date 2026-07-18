import { error, fail } from '@sveltejs/kit';
import { getHelpdeskTicket, submitHelpdeskComment } from '$lib/server/services/helpdesk';
import { markTaskNotificationsAsRead } from '$lib/server/services/notifications';
import { db } from '$lib/server/db/db';
import { attachments } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Mark task notifications as read for this user
		await markTaskNotificationsAsRead(locals.user, params.id);

		const data = await getHelpdeskTicket(locals.user, params.id);
		return {
			ticket: data.task,
			comments: data.comments,
			auditLogs: data.auditLogs,
			attachments: data.attachments
		};
	} catch (err) {
		const e = err as Error;
		if (e.message === 'Ticket not found') {
			throw error(404, 'Ticket not found');
		} else if (e.message === 'Access denied') {
			throw error(403, 'Access denied');
		}
		throw error(500, e.message || 'Failed to load ticket details.');
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
			return fail(500, { error: e.message || 'Failed to submit comment.' });
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
			const uploadDir = path.join(process.cwd(), 'static', 'uploads');
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}

			for (const file of files) {
				if (file.size === 0) continue;

				// Cap at 10MB
				if (file.size > 10 * 1024 * 1024) {
					throw new Error(`File ${file.name} exceeds the 10MB size limit.`);
				}

				const uniqueId = crypto.randomUUID();
				const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
				const uniqueFileName = `${uniqueId}-${sanitizedName}`;
				const filePath = path.join(uploadDir, uniqueFileName);

				const buffer = Buffer.from(await file.arrayBuffer());
				fs.writeFileSync(filePath, buffer);

				await db.insert(attachments).values({
					taskId: params.id,
					uploaderId: locals.user.id,
					fileName: file.name,
					fileUrl: `/uploads/${uniqueFileName}`,
					mimeType: file.type
				});
			}

			return { success: true };
		} catch (err) {
			const e = err as Error;
			return fail(500, { error: e.message || 'Failed to upload files.' });
		}
	}
};

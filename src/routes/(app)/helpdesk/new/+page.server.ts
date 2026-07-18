import { error, fail, redirect } from '@sveltejs/kit';
import { createHelpdeskTicket } from '$lib/server/services/helpdesk';
import { db } from '$lib/server/db/db';
import { attachments } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';
import { validateUploadedFile } from '$lib/server/fileValidation';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	return {};
};

export const actions: Actions = {
	submitTicket: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString().trim();
		const description = data.get('description')?.toString().trim() || '';
		const type = data.get('type')?.toString() as 'Bug' | 'Feature' | 'Support';

		if (!title) {
			return fail(400, { error: 'Title is required.' });
		}

		const validTypes = ['Bug', 'Feature', 'Support'];
		if (!type || !validTypes.includes(type)) {
			return fail(400, { error: 'Invalid ticket category.' });
		}

		try {
			// Process and validate files first before committing database writes
			const files = data.getAll('attachments') as File[];
			const validFiles = files.filter(f => f.size > 0);

			if (validFiles.length > 5) {
				return fail(400, { error: 'Maximum 5 files can be uploaded per ticket.' });
			}

			for (const file of validFiles) {
				const validation = validateUploadedFile(file);
				if (!validation.valid) {
					return fail(400, { error: `${file.name}: ${validation.error}` });
				}
			}

			// Create the ticket task
			const ticket = await createHelpdeskTicket(locals.user, type, title, description);

			if (validFiles.length > 0) {
				const uploadDir = path.resolve('uploads');
				if (!fs.existsSync(uploadDir)) {
					fs.mkdirSync(uploadDir, { recursive: true });
				}

				for (const file of validFiles) {
					const uniqueId = crypto.randomUUID();
					const extension = path.extname(file.name);
					const uniqueFileName = `${uniqueId}${extension}`;
					const filePath = path.join(uploadDir, uniqueFileName);

					const buffer = Buffer.from(await file.arrayBuffer());
					fs.writeFileSync(filePath, buffer);

					await db.insert(attachments).values({
						taskId: ticket.id,
						uploaderId: locals.user.id,
						fileName: file.name,
						fileUrl: filePath,
						mimeType: file.type
					});
				}
			}

			// Redirect back to the dashboard once submitted
			throw redirect(303, '/helpdesk/tickets');
		} catch (err) {
			// SvelteKit redirect uses a special error/response structure
			if (err && typeof err === 'object' && 'status' in err) throw err;
			const e = err as Error;
			console.error('[Submit Helpdesk Ticket Action] Error:', e);
			return fail(400, { error: 'Failed to submit ticket. An unexpected error occurred.' });
		}
	}
};

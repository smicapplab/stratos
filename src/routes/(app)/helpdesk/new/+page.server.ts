import { error, fail, redirect } from '@sveltejs/kit';
import { createHelpdeskTicket } from '$lib/server/services/helpdesk';
import { db } from '$lib/server/db/db';
import { attachments } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import * as fs from 'node:fs';
import * as path from 'node:path';
import crypto from 'node:crypto';

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
			const ticket = await createHelpdeskTicket(locals.user, type, title, description);

			// Process file uploads
			const files = data.getAll('attachments') as File[];
			if (files && files.length > 0 && !(files.length === 1 && files[0].size === 0)) {
				const uploadDir = path.join(process.cwd(), 'static', 'uploads');
				if (!fs.existsSync(uploadDir)) {
					fs.mkdirSync(uploadDir, { recursive: true });
				}

				for (const file of files) {
					if (file.size === 0) continue;

					// Cap file size at 10MB
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
						taskId: ticket.id,
						uploaderId: locals.user.id,
						fileName: file.name,
						fileUrl: `/uploads/${uniqueFileName}`,
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
			return fail(500, { error: e.message || 'Failed to submit ticket.' });
		}
	}
};

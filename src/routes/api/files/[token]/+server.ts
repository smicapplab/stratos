import { json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import fs from 'fs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const token = params.token;
	if (!token) {
		return json({ error: 'Token is required' }, { status: 400 });
	}

	try {
		const dataStr = await redis.get(`preview:token:${token}`);
		if (!dataStr) {
			return json({ error: 'Preview link expired or invalid' }, { status: 404 });
		}

		const { filePath, mimeType, fileName, userId, groupId } = JSON.parse(dataStr);

		// Verify that the token belongs to the requesting user and group
		if (userId !== locals.user.id || groupId !== locals.user.groupId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// Read file contents from the secure uploads folder
		if (!fs.existsSync(filePath)) {
			console.error(`[Files API] File not found on disk: ${filePath}`);
			return json({ error: 'File not found on disk' }, { status: 404 });
		}

		const fileBuffer = await fs.promises.readFile(filePath);

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': mimeType,
				'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`
			}
		});
	} catch (err) {
		console.error('[Files API] Unexpected error serving file:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};

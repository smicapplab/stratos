import * as fs from 'node:fs';
import * as path from 'node:path';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Only serve files with known safe image extensions.
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

const MIME_MAP: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const filename = params.filename;

	// Reject path traversal attempts and filenames with directory separators.
	if (!filename || filename.includes('/') || filename.includes('..') || filename.includes('\0')) {
		throw error(400, 'Invalid filename');
	}

	const ext = path.extname(filename).toLowerCase();
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		throw error(400, 'Unsupported file type');
	}

	const filePath = path.resolve('uploads/logos', filename);

	// Confirm the resolved path is still inside the expected directory.
	const logosDir = path.resolve('uploads/logos');
	if (!filePath.startsWith(logosDir + path.sep)) {
		throw error(400, 'Invalid filename');
	}

	if (!fs.existsSync(filePath)) {
		throw error(404, 'Logo not found');
	}

	const buffer = fs.readFileSync(filePath);
	const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';

	return new Response(buffer, {
		headers: {
			'Content-Type': mimeType,
			// Cache for 1 hour in the browser; logos rarely change.
			'Cache-Control': 'private, max-age=3600'
		}
	});
};

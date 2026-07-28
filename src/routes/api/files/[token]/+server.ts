import { json } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { RequestHandler } from './$types';

interface TokenData {
	filePath: string;
	mimeType: string;
	fileName: string;
	userId: string;
	groupId: string;
}

function parseRangeHeader(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
	const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
	if (!match) return null;

	const startStr = match[1];
	const endStr = match[2];

	let start: number;
	let end: number;

	if (!startStr && endStr) {
		// Suffix range: bytes=-N means last N bytes
		const suffixLength = parseInt(endStr, 10);
		start = Math.max(0, fileSize - suffixLength);
		end = fileSize - 1;
	} else {
		start = parseInt(startStr, 10);
		end = endStr ? parseInt(endStr, 10) : fileSize - 1;
	}

	// Clamp end to last valid byte
	end = Math.min(end, fileSize - 1);

	if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
		return null;
	}

	return { start, end };
}

export const GET: RequestHandler = async ({ params, request, locals }) => {
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

		const { filePath, mimeType, fileName, userId, groupId } = JSON.parse(dataStr) as TokenData;

		if (userId !== locals.user.id || groupId !== locals.user.groupId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		if (!fs.existsSync(filePath)) {
			console.error(`[Files API] File not found on disk: ${filePath}`);
			return json({ error: 'File not found on disk' }, { status: 404 });
		}

		const isVideo = mimeType.startsWith('video/');

		if (!isVideo) {
			// Non-video: keep original behaviour — full buffer, 200 OK
			const fileBuffer = await fs.promises.readFile(filePath);
			return new Response(fileBuffer, {
				headers: {
					'Content-Type': mimeType,
					'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`
				}
			});
		}

		// Video: support HTTP Range Requests for instant seeking
		const { size: fileSize } = fs.statSync(filePath);
		const rangeHeader = request.headers.get('range');

		if (rangeHeader) {
			const range = parseRangeHeader(rangeHeader, fileSize);

			if (!range) {
				return new Response(null, {
					status: 416,
					headers: {
						'Content-Range': `bytes */${fileSize}`
					}
				});
			}

			const { start, end } = range;
			const chunkSize = end - start + 1;
			const nodeStream = fs.createReadStream(filePath, { start, end });
			const stream = Readable.toWeb(nodeStream) as ReadableStream;

			return new Response(stream, {
				status: 206,
				headers: {
					'Content-Type': mimeType,
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Content-Length': String(chunkSize),
					'Accept-Ranges': 'bytes',
					'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`
				}
			});
		}

		// Video with no Range header — stream full file with Accept-Ranges signal
		const nodeStream = fs.createReadStream(filePath);
		const stream = Readable.toWeb(nodeStream) as ReadableStream;
		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': mimeType,
				'Content-Length': String(fileSize),
				'Accept-Ranges': 'bytes',
				'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`
			}
		});
	} catch (err) {
		console.error('[Files API] Unexpected error serving file:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};


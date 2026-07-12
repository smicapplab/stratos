import { globalEventEmitter } from '$lib/server/services/events';
import { db } from '$lib/server/db/db';
import { boards } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const boardId = params.id;

	// Verify the board belongs to the user's group
	const [board] = await db.select({ id: boards.id }).from(boards).where(
		and(eq(boards.id, boardId), eq(boards.groupId, locals.user.groupId), isNull(boards.deletedAt))
	);
	if (!board) {
		return new Response('Board not found', { status: 404 });
	}

	let pingInterval: ReturnType<typeof setInterval>;
	let listener: (data: { type: string; payload: Record<string, unknown>; timestamp: number }) => void;
	const eventName = `board:${boardId}`;

	const stream = new ReadableStream({
		start(controller) {
			listener = (data) => {
				try {
					controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
				} catch (e) {
					// Ignore if stream is closed
				}
			};

			globalEventEmitter.on(eventName, listener);

			// Keep alive ping
			pingInterval = setInterval(() => {
				try {
					controller.enqueue(': ping\n\n');
				} catch (e) {
					// Ignore
				}
			}, 30000);
		},
		cancel() {
			globalEventEmitter.off(eventName, listener);
			clearInterval(pingInterval);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		}
	});
};

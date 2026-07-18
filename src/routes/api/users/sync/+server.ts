import { json } from '@sveltejs/kit';
import { globalEventEmitter } from '$lib/server/services/events';
import type { RequestHandler } from './$types';

interface SyncEvent {
	type: string;
	payload: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.user.id;

	let pingInterval: ReturnType<typeof setInterval>;
	let listener: (data: SyncEvent) => void;
	const eventName = `user:${userId}`;

	const stream = new ReadableStream({
		start(controller) {
			listener = (data: SyncEvent) => {
				try {
					controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
				} catch (e) {
					// Ignore if stream is closed
				}
			};

			// Prevent Node.js MaxListenersExceededWarning under load
			globalEventEmitter.setMaxListeners(0);
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

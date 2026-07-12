import { EventEmitter } from 'events';

// Global singleton event emitter for real-time sync (replaces Redis for single-node deployment)
export const globalEventEmitter = new EventEmitter();

// Disable max listeners warning — each SSE connection registers a listener,
// and a busy server will have many concurrent connections.
// For production scale, replace with Redis pub/sub.
globalEventEmitter.setMaxListeners(0);

export interface BoardEvent {
	type: string;
	payload: Record<string, unknown>;
	timestamp: number;
}

export function emitBoardEvent(boardId: string, eventType: string, payload: Record<string, unknown>) {
	globalEventEmitter.emit(`board:${boardId}`, {
		type: eventType,
		payload,
		timestamp: Date.now()
	} satisfies BoardEvent);
}

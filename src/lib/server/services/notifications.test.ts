import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyCommentAdded } from './notifications';
import { db } from '../db/db';

const { mockSelectChain } = vi.hoisted(() => {
	const chain = {
		from: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		then: vi.fn()
	};
	return { mockSelectChain: chain };
});

vi.mock('../db/db', () => ({
	db: {
		select: vi.fn().mockReturnValue(mockSelectChain),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: 'notif-id-123', type: 'comment_added', createdAt: new Date() }]),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis()
	}
}));

vi.mock('./events', () => ({
	globalEventEmitter: {
		emit: vi.fn()
	}
}));

describe('Notifications Service - notifyCommentAdded()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectChain.then.mockReset();
	});

	it('should notify assignee and reporter when someone else comments', async () => {
		// Setup mock task return value
		mockSelectChain.then.mockImplementation((resolve) => {
			if (typeof resolve === 'function') {
				resolve([
					{
						id: 'task-123',
						assigneeId: 'assignee-456',
						customFields: { reporterId: 'reporter-789' }
					}
				]);
			}
			return Promise.resolve();
		});

		// Call method as an external commenter
		await notifyCommentAdded('external-user', 'task-123');

		// Should call db.insert twice (once for assignee, once for reporter)
		expect(db.insert).toHaveBeenCalledTimes(2);
	});

	it('should not notify the assignee if they are the author of the comment', async () => {
		// Setup mock task where author is assignee
		mockSelectChain.then.mockImplementation((resolve) => {
			if (typeof resolve === 'function') {
				resolve([
					{
						id: 'task-123',
						assigneeId: 'assignee-456',
						customFields: { reporterId: 'reporter-789' }
					}
				]);
			}
			return Promise.resolve();
		});

		// Assignee comments
		await notifyCommentAdded('assignee-456', 'task-123');

		// Should call db.insert only once (only notifying the reporter)
		expect(db.insert).toHaveBeenCalledTimes(1);
	});

	it('should not notify anyone if the commenter is both assignee and reporter', async () => {
		// Setup mock task
		mockSelectChain.then.mockImplementation((resolve) => {
			if (typeof resolve === 'function') {
				resolve([
					{
						id: 'task-123',
						assigneeId: 'assignee-456',
						customFields: { reporterId: 'assignee-456' }
					}
				]);
			}
			return Promise.resolve();
		});

		await notifyCommentAdded('assignee-456', 'task-123');

		// Zero notifications
		expect(db.insert).toHaveBeenCalledTimes(0);
	});
});

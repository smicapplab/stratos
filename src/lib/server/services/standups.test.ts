import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTodayStandup, upsertStandup, generateDateRangeStrings } from './standups';
import { db } from '../db/db';
import type { Actor } from './users';

const { mockSelectChain } = vi.hoisted(() => {
	const chain = {
		from: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		groupBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
		then: vi.fn()
	};
	return { mockSelectChain: chain };
});

vi.mock('../db/db', () => ({
	db: {
		select: vi.fn().mockReturnValue(mockSelectChain),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([
			{
				id: 'standup-123',
				groupId: 'group-1',
				projectId: 'proj-1',
				userId: 'user-1',
				date: '2026-08-06',
				morningIntent: 'Fix login bug',
				status: 'CHECKED_IN'
			}
		]),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis()
	}
}));

describe('Standups Service', () => {
	const mockActor: Actor = {
		id: 'user-1',
		groupId: 'group-1',
		role: 'Member'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectChain.then.mockReset();
	});

	it('should generate date range strings correctly', () => {
		const range = generateDateRangeStrings('2026-08-01', '2026-08-03');
		expect(range).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
	});

	it('should return pending default standup if no record exists', async () => {
		mockSelectChain.then.mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([]);
			return Promise.resolve();
		});

		const result = await getTodayStandup(mockActor, 'proj-1', '2026-08-06');
		expect(result.status).toBe('PENDING');
		expect(result.userId).toBe('user-1');
		expect(result.date).toBe('2026-08-06');
	});

	it('should insert a new morning standup and set status to CHECKED_IN', async () => {
		mockSelectChain.then.mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([{ id: 'proj-1', enableStandups: true }]);
			return Promise.resolve();
		}).mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([]);
			return Promise.resolve();
		});

		const result = await upsertStandup(mockActor, 'proj-1', {
			dateStr: '2026-08-06',
			morningIntent: 'Working on API auth'
		});

		expect(db.insert).toHaveBeenCalledTimes(1);
		expect(result.status).toBe('CHECKED_IN');
	});

	it('should throw an error when attempting to upsert an empty standup', async () => {
		mockSelectChain.then.mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([{ id: 'proj-1', enableStandups: true }]);
			return Promise.resolve();
		}).mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([]);
			return Promise.resolve();
		});

		await expect(
			upsertStandup(mockActor, 'proj-1', {
				dateStr: '2026-08-06',
				morningIntent: '   ',
				eveningOutcome: '',
				blockers: undefined
			})
		).rejects.toThrow('At least one entry (Morning Focus, Evening Accomplishments, or Blockers) is required.');
	});

	it('should throw an error when a standup field exceeds 2000 characters', async () => {
		mockSelectChain.then.mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([{ id: 'proj-1', enableStandups: true }]);
			return Promise.resolve();
		}).mockImplementationOnce((resolve) => {
			if (typeof resolve === 'function') resolve([]);
			return Promise.resolve();
		});

		const longString = 'a'.repeat(2001);
		await expect(
			upsertStandup(mockActor, 'proj-1', {
				dateStr: '2026-08-06',
				morningIntent: longString
			})
		).rejects.toThrow('Standup entries cannot exceed 2000 characters.');
	});
});


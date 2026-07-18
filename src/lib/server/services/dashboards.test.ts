import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBoardReports } from './dashboards';
import { db } from '../db/db';

const { mockSelectChain } = vi.hoisted(() => {
	const chain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		groupBy: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		then: vi.fn()
	};
	return { mockSelectChain: chain };
});

vi.mock('../db/db', () => ({
	db: {
		select: vi.fn().mockReturnValue(mockSelectChain),
		transaction: vi.fn().mockImplementation((cb) => cb(db))
	}
}));

// Mock Redis cache
vi.mock('../redis', () => ({
	getCachedDashboardData: vi.fn().mockResolvedValue(null),
	setCachedDashboardData: vi.fn().mockResolvedValue(true)
}));

describe('Dashboards Service - getBoardReports()', () => {
	const managerActor = { id: 'mgr-1', role: 'Manager' as const, groupId: 'group-1' };
	const boardId = 'board-1';
	const startDate = new Date('2026-07-01T00:00:00Z');
	const endDate = new Date('2026-07-30T00:00:00Z');

	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectChain.then.mockReset();
	});

	it('should throw 403 if a Manager has no membership on a private project board', async () => {
		// Mock responses:
		// 1. Board query (returns board info)
		// 2. Project query (returns Private visibility)
		// 3. Project member query (returns empty/no membership)
		let callCount = 0;
		mockSelectChain.then.mockImplementation((resolve) => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve([{ projectId: 'project-1', groupId: 'group-1' }]).then(resolve);
			} else if (callCount === 2) {
				return Promise.resolve([{ visibility: 'Private' }]).then(resolve);
			} else if (callCount === 3) {
				return Promise.resolve([]).then(resolve); // no membership
			}
			return Promise.resolve([]).then(resolve);
		});

		await expect(getBoardReports(managerActor, boardId, startDate, endDate))
			.rejects.toThrow('Unauthorized');
	});

	it('should return 0 reopen rate when both completed and reopened counts are zero', async () => {
		// Mock responses for full dashboard reports sequence:
		// 1. Board query (returns board info)
		// 2. Project query (returns Public visibility)
		// 3. CurrentCompleted tasks (returns empty array)
		// 4. PriorCompleted tasks (returns empty array)
		// 5. ReopenedRows (returns empty array)
		// 6. BoardStages (returns stages)
		// 7. CompletedLogs (returns empty array)
		// 8. Bottlenecks (returns empty array)
		// 9. Overdue (returns empty array)
		// 10. Stale (returns empty array)
		let callCount = 0;
		mockSelectChain.then.mockImplementation((resolve) => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve([{ projectId: 'project-1', groupId: 'group-1' }]).then(resolve);
			} else if (callCount === 2) {
				return Promise.resolve([{ visibility: 'Public' }]).then(resolve);
			}
			// All query counts / rows empty
			return Promise.resolve([]).then(resolve);
		});

		const reports = await getBoardReports(managerActor, boardId, startDate, endDate);
		expect(reports.reopenedRate).toBe(0);
		expect(reports.reopenedRateColor).toBe('green');
	});

	it('should exclude cycle time calculation for tasks with no matching stage_change audit log entry', async () => {
		// Mock responses:
		// 1. Board query (projectId, groupId)
		// 2. Project query (public visibility)
		// 3. CurrentCompleted (1 task)
		// 4. PriorCompleted (empty)
		// 5. ReopenedRows (empty)
		// 6. BoardStages (completed stage present)
		// 7. CompletedLogs (returns empty array -> no stage_change audit log)
		// 8. Bottlenecks (empty)
		// 9. Overdue (empty)
		// 10. Stale (empty)
		let callCount = 0;
		mockSelectChain.then.mockImplementation((resolve) => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve([{ projectId: 'project-1', groupId: 'group-1' }]).then(resolve);
			} else if (callCount === 2) {
				return Promise.resolve([{ visibility: 'Public' }]).then(resolve);
			} else if (callCount === 3) {
				// Current Completed: assigneeId='user-1', currentCount=1
				return Promise.resolve([{ assigneeId: 'user-1', assigneeName: 'Alice', currentCount: 1 }]).then(resolve);
			} else if (callCount === 6) {
				// BoardStages
				return Promise.resolve([{ id: 'stage-completed', name: 'Done', isCompleted: true }]).then(resolve);
			} else if (callCount === 7) {
				// CompletedLogs (no logs found)
				return Promise.resolve([]).then(resolve);
			}
			return Promise.resolve([]).then(resolve);
		});

		const reports = await getBoardReports(managerActor, boardId, startDate, endDate);
		// With no audit logs, average days should be 0 since it is excluded
		expect(reports.cycleTime.globalAverageDays).toBe(0);
		expect(reports.cycleTime.priorityAverages.Low).toBe(0);
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTask } from './tasks';

// Mock the database
const { mockSelectChain, mockTx } = vi.hoisted(() => {
	const selectChain: any = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockImplementation(() => Promise.resolve([
			{
				title: 'Old Title',
				priority: 'Medium',
				assigneeId: 'member-1',
				stageId: 'stage-1',
				boardId: 'board-1',
				parentTaskId: null
			}
		]))
	};
	selectChain.then = (onFulfilled: any) => Promise.resolve([
		{
			title: 'Old Title',
			priority: 'Medium',
			assigneeId: 'member-1',
			stageId: 'stage-1',
			boardId: 'board-1',
			parentTaskId: null
		}
	]).then(onFulfilled);

	const tx = {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: 'task-1', title: 'New Title', groupId: 'group-1' }]),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnValue(selectChain)
	};

	return { mockSelectChain: selectChain, mockTx: tx };
});

vi.mock('../db/db', () => ({
	db: {
		...mockTx,
		select: vi.fn().mockReturnValue(mockSelectChain),
		transaction: vi.fn().mockImplementation((callback) => callback(mockTx))
	}
}));

vi.mock('./events', () => ({
	emitBoardEvent: vi.fn()
}));

vi.mock('./notifications', () => ({
	createNotification: vi.fn()
}));

describe('Tasks Service (Security Hardening)', () => {
	const memberActor = { id: 'member-1', role: 'Member' as const, groupId: 'group-1' };
	const viewerActor = { id: 'viewer-1', role: 'Viewer' as const, groupId: 'group-1' };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('updateTask()', () => {
		it('should reject updates by Viewers', async () => {
			await expect(updateTask(viewerActor, 'task-1', { title: 'New' }))
				.rejects.toThrow('Unauthorized: Viewers cannot edit tasks.');
		});

		it('should strip boardId and groupId from updates to prevent injection', async () => {
			const updates: any = {
				title: 'New Title',
				boardId: 'injected-board',
				groupId: 'injected-group'
			};

			const result = await updateTask(memberActor, 'task-1', updates);

			expect(result).toBeDefined();
			// Verify that tx.update was called
			expect(mockTx.update).toHaveBeenCalled();
			// Verify that the set payload does not contain boardId or groupId
			const setCall = mockTx.set.mock.calls[0][0];
			expect(setCall.title).toBe('New Title');
			expect(setCall.boardId).toBeUndefined();
			expect(setCall.groupId).toBeUndefined();
		});
	});
});

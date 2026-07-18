import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBoard, deleteBoard } from './boards';

// Mock the database
const { mockSelectChain } = vi.hoisted(() => {
	return {
		mockSelectChain: {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([{ creatorId: 'admin-1' }]) // default for deleteBoard
		}
	};
});

vi.mock('../db/db', () => ({
	db: {
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: 'new-board-id', name: 'Sprint 1', prefix: 'SPR' }]),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnValue(mockSelectChain)
	}
}));

describe('Board Management Service (Security Matrix)', () => {
	const adminActor = { id: 'admin-1', role: 'Admin' as const, groupId: 'group-1' };
	const memberActor = { id: 'member-1', role: 'Member' as const, groupId: 'group-1' };
	const projectId = 'project-1';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createBoard()', () => {
		it('should allow Admin to create a board', async () => {
			mockSelectChain.where
				.mockResolvedValueOnce([{ id: projectId }])
				.mockResolvedValueOnce([]);
			const result = await createBoard(adminActor, projectId, 'Sprint 1', 'SPR');
			expect(result).toBeDefined();
			expect(result.name).toBe('Sprint 1');
			expect(result.prefix).toBe('SPR');
		});

		it('should throw an error if a Member tries to create a board', async () => {
			mockSelectChain.where.mockResolvedValue([]);
			await expect(createBoard(memberActor, projectId, 'Sprint 1', 'SPR'))
				.rejects.toThrow('Unauthorized: Only Admins can create boards.');
		});
	});

	describe('deleteBoard()', () => {
		it('should allow Admin to delete a board', async () => {
			mockSelectChain.where.mockResolvedValue([{ creatorId: 'someone-else' }]);
			await expect(deleteBoard(adminActor, 'board-1')).resolves.not.toThrow();
		});

		it('should allow Member creator to delete a board', async () => {
			mockSelectChain.where.mockResolvedValue([{ creatorId: 'member-1' }]);
			await expect(deleteBoard(memberActor, 'board-1')).resolves.not.toThrow();
		});

		it('should throw an error if a Member tries to delete a board they did not create', async () => {
			mockSelectChain.where.mockResolvedValue([{ creatorId: 'someone-else' }]);
			await expect(deleteBoard(memberActor, 'board-1'))
				.rejects.toThrow('Unauthorized: Only Admins or the board creator can delete this board.');
		});
	});
});

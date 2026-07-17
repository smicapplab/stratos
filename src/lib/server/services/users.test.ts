import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteUser, removeUser, changeUserRole } from './users';

// Mock the database
const { mockUsersSelectChain } = vi.hoisted(() => {
	return {
		mockUsersSelectChain: {
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue([{ name: 'Test Group' }])
		}
	};
});

vi.mock('../db/db', () => ({
	db: {
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		onConflictDoUpdate: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: 'new-user-id' }]),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnValue(mockUsersSelectChain)
	}
}));

describe('User Management Service (Security Matrix)', () => {
	const adminActor = { id: 'admin-1', role: 'Admin', groupId: 'group-1' };
	const memberActor = { id: 'member-1', role: 'Member', groupId: 'group-1' };
	const viewerActor = { id: 'viewer-1', role: 'Viewer', groupId: 'group-1' };
	
	const targetEmail = 'newguy@stratos.local';
	const targetUserId = 'target-user-1';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('inviteUser()', () => {
		it('should allow Admin to invite a user', async () => {
			const result = await inviteUser(adminActor, targetEmail, 'Member');
			expect(result).toBeDefined();
			expect(result.id).toBe('new-user-id');
		});

		it('should throw an error if a Member tries to invite a user', async () => {
			await expect(inviteUser(memberActor, targetEmail, 'Member'))
				.rejects.toThrow('Unauthorized: Only Admins can invite users.');
		});

		it('should throw an error if a Viewer tries to invite a user', async () => {
			await expect(inviteUser(viewerActor, targetEmail, 'Viewer'))
				.rejects.toThrow('Unauthorized: Only Admins can invite users.');
		});
	});

	describe('removeUser()', () => {
		it('should allow Admin to remove a user', async () => {
			await expect(removeUser(adminActor, targetUserId)).resolves.not.toThrow();
		});

		it('should throw an error if a Member tries to remove a user', async () => {
			await expect(removeUser(memberActor, targetUserId))
				.rejects.toThrow('Unauthorized: Only Admins can remove users.');
		});
	});

	describe('changeUserRole()', () => {
		it('should allow Admin to change a user role', async () => {
			await expect(changeUserRole(adminActor, targetUserId, 'Admin')).resolves.not.toThrow();
		});

		it('should throw an error if a Member tries to change a user role', async () => {
			await expect(changeUserRole(memberActor, targetUserId, 'Admin'))
				.rejects.toThrow('Unauthorized: Only Admins can change user roles.');
		});
	});
});

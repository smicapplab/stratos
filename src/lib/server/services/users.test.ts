import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteUser, removeUser, changeUserRole } from './users';

// Mock the database
const { mockUsersSelectChain } = vi.hoisted(() => {
	const chain: any = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockImplementation(() => Promise.resolve([]))
	};
	chain.then = (onFulfilled: any) => Promise.resolve([{ name: 'Test Group' }]).then(onFulfilled);
	return {
		mockUsersSelectChain: chain
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
	const adminActor = { id: 'admin-1', role: 'Admin' as const, groupId: 'group-1' };
	const memberActor = { id: 'member-1', role: 'Member' as const, groupId: 'group-1' };
	const viewerActor = { id: 'viewer-1', role: 'Viewer' as const, groupId: 'group-1' };
	
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

		it('should throw an error if an invalid role is provided', async () => {
			await expect(inviteUser(adminActor, targetEmail, 'SuperAdmin'))
				.rejects.toThrow('InvalidRoleSelection');
		});

		it('should throw an error if the email belongs to another group', async () => {
			mockUsersSelectChain.limit.mockResolvedValueOnce([{ id: 'other-user', groupId: 'group-2' }]);
			await expect(inviteUser(adminActor, targetEmail, 'Member'))
				.rejects.toThrow('EmailBelongsToAnotherGroup');
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

		it('should throw an error if Admin tries to remove themselves', async () => {
			await expect(removeUser(adminActor, adminActor.id))
				.rejects.toThrow('CannotDeleteSelf');
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

		it('should throw an error if an invalid role is provided', async () => {
			await expect(changeUserRole(adminActor, targetUserId, 'SuperAdmin'))
				.rejects.toThrow('InvalidRoleSelection');
		});
	});
});

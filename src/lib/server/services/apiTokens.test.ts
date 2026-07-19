import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApiToken, validateApiToken, listApiTokens, revokeApiToken, hashToken } from './apiTokens';
import { db } from '../db/db';
import { redis } from '../redis';
import type { Actor } from './users';

// Mock Redis
vi.mock('../redis', () => {
	const store = new Map<string, string>();
	return {
		redis: {
			get: vi.fn(async (key: string) => store.get(key) || null),
			set: vi.fn(async (key: string, value: string) => {
				store.set(key, value);
			}),
			del: vi.fn(async (key: string) => {
				store.delete(key);
			}),
			clear: () => store.clear()
		}
	};
});

// Use vi.hoisted to declare chains before the mock is evaluated
const { selectChain, deleteChain, updateChain } = vi.hoisted(() => {
	const select: any = {
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis()
	};
	// Correctly mock the thenable behavior of Drizzle query builder
	select.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	const del: any = {
		where: vi.fn()
	};
	del.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	const update: any = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		catch: vi.fn().mockReturnThis()
	};
	update.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	return { selectChain: select, deleteChain: del, updateChain: update };
});

vi.mock('../db/db', () => ({
	db: {
		select: vi.fn().mockReturnValue(selectChain),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: 'mock-token-uuid' }]),
		delete: vi.fn().mockReturnValue(deleteChain),
		update: vi.fn().mockReturnValue(updateChain)
	}
}));

describe('API Token Service', () => {
	let adminActor: Actor;
	let managerActor: Actor;
	let memberActor: Actor;
	const group1Id = 'group-1-uuid';
	const adminUserId = 'admin-user-uuid';
	const managerUserId = 'manager-user-uuid';

	beforeEach(() => {
		vi.clearAllMocks();
		(redis as any).clear();

		// Reset default chain behavior
		selectChain.from.mockReturnThis();
		selectChain.innerJoin.mockReturnThis();
		selectChain.where.mockReturnThis();
		selectChain.limit.mockReturnThis();
		selectChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([]).then(onFulfilled);
		});

		deleteChain.where.mockReturnThis();
		deleteChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([]).then(onFulfilled);
		});

		updateChain.set.mockReturnThis();
		updateChain.where.mockReturnThis();
		updateChain.catch.mockReturnThis();
		updateChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([]).then(onFulfilled);
		});

		adminActor = {
			id: adminUserId,
			groupId: group1Id,
			role: 'Admin'
		};

		managerActor = {
			id: managerUserId,
			groupId: group1Id,
			role: 'Manager'
		};

		memberActor = {
			id: 'member-user-uuid',
			groupId: group1Id,
			role: 'Member'
		};
	});

	it('should allow Admin and Manager to generate tokens but deny Member', async () => {
		const tokenData = await createApiToken(adminActor, 'Admin Token');
		expect(tokenData.token).toContain('stratos_tok_');
		expect(tokenData.id).toBe('mock-token-uuid');

		const managerToken = await createApiToken(managerActor, 'Manager Token');
		expect(managerToken.token).toContain('stratos_tok_');

		await expect(createApiToken(memberActor, 'Member Token')).rejects.toThrow();
	});

	it('should validate a correct token and cache validation details in Redis', async () => {
		const token = 'stratos_tok_someSecureTokenStringHere';
		const mockDbResult = [
			{
				tokenId: 'token-id-123',
				groupId: group1Id,
				userId: adminUserId,
				userName: 'Admin User',
				userEmail: 'admin@stratos.internal',
				userRole: 'Admin'
			}
		];

		selectChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve(mockDbResult).then(onFulfilled);
		});

		const result = await validateApiToken(token);
		expect(result.isValid).toBe(true);
		expect(result.user?.id).toBe(adminUserId);
		expect(result.tokenId).toBe('token-id-123');

		const hashed = hashToken(token);
		expect(redis.set).toHaveBeenCalledWith(`apitoken:${hashed}`, expect.any(String), 'EX', 300);
	});

	it('should check Redis cache first before querying Postgres', async () => {
		const token = 'stratos_tok_cachedToken';
		const hashed = hashToken(token);
		const cacheKey = `apitoken:${hashed}`;

		const cacheVal = {
			user: adminActor,
			tokenId: 'token-id-123',
			groupId: group1Id
		};

		await redis.set(cacheKey, JSON.stringify(cacheVal));

		const result = await validateApiToken(token);
		expect(result.isValid).toBe(true);
		expect(result.user?.id).toBe(adminUserId);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('should enforce manager scoping during list queries', async () => {
		selectChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([]).then(onFulfilled);
		});

		await listApiTokens(adminActor);
		expect(db.select).toHaveBeenCalled();

		await listApiTokens(managerActor);
		expect(selectChain.where).toHaveBeenCalled();
	});

	it('should invalidate Redis cache immediately on token revocation', async () => {
		selectChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([
				{
					id: 'token-id-123',
					tokenHash: 'hashedTokenValue',
					userId: adminUserId
				}
			]).then(onFulfilled);
		});

		await revokeApiToken(adminActor, 'token-id-123');
		expect(db.delete).toHaveBeenCalled();
		expect(redis.del).toHaveBeenCalledWith('apitoken:hashedTokenValue');
	});

	it('should enforce manager scoping during revocation', async () => {
		selectChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([
				{
					id: 'token-id-123',
					tokenHash: 'hashedTokenValue',
					userId: adminUserId // Owned by Admin
				}
			]).then(onFulfilled);
		});

		// Manager attempts to delete Admin's token -> should fail
		await expect(revokeApiToken(managerActor, 'token-id-123')).rejects.toThrow();
	});
});

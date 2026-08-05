import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	generateSessionToken,
	hashToken,
	createSession,
	validateSessionToken,
	invalidateSession,
	setSessionTokenCookie,
	deleteSessionTokenCookie
} from './session';
import { db } from '../db/db';

const { selectChain, deleteChain, updateChain, insertChain } = vi.hoisted(() => {
	const select: any = {
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis()
	};
	select.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	const del: any = {
		where: vi.fn().mockReturnThis()
	};
	del.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	const update: any = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis()
	};
	update.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	const insert: any = {
		values: vi.fn().mockReturnThis()
	};
	insert.then = vi.fn().mockImplementation((onFulfilled) => {
		return Promise.resolve([]).then(onFulfilled);
	});

	return {
		selectChain: select,
		deleteChain: del,
		updateChain: update,
		insertChain: insert
	};
});

vi.mock('../db/db', () => ({
	db: {
		select: vi.fn().mockReturnValue(selectChain),
		insert: vi.fn().mockReturnValue(insertChain),
		delete: vi.fn().mockReturnValue(deleteChain),
		update: vi.fn().mockReturnValue(updateChain)
	}
}));

describe('Session Auth Engine', () => {
	beforeEach(() => {
		vi.clearAllMocks();

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
		updateChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([]).then(onFulfilled);
		});

		insertChain.values.mockReturnThis();
		insertChain.then.mockImplementation((onFulfilled: any) => {
			return Promise.resolve([]).then(onFulfilled);
		});
	});

	describe('generateSessionToken', () => {
		it('generates a 32-character base32 session token', () => {
			const token = generateSessionToken();
			expect(typeof token).toBe('string');
			expect(token.length).toBe(32);
			expect(token).toMatch(/^[a-z2-7]+$/);
		});

		it('generates unique tokens on subsequent calls', () => {
			const token1 = generateSessionToken();
			const token2 = generateSessionToken();
			expect(token1).not.toBe(token2);
		});
	});

	describe('hashToken', () => {
		it('hashes token using SHA-256 to a 64-character hex string', () => {
			const token = 'abcdefghijklmnopqrstuvwxyz234567';
			const hash = hashToken(token);
			expect(typeof hash).toBe('string');
			expect(hash.length).toBe(64);
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
			expect(hashToken(token)).toBe(hash);
		});
	});

	describe('createSession', () => {
		it('creates and inserts a session with hashed token ID into DB', async () => {
			const token = generateSessionToken();
			const userId = 'user-uuid-123';
			const metadata = { userAgent: 'Mozilla/5.0', ipAddress: '127.0.0.1' };

			const session = await createSession(token, userId, metadata);

			expect(session.id).toBe(hashToken(token));
			expect(session.userId).toBe(userId);
			expect(session.userAgent).toBe('Mozilla/5.0');
			expect(session.ipAddress).toBe('127.0.0.1');
			expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
			expect(db.insert).toHaveBeenCalled();
			expect(insertChain.values).toHaveBeenCalledWith(
				expect.objectContaining({
					id: hashToken(token),
					userId,
					userAgent: 'Mozilla/5.0',
					ipAddress: '127.0.0.1'
				})
			);
		});
	});

	describe('validateSessionToken', () => {
		it('returns { session: null, user: null } if session is not found in DB', async () => {
			selectChain.then.mockImplementation((onFulfilled: any) => {
				return Promise.resolve([]).then(onFulfilled);
			});

			const token = generateSessionToken();
			const result = await validateSessionToken(token);

			expect(result).toEqual({ session: null, user: null });
		});

		it('deletes session and returns nulls if user is deleted (deletedAt !== null)', async () => {
			const token = generateSessionToken();
			const sessionId = hashToken(token);

			const mockResult = [
				{
					session: {
						id: sessionId,
						userId: 'user-1',
						userAgent: null,
						ipAddress: null,
						expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20)
					},
					user: {
						id: 'user-1',
						email: 'user@example.com',
						name: 'Test User',
						role: 'Member',
						groupId: 'group-1',
						jobTitle: null,
						avatarUrl: null,
						theme: 'system',
						deletedAt: new Date()
					}
				}
			];

			selectChain.then.mockImplementation((onFulfilled: any) => {
				return Promise.resolve(mockResult).then(onFulfilled);
			});

			const result = await validateSessionToken(token);

			expect(result).toEqual({ session: null, user: null });
			expect(db.delete).toHaveBeenCalled();
		});

		it('deletes session and returns nulls if session is expired', async () => {
			const token = generateSessionToken();
			const sessionId = hashToken(token);

			const mockResult = [
				{
					session: {
						id: sessionId,
						userId: 'user-1',
						userAgent: null,
						ipAddress: null,
						expiresAt: new Date(Date.now() - 1000)
					},
					user: {
						id: 'user-1',
						email: 'user@example.com',
						name: 'Test User',
						role: 'Member',
						groupId: 'group-1',
						jobTitle: null,
						avatarUrl: null,
						theme: 'system',
						deletedAt: null
					}
				}
			];

			selectChain.then.mockImplementation((onFulfilled: any) => {
				return Promise.resolve(mockResult).then(onFulfilled);
			});

			const result = await validateSessionToken(token);

			expect(result).toEqual({ session: null, user: null });
			expect(db.delete).toHaveBeenCalled();
		});

		it('extends session expiration if under 15 days remaining (sliding window)', async () => {
			const token = generateSessionToken();
			const sessionId = hashToken(token);
			// Expiration in 10 days (under 15 days threshold)
			const tenDaysFromNow = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10);

			const mockResult = [
				{
					session: {
						id: sessionId,
						userId: 'user-1',
						userAgent: null,
						ipAddress: null,
						expiresAt: tenDaysFromNow
					},
					user: {
						id: 'user-1',
						email: 'user@example.com',
						name: 'Test User',
						role: 'Member',
						groupId: 'group-1',
						jobTitle: null,
						avatarUrl: null,
						theme: 'system',
						deletedAt: null
					}
				}
			];

			selectChain.then.mockImplementation((onFulfilled: any) => {
				return Promise.resolve(mockResult).then(onFulfilled);
			});

			const result = await validateSessionToken(token);

			expect(result.session).not.toBeNull();
			expect(result.user).not.toBeNull();
			expect(result.user?.id).toBe('user-1');
			// Should update database to extend expiresAt
			expect(db.update).toHaveBeenCalled();
			expect(result.session?.expiresAt.getTime()).toBeGreaterThan(tenDaysFromNow.getTime());
		});

		it('validates active session without updating if >15 days remaining', async () => {
			const token = generateSessionToken();
			const sessionId = hashToken(token);
			// Expiration in 25 days (over 15 days threshold)
			const twentyFiveDaysFromNow = new Date(Date.now() + 1000 * 60 * 60 * 24 * 25);

			const mockResult = [
				{
					session: {
						id: sessionId,
						userId: 'user-1',
						userAgent: null,
						ipAddress: null,
						expiresAt: twentyFiveDaysFromNow
					},
					user: {
						id: 'user-1',
						email: 'user@example.com',
						name: 'Test User',
						role: 'Member',
						groupId: 'group-1',
						jobTitle: null,
						avatarUrl: null,
						theme: 'system',
						deletedAt: null
					}
				}
			];

			selectChain.then.mockImplementation((onFulfilled: any) => {
				return Promise.resolve(mockResult).then(onFulfilled);
			});

			const result = await validateSessionToken(token);

			expect(result.session).not.toBeNull();
			expect(result.user).not.toBeNull();
			expect(db.update).not.toHaveBeenCalled();
		});
	});

	describe('invalidateSession', () => {
		it('deletes session from DB', async () => {
			await invalidateSession('session-id-to-delete');
			expect(db.delete).toHaveBeenCalled();
		});
	});

	describe('setSessionTokenCookie', () => {
		it('sets auth_session cookie with appropriate options', () => {
			const cookies = { set: vi.fn() };
			const expiresAt = new Date(Date.now() + 1000000);
			setSessionTokenCookie(cookies, 'test-token', expiresAt);

			expect(cookies.set).toHaveBeenCalledWith(
				'auth_session',
				'test-token',
				expect.objectContaining({
					httpOnly: true,
					sameSite: 'lax',
					expires: expiresAt,
					path: '/'
				})
			);
		});
	});

	describe('deleteSessionTokenCookie', () => {
		it('clears auth_session cookie with maxAge: 0', () => {
			const cookies = { set: vi.fn() };
			deleteSessionTokenCookie(cookies);

			expect(cookies.set).toHaveBeenCalledWith(
				'auth_session',
				'',
				expect.objectContaining({
					httpOnly: true,
					sameSite: 'lax',
					maxAge: 0,
					path: '/'
				})
			);
		});
	});
});

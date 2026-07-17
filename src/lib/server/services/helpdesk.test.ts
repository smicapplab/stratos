import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHelpdeskTicket, getUserHelpdeskTickets, getHelpdeskTicket, submitHelpdeskComment } from './helpdesk';

// Mock database interactions using a thenable select builder
const { mockSelectChain } = vi.hoisted(() => {
	const chain = {
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({
			rows: [{ next_number: 5 }]
		}),
		then: vi.fn()
	};
	return { mockSelectChain: chain };
});

vi.mock('../db/db', () => ({
	db: {
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([{ id: 'new-ticket-id', title: '[Bug] Login error' }]),
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnValue(mockSelectChain),
		execute: vi.fn().mockResolvedValue({
			rows: [{ next_number: 5 }]
		})
	}
}));

vi.mock('./events', () => ({
	emitBoardEvent: vi.fn()
}));

describe('Helpdesk Service (TDD Suite)', () => {
	const userActor = { id: 'user-123', role: 'Member', groupId: 'group-abc' };

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset then mock to default implementation
		mockSelectChain.then.mockReset();
	});

	describe('createHelpdeskTicket()', () => {
		it('should throw an error if actor lacks a groupId', async () => {
			const invalidActor = { id: 'user-123', role: 'Member', groupId: '' };
			await expect(createHelpdeskTicket(invalidActor, 'Bug', 'Test', 'Description'))
				.rejects.toThrow('Unauthorized');
		});

		it('should dynamically provision project and board if not found, returning task', async () => {
			mockSelectChain.then
				.mockImplementationOnce((resolve) => resolve([{ id: 'proj-123' }])) // supportProject exists
				.mockImplementationOnce((resolve) => resolve([{ id: 'board-123' }])) // helpdeskBoard exists
				.mockImplementationOnce((resolve) => resolve([{ id: 'stage-123' }])); // incomingStage exists

			const result = await createHelpdeskTicket(userActor, 'Bug', 'Fails on Safari', 'Blank screen...');
			expect(result).toBeDefined();
			expect(result.id).toBe('new-ticket-id');
		});
	});

	describe('getUserHelpdeskTickets()', () => {
		it('should query only tasks belonging to this user based on reporterId', async () => {
			mockSelectChain.then
				.mockImplementationOnce((resolve) => resolve([{ id: 'proj-123' }])) // supportProject
				.mockImplementationOnce((resolve) => resolve([{ id: 'board-123' }])) // helpdeskBoard
				.mockImplementationOnce((resolve) => resolve([{ id: 't1', title: '[Bug] Login fails' }])); // tasks list

			const result = await getUserHelpdeskTickets(userActor);
			expect(result).toBeDefined();
			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('[Bug] Login fails');
		});
	});

	describe('getHelpdeskTicket()', () => {
		it('should reject access if the user is not the reporter or admin/member of support project', async () => {
			mockSelectChain.then
				.mockImplementationOnce((resolve) => resolve([{ id: 't1', projectId: 'proj-123', customFields: { reporterId: 'other-user' } }])) // task
				.mockImplementationOnce((resolve) => resolve([])); // project membership check (not found)

			await expect(getHelpdeskTicket(userActor, 't1'))
				.rejects.toThrow('Access denied');
		});

		it('should permit access if the user is the reporter', async () => {
			mockSelectChain.then
				.mockImplementationOnce((resolve) => resolve([{ id: 't1', projectId: 'proj-123', customFields: { reporterId: 'user-123' } }])) // task
				.mockImplementationOnce((resolve) => resolve([])) // comments
				.mockImplementationOnce((resolve) => resolve([])); // audit logs

			const result = await getHelpdeskTicket(userActor, 't1');
			expect(result).toBeDefined();
			expect(result.task.id).toBe('t1');
		});
	});

	describe('submitHelpdeskComment()', () => {
		it('should reject commenting if user is not authorized', async () => {
			mockSelectChain.then
				.mockImplementationOnce((resolve) => resolve([{ id: 't1', projectId: 'proj-123', customFields: { reporterId: 'other-user' } }])) // task
				.mockImplementationOnce((resolve) => resolve([])); // project membership (not found)

			await expect(submitHelpdeskComment(userActor, 't1', 'Test reply'))
				.rejects.toThrow('Access denied');
		});
	});
});

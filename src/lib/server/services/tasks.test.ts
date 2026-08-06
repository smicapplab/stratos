import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTask, createTask, stripHtml } from './tasks';

// Mock the database
const { mockSelectChain, mockTx } = vi.hoisted(() => {
	const selectChain: any = {
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		for: vi.fn().mockReturnThis()
	};
	selectChain.then = (onFulfilled: any) => Promise.resolve([
		{
			id: 'board-1',
			boardId: 'board-1',
			title: 'Old Title',
			description: 'Old Description',
			priority: 'Medium',
			assigneeId: 'member-1',
			stageId: 'stage-1',
			parentTaskId: null,
			maxNumber: 5
		}
	]).then(onFulfilled);

	const tx = {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		returning: vi.fn().mockImplementation(() => Promise.resolve([{ id: 'task-1', title: 'New Title', groupId: 'group-1' }])),
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

vi.mock('../redis', () => ({
	invalidateDashboardCache: vi.fn()
}));

describe('Tasks Service (Security Hardening & FTS Text Extraction)', () => {
	const memberActor = { id: 'member-1', role: 'Member' as const, groupId: 'group-1' };
	const viewerActor = { id: 'viewer-1', role: 'Viewer' as const, groupId: 'group-1' };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('stripHtml()', () => {
		it('should strip HTML tags and normalize whitespace', () => {
			expect(stripHtml('<p>Hello <b>world</b>!</p>')).toBe('Hello world !');
			expect(stripHtml('<div><span>Multiple</span>&nbsp;<span>spaces</span></div>')).toBe('Multiple spaces');
			expect(stripHtml('Plain&nbsp;text')).toBe('Plain text');
			expect(stripHtml('')).toBe('');
		});
	});

	describe('createTask()', () => {
		it('should extract searchText from description when creating a task', async () => {
			const description = '<h1>Feature Specification</h1><p>Implement <strong>full-text search</strong>.</p>';
			await createTask(
				memberActor,
				'stage-1',
				'FTS Task',
				null,
				null,
				null,
				mockTx as any,
				description
			);

			expect(mockTx.insert).toHaveBeenCalled();
			const insertedValues = mockTx.values.mock.calls[0][0];
			expect(insertedValues.description).toBe(description);
			expect(insertedValues.searchText).toBe('Feature Specification Implement full-text search .');
		});
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

		it('should update searchText when description is updated', async () => {
			const htmlDesc = '<div><p>Updated <em>description</em> content.</p></div>';
			await updateTask(memberActor, 'task-1', { description: htmlDesc });

			expect(mockTx.update).toHaveBeenCalled();
			const setCall = mockTx.set.mock.calls[0][0];
			expect(setCall.description).toBe(htmlDesc);
			expect(setCall.searchText).toBe('Updated description content.');
		});

		it('should create an audit log snapshot when description is updated', async () => {
			const htmlDesc = '<p>New description</p>';
			await updateTask(memberActor, 'task-1', { description: htmlDesc });

			expect(mockTx.insert).toHaveBeenCalled();
			const auditCall = mockTx.values.mock.calls.find((call: any) => {
				const arg = call[0];
				if (Array.isArray(arg)) {
					return arg.some(item => item.actionType === 'description_change');
				}
				return arg.actionType === 'description_change';
			});
			expect(auditCall).toBeDefined();
			if (!auditCall) throw new Error('auditCall is undefined');
			const logsArray = Array.isArray(auditCall[0]) ? auditCall[0] : [auditCall[0]];
			const descriptionLog = logsArray.find((item: any) => item.actionType === 'description_change');
			expect(descriptionLog.details).toEqual({
				oldDescription: 'Old Description',
				newDescription: htmlDesc
			});
		});

		it('should clear searchText when description is set to null', async () => {
			await updateTask(memberActor, 'task-1', { description: null });

			expect(mockTx.update).toHaveBeenCalled();
			const setCall = mockTx.set.mock.calls[0][0];
			expect(setCall.description).toBeNull();
			expect(setCall.searchText).toBe('');
		});

		it('should update checklists with assigneeId and dueDate', async () => {
			const updatedChecklists = [
				{ id: 'chk-1', text: 'Write tests', done: false, assigneeId: 'user-2', dueDate: '2026-08-10' },
				{ id: 'chk-2', text: 'Security audit', done: true, assigneeId: null, dueDate: null }
			];

			await updateTask(memberActor, 'task-1', { checklists: updatedChecklists });

			expect(mockTx.update).toHaveBeenCalled();
			const setCall = mockTx.set.mock.calls[0][0];
			expect(setCall.checklists).toEqual(updatedChecklists);
		});
	});

	describe('getBoardTasks()', () => {
		it('should fetch tasks and correctly attach followers and tags', async () => {
			const { getBoardTasks } = await import('./tasks');

			// Mock the db.select chain for getBoardTasks
			// getBoardTasks does three queries: tasks, tags, followers.
			let queryCall = 0;
			mockSelectChain.then = vi.fn().mockImplementation((onFulfilled) => {
				queryCall++;
				if (queryCall === 1) {
					// Tasks query
					return Promise.resolve([
						{ id: 'task-1', title: 'Test Task' },
						{ id: 'task-2', title: 'Test Task 2' }
					]).then(onFulfilled);
				} else if (queryCall === 2) {
					// Tags query
					return Promise.resolve([
						{ taskId: 'task-1', id: 'tag-1', name: 'Bug', color: 'red' }
					]).then(onFulfilled);
				} else if (queryCall === 3) {
					// Followers query
					return Promise.resolve([
						{ taskId: 'task-1', userId: 'user-1' },
						{ taskId: 'task-1', userId: 'user-2' },
						{ taskId: 'task-2', userId: 'user-3' }
					]).then(onFulfilled);
				}
				return Promise.resolve([]).then(onFulfilled);
			});

			const results = await getBoardTasks('group-1', ['stage-1']);

			expect(results).toHaveLength(2);
			
			// Verify first task
			expect(results[0].id).toBe('task-1');
			expect(results[0].tags).toHaveLength(1);
			expect(results[0].tags[0].name).toBe('Bug');
			expect(results[0].followers).toHaveLength(2);
			expect(results[0].followers[0].userId).toBe('user-1');
			expect(results[0].followers[1].userId).toBe('user-2');

			// Verify second task
			expect(results[1].id).toBe('task-2');
			expect(results[1].tags).toHaveLength(0);
			expect(results[1].followers).toHaveLength(1);
			expect(results[1].followers[0].userId).toBe('user-3');
		});
	});

	describe('softDeleteTask()', () => {
		it('should reject deletion by Viewers', async () => {
			const { softDeleteTask } = await import('./tasks');
			await expect(softDeleteTask(viewerActor, 'task-1'))
				.rejects.toThrow('Unauthorized: Viewers cannot delete tasks.');
		});

		it('should set deletedAt and remove parent references', async () => {
			const { softDeleteTask } = await import('./tasks');
			await softDeleteTask(memberActor, 'task-1');
			
			expect(mockTx.update).toHaveBeenCalled();
			expect(mockTx.set).toHaveBeenCalledWith({ deletedAt: expect.any(Date) });
		});
	});

	describe('Task Linking', () => {
		it('linkTasks should prevent self-linking', async () => {
			const { linkTasks } = await import('./tasks');
			await expect(linkTasks(memberActor, 'task-1', 'task-1', 'relates_to'))
				.rejects.toThrow('Cannot link task to itself');
		});

		it('removeTaskLink should enforce Viewer restriction', async () => {
			const { removeTaskLink } = await import('./tasks');
			await expect(removeTaskLink(viewerActor, 'link-1'))
				.rejects.toThrow('Unauthorized');
		});
	});
});

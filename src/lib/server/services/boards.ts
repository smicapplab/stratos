import { db } from '../db/db';
import { boards, auditLogs } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { Actor } from './users';

export async function createBoard(actor: Actor, projectId: string, name: string, prefix: string) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can create boards.');
	}
	
	// Check prefix uniqueness in the group
	const existing = await db.select({ id: boards.id }).from(boards).where(and(eq(boards.groupId, actor.groupId), eq(boards.prefix, prefix), isNull(boards.deletedAt)));
	if (existing.length > 0) {
		throw new Error('Prefix already taken');
	}

	const [newBoard] = await db.insert(boards).values({
		name,
		prefix,
		projectId,
		groupId: actor.groupId,
		creatorId: actor.id
	}).returning();

	await db.insert(auditLogs).values({
		groupId: actor.groupId,
		projectId,
		userId: actor.id,
		actionType: 'board_created',
		details: { boardId: newBoard.id, name, prefix }
	});

	return newBoard;
}

export async function deleteBoard(actor: Actor, boardId: string) {
	const [board] = await db.select({ creatorId: boards.creatorId, projectId: boards.projectId }).from(boards).where(
		and(
			eq(boards.id, boardId),
			eq(boards.groupId, actor.groupId)
		)
	);
	if (!board) throw new Error('Board not found');

	if (actor.role !== 'Admin' && board.creatorId !== actor.id) {
		throw new Error('Unauthorized: Only Admins or the board creator can delete this board.');
	}

	await db.update(boards)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(boards.id, boardId),
				eq(boards.groupId, actor.groupId)
			)
		);

	await db.insert(auditLogs).values({
		groupId: actor.groupId,
		projectId: board.projectId,
		userId: actor.id,
		actionType: 'board_deleted',
		details: { boardId }
	});
}

export async function updateBoard(actor: Actor, boardId: string, updates: { name?: string; projectId?: string }) {
	if (actor.role === 'Viewer') {
		throw new Error('Unauthorized: Viewers cannot edit boards.');
	}

	const [updated] = await db.update(boards).set(updates).where(
		and(
			eq(boards.id, boardId),
			eq(boards.groupId, actor.groupId)
		)
	).returning();

	return updated;
}

export async function getGroupBoards(actor: Actor) {
	return await db.select({
		id: boards.id,
		name: boards.name,
		projectId: boards.projectId,
		groupId: boards.groupId
	}).from(boards).where(
		and(
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		)
	);
}

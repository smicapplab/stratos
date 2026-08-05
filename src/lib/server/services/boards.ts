import { db } from '../db/db';
import { boards, auditLogs, projects, tasks } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { Actor } from './users';

export async function createBoard(actor: Actor, projectId: string, name: string, prefix: string, icon: string = 'KanbanSquare') {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can create boards.');
	}
	
	// Ensure the project belongs to the actor's group
	const [project] = await db.select({ id: projects.id }).from(projects).where(
		and(eq(projects.id, projectId), eq(projects.groupId, actor.groupId))
	);
	if (!project) throw new Error('Project not found or access denied');
	
	// Check name or prefix uniqueness in the group
	const existing = await db.select({ id: boards.id, name: boards.name, prefix: boards.prefix }).from(boards).where(
		and(
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		)
	);
	
	for (const b of existing) {
		if (b.name.toLowerCase() === name.toLowerCase()) {
			throw new Error(`A board named "${name}" already exists.`);
		}
		if (b.prefix.toUpperCase() === prefix.toUpperCase()) {
			throw new Error(`The prefix "${prefix}" is already taken.`);
		}
	}

	return await db.transaction(async (tx) => {
		const [newBoard] = await tx.insert(boards).values({
			name,
			prefix,
			icon,
			projectId,
			groupId: actor.groupId,
			creatorId: actor.id
		}).returning();

		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			projectId,
			userId: actor.id,
			actionType: 'board_created',
			details: { boardId: newBoard.id, name, prefix }
		});

		return newBoard;
	});
}

export async function deleteBoard(actor: Actor, boardId: string) {
	const [board] = await db.select({ creatorId: boards.creatorId, projectId: boards.projectId, name: boards.name, prefix: boards.prefix }).from(boards).where(
		and(
			eq(boards.id, boardId),
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		)
	);
	if (!board) throw new Error('Board not found');

	if (actor.role !== 'Admin' && board.creatorId !== actor.id) {
		throw new Error('Unauthorized: Only Admins or the board creator can delete this board.');
	}

	const timestamp = new Date().getTime();
	const newName = `${board.name} (Deleted ${timestamp})`;
	const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
	const shortPrefix = `DEL_${randomStr}`;

	await db.transaction(async (tx) => {
		await tx.update(boards)
			.set({ 
				deletedAt: new Date(),
				name: newName,
				prefix: shortPrefix
			})
			.where(
				and(
					eq(boards.id, boardId),
					eq(boards.groupId, actor.groupId),
					isNull(boards.deletedAt)
				)
			);

		await tx.update(tasks)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(tasks.boardId, boardId),
					eq(tasks.groupId, actor.groupId),
					isNull(tasks.deletedAt)
				)
			);

		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			projectId: board.projectId,
			userId: actor.id,
			actionType: 'board_deleted',
			details: { boardId }
		});
	});
}

export async function updateBoard(actor: Actor, boardId: string, updates: { name?: string; projectId?: string; icon?: string }) {
	if (actor.role === 'Viewer') {
		throw new Error('Unauthorized: Viewers cannot edit boards.');
	}

	const [updated] = await db.update(boards).set(updates).where(
		and(
			eq(boards.id, boardId),
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		)
	).returning();

	if (!updated) {
		throw new Error('Board not found');
	}

	return updated;
}

export async function getGroupBoards(actor: Actor) {
	return await db.select({
		id: boards.id,
		name: boards.name,
		icon: boards.icon,
		projectId: boards.projectId,
		groupId: boards.groupId
	}).from(boards).where(
		and(
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt)
		)
	);
}

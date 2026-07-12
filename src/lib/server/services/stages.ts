import { db } from '../db/db';
import { stages, boards } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { Actor } from './users';
import { generateKeyBetween } from 'fractional-indexing';
import { emitBoardEvent } from './events';

export async function createStage(actor: Actor, boardId: string, name: string, previousIndex: string | null = null, nextIndex: string | null = null) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can manage stages.');
	}

	const [board] = await db.select({ id: boards.id }).from(boards).where(
		and(eq(boards.id, boardId), eq(boards.groupId, actor.groupId))
	);
	if (!board) throw new Error('Board not found or unauthorized.');

	const orderIndex = generateKeyBetween(previousIndex, nextIndex);

	const [newStage] = await db.insert(stages).values({
		name,
		boardId,
		orderIndex
	}).returning();

	emitBoardEvent(boardId, 'stage_created', { stage: newStage });

	return newStage;
}

export async function getBoardStages(actor: Actor, boardId: string) {
	// Verify board belongs to actor's group
	const [board] = await db.select({ id: boards.id }).from(boards).where(
		and(eq(boards.id, boardId), eq(boards.groupId, actor.groupId))
	);
	if (!board) throw new Error('Board not found or unauthorized.');

	return await db.select({
		id: stages.id,
		name: stages.name,
		boardId: stages.boardId,
		isCompleted: stages.isCompleted,
		orderIndex: stages.orderIndex
	}).from(stages).where(eq(stages.boardId, boardId)).orderBy(stages.orderIndex);
}

export async function updateStage(actor: Actor, stageId: string, updates: Partial<{ name: string, isCompleted: boolean }>) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can manage stages.');
	}

	const [stage] = await db.select({ boardId: stages.boardId }).from(stages).where(eq(stages.id, stageId));
	if (!stage) throw new Error('Stage not found');

	const [board] = await db.select({ id: boards.id }).from(boards).where(
		and(eq(boards.id, stage.boardId), eq(boards.groupId, actor.groupId))
	);
	if (!board) throw new Error('Board not found or unauthorized.');

	const [updated] = await db.update(stages)
		.set(updates)
		.where(eq(stages.id, stageId))
		.returning();

	emitBoardEvent(stage.boardId, 'stage_updated', { stage: updated });

	return updated;
}

export async function moveStage(actor: Actor, stageId: string, previousIndex: string | null = null, nextIndex: string | null = null) {
	if (actor.role !== 'Admin') {
		throw new Error('Unauthorized: Only Admins can manage stages.');
	}

	const [stage] = await db.select({ boardId: stages.boardId }).from(stages).where(eq(stages.id, stageId));
	if (!stage) throw new Error('Stage not found');

	const [board] = await db.select({ id: boards.id }).from(boards).where(
		and(eq(boards.id, stage.boardId), eq(boards.groupId, actor.groupId))
	);
	if (!board) throw new Error('Board not found or unauthorized.');

	const orderIndex = generateKeyBetween(previousIndex, nextIndex);
	
	const [updated] = await db.update(stages)
		.set({ orderIndex })
		.where(eq(stages.id, stageId))
		.returning();

	emitBoardEvent(stage.boardId, 'stage_moved', { stage: updated });

	return updated;
}

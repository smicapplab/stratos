import { db } from '../db/db';
import { customFieldDefinitions } from '../db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import type { Actor } from './users';

export async function getCustomFields(actor: Actor, boardId: string) {
	// Fields that are group-wide (boardId is null) OR specific to this board
	return await db.select({
		id: customFieldDefinitions.id,
		groupId: customFieldDefinitions.groupId,
		boardId: customFieldDefinitions.boardId,
		name: customFieldDefinitions.name,
		type: customFieldDefinitions.type,
		options: customFieldDefinitions.options,
		createdAt: customFieldDefinitions.createdAt
	}).from(customFieldDefinitions).where(
		and(
			eq(customFieldDefinitions.groupId, actor.groupId),
			or(
				isNull(customFieldDefinitions.boardId),
				eq(customFieldDefinitions.boardId, boardId)
			)
		)
	);
}

export async function createCustomField(actor: Actor, boardId: string, name: string, type: string, options: any[] = []) {
	if (actor.role === 'Viewer') throw new Error('Unauthorized');
	const [newField] = await db.insert(customFieldDefinitions).values({
		groupId: actor.groupId,
		boardId, // Bind it to the board for now to keep it scoped
		name,
		type,
		options
	}).returning();
	return newField;
}

export async function deleteCustomField(actor: Actor, fieldId: string) {
	if (actor.role === 'Viewer') throw new Error('Unauthorized');
	// In a real app we'd also check if the actor has admin rights on the board it belongs to
	await db.delete(customFieldDefinitions).where(
		and(
			eq(customFieldDefinitions.id, fieldId),
			eq(customFieldDefinitions.groupId, actor.groupId)
		)
	);
}

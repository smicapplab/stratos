import { db } from '../db/db';
import { tags, taskTags, projects, projectMembers, tasks, auditLogs, boards } from '../db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import type { Actor } from './users';

export async function resolveProjectId(actor: Actor, targetId: string): Promise<string> {
	// 1. Check if targetId is directly a project ID
	const [project] = await db.select({ id: projects.id }).from(projects).where(
		and(eq(projects.id, targetId), eq(projects.groupId, actor.groupId), isNull(projects.deletedAt))
	);
	if (project) return project.id;

	// 2. Check if targetId is a board ID
	const [board] = await db.select({ projectId: boards.projectId }).from(boards).where(
		and(eq(boards.id, targetId), eq(boards.groupId, actor.groupId), isNull(boards.deletedAt))
	);
	if (board && board.projectId) return board.projectId;

	// 3. Check if targetId is a task ID
	const [task] = await db.select({ projectId: tasks.projectId, boardId: tasks.boardId }).from(tasks).where(
		and(eq(tasks.id, targetId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt))
	);
	if (task) {
		if (task.projectId) return task.projectId;
		if (task.boardId) {
			const [boardForTask] = await db.select({ projectId: boards.projectId }).from(boards).where(
				and(eq(boards.id, task.boardId), isNull(boards.deletedAt))
			);
			if (boardForTask && boardForTask.projectId) return boardForTask.projectId;
		}
	}

	throw new Error('Project not found or access denied');
}

async function checkProjectAccess(actor: Actor, targetId: string): Promise<string> {
	const resolvedProjectId = await resolveProjectId(actor, targetId);
	const [project] = await db.select({ visibility: projects.visibility }).from(projects).where(
		and(eq(projects.id, resolvedProjectId), eq(projects.groupId, actor.groupId), isNull(projects.deletedAt))
	);
	
	if (!project) throw new Error('Project not found or access denied');
	if (actor.role === 'Admin') return resolvedProjectId;
	if (project.visibility === 'Public') return resolvedProjectId;
	
	const [member] = await db.select().from(projectMembers).where(
		and(eq(projectMembers.projectId, resolvedProjectId), eq(projectMembers.userId, actor.id))
	);
	
	if (!member) throw new Error('Unauthorized: You are not a member of this private project.');
	return resolvedProjectId;
}

async function checkProjectAdmin(actor: Actor, targetId: string) {
	const resolvedProjectId = await resolveProjectId(actor, targetId);
	const [project] = await db.select({ id: projects.id }).from(projects).where(
		and(eq(projects.id, resolvedProjectId), eq(projects.groupId, actor.groupId), isNull(projects.deletedAt))
	);
	
	if (!project) throw new Error('Project not found or access denied');
	if (actor.role === 'Admin') return true;
	
	const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
		and(eq(projectMembers.projectId, resolvedProjectId), eq(projectMembers.userId, actor.id))
	);
	
	if (!member || member.role !== 'Admin') {
		throw new Error('Unauthorized: Only Project Admins can perform this action.');
	}
	return true;
}

async function getProjectForTag(tagId: string) {
	const [tag] = await db.select({ projectId: tags.projectId }).from(tags).where(
		and(eq(tags.id, tagId), isNull(tags.deletedAt))
	);
	if (!tag) throw new Error('Tag not found');
	return tag.projectId;
}

export async function getProjectTags(actor: Actor, targetId: string) {
	const resolvedProjectId = await checkProjectAccess(actor, targetId);
	
	return await db.select().from(tags).where(
		and(
			eq(tags.projectId, resolvedProjectId),
			isNull(tags.deletedAt)
		)
	).orderBy(asc(tags.name));
}

export async function createTag(actor: Actor, targetId: string, name: string, color: string = 'blue') {
	const resolvedProjectId = await checkProjectAccess(actor, targetId);
	
	return await db.transaction(async (tx) => {
		const [newTag] = await tx.insert(tags).values({
			projectId: resolvedProjectId,
			name,
			color
		}).returning();
		
		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			projectId: resolvedProjectId,
			userId: actor.id,
			actionType: 'tag_created',
			details: { tagId: newTag.id, tagName: name, color }
		});

		return newTag;
	});
}

export async function updateTag(actor: Actor, tagId: string, name?: string, color?: string) {
	const projectId = await getProjectForTag(tagId);
	await checkProjectAdmin(actor, projectId);
	
	const updateData: { name?: string; color?: string } = {};
	if (name !== undefined) updateData.name = name;
	if (color !== undefined) updateData.color = color;

	if (Object.keys(updateData).length === 0) {
		throw new Error('No fields to update');
	}

	return await db.transaction(async (tx) => {
		const [updatedTag] = await tx.update(tags)
			.set(updateData)
			.where(and(eq(tags.id, tagId), isNull(tags.deletedAt)))
			.returning();

		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			projectId,
			userId: actor.id,
			actionType: 'tag_updated',
			details: { tagId, ...updateData }
		});

		return updatedTag;
	});
}

export async function deleteTag(actor: Actor, tagId: string) {
	const projectId = await getProjectForTag(tagId);
	await checkProjectAdmin(actor, projectId);

	await db.transaction(async (tx) => {
		await tx.update(tags)
			.set({ deletedAt: new Date() })
			.where(eq(tags.id, tagId));

		await tx.delete(taskTags).where(eq(taskTags.tagId, tagId));

		await tx.insert(auditLogs).values({
			groupId: actor.groupId,
			projectId,
			userId: actor.id,
			actionType: 'tag_deleted',
			details: { tagId }
		});
	});
}

export async function attachTagToTask(actor: Actor, taskId: string, tagId: string) {
	const [task] = await db.select().from(tasks).where(
		and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt))
	);
	if (!task) throw new Error('Task not found');

	const [tag] = await db.select().from(tags).where(
		and(eq(tags.id, tagId), isNull(tags.deletedAt))
	);
	if (!tag) throw new Error('Tag not found');

	const [existing] = await db.select().from(taskTags).where(
		and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId))
	);
	if (existing) return; // Already attached

	await db.insert(taskTags).values({
		taskId,
		tagId
	});
}

export async function detachTagFromTask(actor: Actor, taskId: string, tagId: string) {
	const [task] = await db.select().from(tasks).where(
		and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId), isNull(tasks.deletedAt))
	);
	if (!task) throw new Error('Task not found');

	await db.delete(taskTags).where(
		and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId))
	);
}

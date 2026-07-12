import { db } from '../db/db';
import { tags, taskTags, projects, projectMembers, tasks } from '../db/schema';
import { eq, and, or, inArray, asc } from 'drizzle-orm';
import type { Actor } from './users';

async function checkProjectAccess(actor: Actor, projectId: string) {
	if (actor.role === 'Admin') return true;
	
	const [project] = await db.select({ visibility: projects.visibility }).from(projects).where(
		and(eq(projects.id, projectId), eq(projects.groupId, actor.groupId))
	);
	
	if (!project) throw new Error('Project not found or access denied');
	if (project.visibility === 'Public') return true;
	
	const [member] = await db.select().from(projectMembers).where(
		and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, actor.id))
	);
	
	if (!member) throw new Error('Unauthorized: You are not a member of this private project.');
	return true;
}

async function checkProjectAdmin(actor: Actor, projectId: string) {
	if (actor.role === 'Admin') return true;
	
	const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
		and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, actor.id))
	);
	
	if (!member || member.role !== 'Admin') {
		throw new Error('Unauthorized: Only Project Admins can perform this action.');
	}
	return true;
}

async function getProjectForTag(tagId: string) {
	const [tag] = await db.select({ projectId: tags.projectId }).from(tags).where(eq(tags.id, tagId));
	if (!tag) throw new Error('Tag not found');
	return tag.projectId;
}

export async function getProjectTags(actor: Actor, projectId: string) {
	await checkProjectAccess(actor, projectId);
	
	return await db.select().from(tags).where(
		and(
			eq(tags.projectId, projectId),
			eq(tags.isDeleted, false)
		)
	).orderBy(asc(tags.name));
}

export async function createTag(actor: Actor, projectId: string, name: string, color: string = 'blue') {
	// Any member of the project can create a tag
	await checkProjectAccess(actor, projectId);
	
	const [newTag] = await db.insert(tags).values({
		projectId,
		name,
		color
	}).returning();
	
	return newTag;
}

export async function updateTag(actor: Actor, tagId: string, name: string, color: string) {
	const projectId = await getProjectForTag(tagId);
	// Any member can edit a tag
	await checkProjectAccess(actor, projectId);
	
	const [updatedTag] = await db.update(tags).set({
		name,
		color,
		updatedAt: new Date()
	}).where(eq(tags.id, tagId)).returning();
	
	return updatedTag;
}

export async function softDeleteTag(actor: Actor, tagId: string) {
	const projectId = await getProjectForTag(tagId);
	// Only Project Admins can delete tags
	await checkProjectAdmin(actor, projectId);
	
	await db.update(tags).set({
		isDeleted: true,
		updatedAt: new Date()
	}).where(eq(tags.id, tagId));
}

export async function attachTagToTask(actor: Actor, taskId: string, tagId: string) {
	const projectId = await getProjectForTag(tagId);
	await checkProjectAccess(actor, projectId);
	
	// Verify task belongs to this group/project
	const [task] = await db.select({ id: tasks.id }).from(tasks).where(
		and(eq(tasks.id, taskId), eq(tasks.groupId, actor.groupId))
	);
	
	if (!task) throw new Error('Task not found');
	
	await db.insert(taskTags).values({
		taskId,
		tagId
	}).onConflictDoNothing();
}

export async function detachTagFromTask(actor: Actor, taskId: string, tagId: string) {
	const projectId = await getProjectForTag(tagId);
	await checkProjectAccess(actor, projectId);
	
	await db.delete(taskTags).where(
		and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId))
	);
}

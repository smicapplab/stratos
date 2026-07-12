import { db } from '../db/db';
import { projects, projectMembers, boards } from '../db/schema';
import { eq, and, or, isNull, inArray, asc } from 'drizzle-orm';
import type { Actor } from './users';

export async function createProject(actor: Actor, name: string, visibility: 'Public' | 'Private' = 'Public') {
	const [newProject] = await db.insert(projects).values({
		name,
		groupId: actor.groupId,
		visibility
	}).returning();

	// Automatically add the creator as a Project Admin so they can manage it
	await db.insert(projectMembers).values({
		projectId: newProject.id,
		userId: actor.id,
		role: 'Admin'
	});

	return newProject;
}

export async function getAccessibleProjects(actor: Actor) {
	// Group Admins see everything
	if (actor.role === 'Admin') {
		return await db.select({
			id: projects.id,
			name: projects.name,
			groupId: projects.groupId,
			visibility: projects.visibility,
			createdAt: projects.createdAt
		}).from(projects).where(eq(projects.groupId, actor.groupId)).orderBy(asc(projects.createdAt));
	}

	// Members/Viewers only see Public projects OR Private projects where they are a member
	const userMemberProjects = await db.select({ projectId: projectMembers.projectId })
		.from(projectMembers)
		.where(eq(projectMembers.userId, actor.id));
	
	const memberProjectIds = userMemberProjects.map(p => p.projectId);

	const condition = memberProjectIds.length > 0 
		? or(eq(projects.visibility, 'Public'), inArray(projects.id, memberProjectIds))
		: eq(projects.visibility, 'Public');

	return await db.select({
		id: projects.id,
		name: projects.name,
		groupId: projects.groupId,
		visibility: projects.visibility,
		createdAt: projects.createdAt
	}).from(projects).where(
		and(
			eq(projects.groupId, actor.groupId),
			condition
		)
	).orderBy(asc(projects.createdAt));
}

export async function getAccessibleBoards(actor: Actor) {
	const accessibleProjects = await getAccessibleProjects(actor);
	const projectIds = accessibleProjects.map(p => p.id);

	if (projectIds.length === 0) return [];

	return await db.select({
		id: boards.id,
		name: boards.name,
		projectId: boards.projectId,
		groupId: boards.groupId
	}).from(boards).where(
		and(
			eq(boards.groupId, actor.groupId),
			isNull(boards.deletedAt),
			inArray(boards.projectId, projectIds)
		)
	).orderBy(asc(boards.createdAt));
}

export async function addProjectMember(actor: Actor, projectId: string, targetUserId: string, role: 'Admin' | 'Member' = 'Member') {
	// Verify actor is Group Admin or Project Admin
	if (actor.role !== 'Admin') {
		const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, actor.id)
			)
		);
		if (!member || member.role !== 'Admin') {
			throw new Error('Unauthorized: Only Project Admins can manage members.');
		}
	}

	await db.insert(projectMembers).values({
		projectId,
		userId: targetUserId,
		role
	}).onConflictDoUpdate({
		target: [projectMembers.projectId, projectMembers.userId],
		set: { role }
	});
}

export async function removeProjectMember(actor: Actor, projectId: string, targetUserId: string) {
	// Verify actor is Group Admin or Project Admin
	if (actor.role !== 'Admin') {
		const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, actor.id)
			)
		);
		if (!member || member.role !== 'Admin') {
			throw new Error('Unauthorized: Only Project Admins can manage members.');
		}
	}

	await db.delete(projectMembers).where(
		and(
			eq(projectMembers.projectId, projectId),
			eq(projectMembers.userId, targetUserId)
		)
	);
}

export async function updateProjectVisibility(actor: Actor, projectId: string, visibility: 'Public' | 'Private') {
	if (actor.role !== 'Admin') {
		const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, actor.id)
			)
		);
		if (!member || member.role !== 'Admin') {
			throw new Error('Unauthorized: Only Project Admins can update project settings.');
		}
	}

	await db.update(projects).set({ visibility }).where(
		and(
			eq(projects.id, projectId),
			eq(projects.groupId, actor.groupId)
		)
	);
}

import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { projects, projectMembers, users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { addProjectMember, removeProjectMember, updateProjectVisibility, getAccessibleProjects, getProjectActivity } from '$lib/server/services/projects';
import { sendProjectInviteEmail } from '$lib/server/services/email';
import { getProjectTags } from '$lib/server/services/tags';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const projectId = params.id;
	
	// Ensure they have access to even view the project
	const accessible = await getAccessibleProjects(locals.user!);
	if (!accessible.find(p => p.id === projectId)) {
		throw error(404, 'Project not found or access denied');
	}

	const [project] = await db.select({
		id: projects.id,
		name: projects.name,
		visibility: projects.visibility,
		groupId: projects.groupId,
		createdAt: projects.createdAt
	}).from(projects).where(and(eq(projects.id, projectId), eq(projects.groupId, locals.user!.groupId)));

	// Fetch members with user details
	const members = await db.select({
		userId: projectMembers.userId,
		role: projectMembers.role,
		name: users.name,
		email: users.email
	})
	.from(projectMembers)
	.innerJoin(users, eq(users.id, projectMembers.userId))
	.where(eq(projectMembers.projectId, projectId));

	// Fetch group users for the invite dropdown
	const groupUsers = await db.select({
		id: users.id,
		name: users.name,
		email: users.email
	}).from(users).where(eq(users.groupId, locals.user!.groupId));

	// Filter out users who are already members
	const memberIds = new Set(members.map(m => m.userId));
	const availableUsers = groupUsers.filter(u => !memberIds.has(u.id));

	// Fetch Tags
	const tags = await getProjectTags(locals.user!, projectId);

	// Fetch Activity (initial 15)
	const activity = await getProjectActivity(locals.user!, projectId, 15, 0);

	return {
		project,
		members,
		availableUsers,
		tags,
		activity
	};
};

export const actions: Actions = {
	updateVisibility: async ({ request, params, locals }) => {
		const data = await request.formData();
		const visibility = data.get('visibility')?.toString() as 'Public' | 'Private';

		try {
			await updateProjectVisibility(locals.user!, params.id, visibility);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	addMember: async ({ request, params, locals }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		const role = data.get('role')?.toString() as 'Admin' | 'Member';

		if (!email) return fail(400, { error: 'Email is required' });

		try {
			// Find existing user in group
			let [targetUser] = await db.select({
				id: users.id,
				email: users.email,
				name: users.name,
				groupId: users.groupId,
				role: users.role
			}).from(users).where(
				and(
					eq(users.email, email),
					eq(users.groupId, locals.user!.groupId)
				)
			);

			let isNewUser = false;
			if (!targetUser) {
				isNewUser = true;
				// User doesn't exist, create a pending user in the group
				[targetUser] = await db.insert(users).values({
					email,
					name: email.split('@')[0], // placeholder name
					groupId: locals.user!.groupId,
					role: 'Member'
				}).returning();
			}

			await addProjectMember(locals.user!, params.id, targetUser.id, role || 'Member');
			
			// Fire and forget email invite
			const [project] = await db.select({ name: projects.name }).from(projects).where(and(eq(projects.id, params.id), eq(projects.groupId, locals.user!.groupId)));
			if (project) {
				sendProjectInviteEmail(email, project.name, locals.user!.name || 'A teammate', isNewUser).catch(console.error);
			}

			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	removeMember: async ({ request, params, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();

		if (!userId) return fail(400, { error: 'User is required' });

		try {
			await removeProjectMember(locals.user!, params.id, userId);
			
			// If they removed themselves, they might lose access. The layout will naturally refresh and hide the project.
			// To be safe, redirect to dashboard if they removed themselves and it's private and they aren't admin.
			if (userId === locals.user!.id && locals.user!.role !== 'Admin') {
				throw redirect(303, '/');
			}
			return { success: true };
		} catch (e: any) {
			if (e.status === 303) throw e;
			return fail(403, { error: e.message });
		}
	},

	updateMemberRole: async ({ request, params, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();
		const role = data.get('role')?.toString() as 'Admin' | 'Member';

		if (!userId || !role) return fail(400, { error: 'User and Role are required' });

		try {
			await addProjectMember(locals.user!, params.id, userId, role);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	}
};

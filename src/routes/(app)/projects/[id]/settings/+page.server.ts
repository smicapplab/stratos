import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { projects, projectMembers, users, boards } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { addProjectMember, removeProjectMember, updateProjectVisibility, getAccessibleProjects, getProjectActivity, updateProjectSettings, deleteProject } from '$lib/server/services/projects';
import { sendProjectInviteEmail } from '$lib/server/services/email';
import { generateTempPassword } from '$lib/server/services/users';
import * as argon2 from 'argon2';
import { getProjectTags } from '$lib/server/services/tags';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/');
	const projectId = params.id;
	
	// Ensure they have access to even view the project
	const accessible = await getAccessibleProjects(locals.user);
	if (!accessible.find(p => p.id === projectId)) {
		throw error(404, 'Project not found or access denied');
	}

	const [project] = await db.select({
		id: projects.id,
		name: projects.name,
		icon: projects.icon,
		visibility: projects.visibility,
		enableStandups: projects.enableStandups,
		groupId: projects.groupId,
		createdAt: projects.createdAt
	}).from(projects).where(
		and(
			eq(projects.id, projectId),
			eq(projects.groupId, locals.user!.groupId),
			isNull(projects.deletedAt)
		)
	);

	// Fetch primary board for this project to retrieve task prefix
	const [primaryBoard] = await db.select({ prefix: boards.prefix })
		.from(boards)
		.where(
			and(
				eq(boards.projectId, projectId),
				eq(boards.groupId, locals.user!.groupId),
				isNull(boards.deletedAt)
			)
		)
		.limit(1);

	const projectWithPrefix = {
		...project,
		prefix: primaryBoard?.prefix || 'TSK'
	};

	// Fetch members with user details
	const members = await db.select({
		userId: projectMembers.userId,
		role: projectMembers.role,
		name: users.name,
		email: users.email
	})
	.from(projectMembers)
	.innerJoin(users, eq(users.id, projectMembers.userId))
	.where(
		and(
			eq(projectMembers.projectId, projectId),
			isNull(users.deletedAt)
		)
	);

	// Fetch group users for the invite dropdown
	const groupUsers = await db.select({
		id: users.id,
		name: users.name,
		email: users.email
	}).from(users).where(
		and(
			eq(users.groupId, locals.user!.groupId),
			isNull(users.deletedAt)
		)
	);

	// Filter out users who are already members
	const memberIds = new Set(members.map(m => m.userId));
	const availableUsers = groupUsers.filter(u => !memberIds.has(u.id));

	// Fetch Tags
	const tags = await getProjectTags(locals.user!, projectId);

	// Fetch Activity (initial 15)
	const activity = await getProjectActivity(locals.user!, projectId, 15, 0);

	return {
		project: projectWithPrefix,
		members,
		availableUsers,
		tags,
		activity
	};
};

export const actions: Actions = {
	updateProjectSettings: async ({ request, params, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString()?.trim();
		const icon = data.get('icon')?.toString();
		const prefix = data.get('prefix')?.toString()?.trim().toUpperCase();

		if (!name) return fail(400, { error: 'Project name is required' });
		if (!prefix) return fail(400, { error: 'Task prefix is required' });
		if (prefix.length > 10 || !/^[A-Z0-9]+$/.test(prefix)) {
			return fail(400, { error: 'Prefix must be 1 to 10 uppercase letters or numbers' });
		}

		try {
			// Check prefix uniqueness across the group
			const existingBoards = await db.select({ id: boards.id, projectId: boards.projectId })
				.from(boards)
				.where(
					and(
						eq(boards.groupId, locals.user!.groupId),
						eq(boards.prefix, prefix),
						isNull(boards.deletedAt)
					)
				);

			const conflicting = existingBoards.find(b => b.projectId !== params.id);
			if (conflicting) {
				return fail(400, { error: `The prefix "${prefix}" is already taken by another project or board.` });
			}

			await updateProjectSettings(locals.user!, params.id, name, icon || 'Folder');

			// Update prefix for all boards belonging to this project
			await db.update(boards)
				.set({ prefix })
				.where(
					and(
						eq(boards.projectId, params.id),
						eq(boards.groupId, locals.user!.groupId)
					)
				);

			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	updateVisibility: async ({ request, params, locals }) => {
		const data = await request.formData();
		const visibility = data.get('visibility')?.toString() as 'Public' | 'Private';

		try {
			await updateProjectVisibility(locals.user!, params.id, visibility);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	updateStandupsToggle: async ({ request, params, locals }) => {
		const data = await request.formData();
		const enableStandups = data.get('enableStandups') === 'true' || data.get('enableStandups') === 'on';

		try {
			await db.update(projects)
				.set({ enableStandups })
				.where(
					and(
						eq(projects.id, params.id),
						eq(projects.groupId, locals.user!.groupId),
						isNull(projects.deletedAt)
					)
				);
			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	addMember: async ({ request, params, locals }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim().toLowerCase();
		const role = data.get('role')?.toString() as 'Admin' | 'Member';

		if (!email) return fail(400, { error: 'Email is required' });

		try {
			const actor = locals.user!;
			if (actor.role !== 'Admin') {
				const [member] = await db.select({ role: projectMembers.role }).from(projectMembers).where(
					and(
						eq(projectMembers.projectId, params.id),
						eq(projectMembers.userId, actor.id)
					)
				);
				if (!member || member.role !== 'Admin') {
					return fail(403, { error: 'Not authorized to manage project members' });
				}
			}

			let [targetUser] = await db.select({
				id: users.id,
				email: users.email,
				name: users.name,
				groupId: users.groupId,
				role: users.role
			}).from(users).where(
				and(
					eq(users.email, email),
					eq(users.groupId, locals.user!.groupId),
					isNull(users.deletedAt)
				)
			);

			let isNewUser = false;
			let tempPassword: string | undefined;

			if (!targetUser) {
				isNewUser = true;
				tempPassword = generateTempPassword();
				const hashedTempPassword = await argon2.hash(tempPassword);

				[targetUser] = await db.insert(users).values({
					email,
					name: email.split('@')[0],
					groupId: locals.user!.groupId,
					role: 'Member',
					hashedPassword: hashedTempPassword,
					mustChangePassword: true
				}).returning();
			}

			await addProjectMember(locals.user!, params.id, targetUser.id, role || 'Member');
			
			const [project] = await db.select({ name: projects.name }).from(projects).where(and(eq(projects.id, params.id), eq(projects.groupId, locals.user!.groupId)));
			if (project) {
				sendProjectInviteEmail(email, project.name, locals.user!.name || 'A teammate', isNewUser, tempPassword).catch(console.error);
			}

			return { success: true };
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	removeMember: async ({ request, params, locals }) => {
		const data = await request.formData();
		const userId = data.get('userId')?.toString();

		if (!userId) return fail(400, { error: 'User is required' });

		try {
			await removeProjectMember(locals.user!, params.id, userId);
			
			if (userId === locals.user!.id && locals.user!.role !== 'Admin') {
				throw redirect(303, '/');
			}
			return { success: true };
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) throw err;
			const error = err as Error;
			return fail(403, { error: error.message });
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
		} catch (err) {
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	},

	delete: async ({ params, locals }) => {
		try {
			await deleteProject(locals.user!, params.id);
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) throw err;
			const error = err as Error;
			return fail(403, { error: error.message });
		}
	}
};

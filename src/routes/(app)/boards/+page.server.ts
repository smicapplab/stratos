import { db } from '$lib/server/db/db';
import { boards, projects } from '$lib/server/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getAccessibleProjects } from '$lib/server/services/projects';
import { createBoard, deleteBoard } from '$lib/server/services/boards';
import { fail } from '@sveltejs/kit';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const actor = locals.user!; // Layout guard ensures this exists
	
	const accessibleProjects = await getAccessibleProjects(actor);
	const projectIds = accessibleProjects.map(p => p.id);

	let groupBoards: any[] = [];
	if (projectIds.length > 0) {
		groupBoards = await db
			.select({
				id: boards.id,
				name: boards.name,
				createdAt: boards.createdAt,
				projectName: projects.name
			})
			.from(boards)
			.innerJoin(projects, eq(boards.projectId, projects.id))
			.where(
				and(
					eq(boards.groupId, actor.groupId),
					isNull(boards.deletedAt),
					isNull(projects.deletedAt),
					inArray(boards.projectId, projectIds)
				)
			);
	}
	
	return {
		boards: groupBoards,
		projects: accessibleProjects
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const projectId = data.get('projectId')?.toString();
		let prefix = data.get('prefix')?.toString()?.toUpperCase();

		if (!name || !projectId || !prefix) {
			return fail(400, { error: 'Name, Prefix, and Project are required' });
		}
		
		if (prefix.length > 10) {
			return fail(400, { error: 'Prefix must be less than 10 characters', field: 'prefix' });
		}

		try {
			await createBoard(locals.user!, projectId, name, prefix);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const boardId = data.get('boardId')?.toString();

		if (!boardId) return fail(400, { error: 'Board ID is required' });

		try {
			await deleteBoard(locals.user!, boardId);
			return { success: true };
		} catch (e: any) {
			return fail(403, { error: e.message });
		}
	}
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroupBoards } from '$lib/server/services/boards';
import { db } from '$lib/server/db/db';
import { stages } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const boardsList = await getGroupBoards(user);
		
		// Join boards with stages to return active stages per board
		const boardsWithStages = await Promise.all(
			boardsList.map(async (board) => {
				const boardStages = await db.select({
					id: stages.id,
					name: stages.name,
					orderIndex: stages.orderIndex,
					isCompleted: stages.isCompleted
				})
				.from(stages)
				.where(
					and(
						eq(stages.boardId, board.id),
						isNull(stages.deletedAt)
					)
				)
				.orderBy(stages.orderIndex);

				return {
					...board,
					stages: boardStages
				};
			})
		);

		return json(boardsWithStages);
	} catch (err: any) {
		console.error('Failed to get boards:', err);
		return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
	}
};

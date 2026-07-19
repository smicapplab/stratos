import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/db';
import { tasks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTask } from '$lib/server/services/tasks';
import { emitBoardEvent } from '$lib/server/services/events';
import { invalidateDashboardCache } from '$lib/server/redis';

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { epic, stories, sourceId } = body;

		if (!epic || !epic.title || !epic.stageId) {
			return json({ error: 'Missing epic definition (title and stageId are required)' }, { status: 400 });
		}

		if (!sourceId) {
			return json({ error: 'sourceId idempotency key is required' }, { status: 400 });
		}

		// 1. Cap maximum batch size to 50 (1 Epic + 49 Stories)
		const storiesList = Array.isArray(stories) ? stories : [];
		if (storiesList.length + 1 > 50) {
			return json({ error: 'Payload too large: maximum 50 tasks per bulk request' }, { status: 413 });
		}

		// 2. Enforce Idempotency Check (groupId + sourceId scope check)
		const [existingEpic] = await db.select({ id: tasks.id })
			.from(tasks)
			.where(
				and(
					eq(tasks.groupId, user.groupId),
					eq(tasks.sourceId, sourceId)
				)
			)
			.limit(1);

		if (existingEpic) {
			return json({ error: 'Conflict: This sourceId has already been imported' }, { status: 409 });
		}

		// 3. Atomically create Epic + Stories inside a transaction
		const result = await db.transaction(async (tx) => {
			// A. Create Epic card
			const epicCard = await createTask(
				user,
				epic.stageId,
				epic.title,
				null,
				null,
				null,
				tx
			);

			// Update sourceId on the Epic card so future calls are blocked
			await tx.update(tasks)
				.set({ sourceId, description: epic.description || null })
				.where(eq(tasks.id, epicCard.id));

			const storyCards = [];

			// B. Create child Story cards sequentially setting parentTaskId
			for (const story of storiesList) {
				const storyCard = await createTask(
					user,
					epic.stageId, // Appends to same stage
					story.title,
					null,
					null,
					epicCard.id, // Linked to Epic
					tx
				);

				if (story.description) {
					await tx.update(tasks)
						.set({ description: story.description })
						.where(eq(tasks.id, storyCard.id));
				}

				storyCards.push(storyCard);
			}

			return {
				epic: { ...epicCard, sourceId, description: epic.description || null },
				stories: storyCards,
				epicBoardId: epicCard.boardId
			};
		});

		// Emit WebSocket events and invalidate cache only after the transaction has committed
		// successfully. Doing this inside the tx would fire ghost events if a later step rolls back.
		emitBoardEvent(result.epicBoardId, 'task_created', { task: result.epic });
		for (const story of result.stories) {
			emitBoardEvent(story.boardId, 'task_created', { task: story });
		}
		await invalidateDashboardCache(user.groupId);

		// Strip internal epicBoardId field before returning to the caller
		const { epicBoardId, ...epicResponse } = result;
		return json({ epic: epicResponse.epic, stories: epicResponse.stories }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Internal Server Error';
		console.error('Bulk creation error:', err);
		return json({ error: message }, { status: 500 });
	}
};

import { db } from '../src/lib/server/db/db';
import { tasks, boards, projects } from '../src/lib/server/db/schema';
import { eq, and, isNull, isNotNull, inArray, or } from 'drizzle-orm';

async function main() {
	console.log('Running cleanup of orphaned tasks on deleted boards or projects...');

	// 1. Soft-delete tasks whose board is deleted
	const deletedBoards = await db.select({ id: boards.id }).from(boards).where(isNotNull(boards.deletedAt));
	const deletedBoardIds = deletedBoards.map(b => b.id);

	if (deletedBoardIds.length > 0) {
		const resBoardTasks = await db.update(tasks)
			.set({ deletedAt: new Date() })
			.where(
				and(
					isNull(tasks.deletedAt),
					inArray(tasks.boardId, deletedBoardIds)
				)
			)
			.returning({ id: tasks.id, title: tasks.title });
		
		console.log(`Soft-deleted ${resBoardTasks.length} tasks from deleted boards:`, resBoardTasks.map(t => t.title));
	} else {
		console.log('No deleted boards found with active tasks.');
	}

	// 2. Soft-delete tasks whose project is deleted
	const deletedProjects = await db.select({ id: projects.id }).from(projects).where(isNotNull(projects.deletedAt));
	const deletedProjectIds = deletedProjects.map(p => p.id);

	if (deletedProjectIds.length > 0) {
		const resProjectTasks = await db.update(tasks)
			.set({ deletedAt: new Date() })
			.where(
				and(
					isNull(tasks.deletedAt),
					inArray(tasks.projectId, deletedProjectIds)
				)
			)
			.returning({ id: tasks.id, title: tasks.title });
		
		console.log(`Soft-deleted ${resProjectTasks.length} tasks from deleted projects:`, resProjectTasks.map(t => t.title));
	} else {
		console.log('No deleted projects found with active tasks.');
	}

	console.log('Cleanup completed successfully.');
	process.exit(0);
}

main().catch(err => {
	console.error('Cleanup error:', err);
	process.exit(1);
});

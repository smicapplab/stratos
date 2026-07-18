import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/stratos',
});
const db = drizzle(pool);
import { groups, users, projects, projectMembers, boards, stages, tasks, comments, auditLogs } from './schema';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import argon2 from 'argon2';
import { generateKeyBetween } from 'fractional-indexing';

function daysAgo(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d;
}

function daysFromNow(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

async function main() {
	const args = process.argv.slice(2);
	const isDev = args.includes('dev') || args.includes('--dev');
	const mode = isDev ? 'dev' : 'prod';

	console.log(`=========================================`);
	console.log(` Seeding Database: Mode = [${mode.toUpperCase()}]`);
	console.log(`=========================================`);

	console.log('Clearing existing data...');
	await db.delete(comments);
	await db.delete(auditLogs);
	await db.delete(tasks);
	await db.delete(stages);
	await db.delete(boards);
	await db.delete(projectMembers);
	await db.delete(projects);
	await db.delete(users);
	await db.delete(groups);

	console.log('Generating password hash...');
	const passwordHash = await argon2.hash('password123');

	// Create Group (Acme Corp)
	const groupId = uuidv4();
	await db.insert(groups).values({
		id: groupId,
		name: 'Acme Corp'
	}).onConflictDoNothing();

	// Define all user IDs to link in dev mode
	const adminId = uuidv4();
	const userId1 = uuidv4(); // Bob Builder
	const userId2 = uuidv4(); // Charlie Coder
	const userId3 = uuidv4(); // Dave Designer
	const userId4 = uuidv4(); // Emma Executive

	// Let's create the users list:
	const usersList = [
		{ id: adminId, groupId, email: 'admin@acme.internal', name: 'Alice Admin', role: 'Admin', hashedPassword: passwordHash }
	];
	if (mode === 'dev') {
		usersList.push(
			{ id: userId1, groupId, email: 'bob@acme.internal', name: 'Bob Builder', role: 'Member', hashedPassword: passwordHash },
			{ id: userId2, groupId, email: 'charlie@acme.internal', name: 'Charlie Coder', role: 'Member', hashedPassword: passwordHash },
			{ id: userId3, groupId, email: 'dave@acme.internal', name: 'Dave Designer', role: 'Member', hashedPassword: passwordHash },
			{ id: userId4, groupId, email: 'emma@acme.internal', name: 'Emma Executive', role: 'Member', hashedPassword: passwordHash }
		);
	}

	console.log(`Seeding ${usersList.length} users...`);
	await db.insert(users).values(usersList).onConflictDoNothing();

	if (mode === 'dev') {
		console.log('Seeding projects & members...');
		// Create Seeder Project
		const projectId = uuidv4();
		await db.insert(projects).values({
			id: projectId,
			groupId,
			name: 'Acme Core Applications',
			visibility: 'Public'
		}).onConflictDoNothing();

		await db.insert(projectMembers).values([
			{ projectId, userId: adminId, role: 'Admin' },
			{ projectId, userId: userId1, role: 'Member' },
			{ projectId, userId: userId2, role: 'Member' },
			{ projectId, userId: userId3, role: 'Member' },
			{ projectId, userId: userId4, role: 'Member' }
		]).onConflictDoNothing();

		// Create Boards
		const board1Id = uuidv4();
		const board2Id = uuidv4();

		await db.insert(boards).values([
			{ id: board1Id, projectId, groupId, name: 'Web App', prefix: 'WEB' },
			{ id: board2Id, projectId, groupId, name: 'Mobile App', prefix: 'MOB' }
		]).onConflictDoNothing();

		// Create Stages
		const s11 = uuidv4(); const s12 = uuidv4(); const s13 = uuidv4();
		await db.insert(stages).values([
			{ id: s11, boardId: board1Id, name: 'To Do', orderIndex: generateKeyBetween(null, null) },
			{ id: s12, boardId: board1Id, name: 'In Progress', orderIndex: generateKeyBetween(generateKeyBetween(null, null), null) },
			{ id: s13, boardId: board1Id, name: 'Done', orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null), isCompleted: true }
		]).onConflictDoNothing();

		const s21 = uuidv4(); const s22 = uuidv4();
		await db.insert(stages).values([
			{ id: s21, boardId: board2Id, name: 'Backlog', orderIndex: generateKeyBetween(null, null) },
			{ id: s22, boardId: board2Id, name: 'Sprint', orderIndex: generateKeyBetween(generateKeyBetween(null, null), null) }
		]).onConflictDoNothing();

		// Create Tasks
		const t1 = uuidv4(); const t2 = uuidv4(); const t3 = uuidv4(); const t4 = uuidv4();
		const t5 = uuidv4(); const t6 = uuidv4(); const t7 = uuidv4();

		console.log('Seeding diverse tasks and subtasks...');
		await db.insert(tasks).values([
			// Task 1: Login API - Overdue
			{ 
				id: t1, 
				stageId: s11, 
				boardId: board1Id, 
				projectId,
				groupId, 
				title: 'Implement Login API', 
				description: 'Use JWT with secure HTTP-only cookies and proper token rotation mechanics.', 
				priority: 'High', 
				orderIndex: generateKeyBetween(null, null), 
				assigneeId: userId1,
				dueDate: daysAgo(3),
				createdAt: daysAgo(10),
				updatedAt: daysAgo(3)
			},
			// Task 2: Dashboard UI - In Progress (Due Tomorrow)
			{ 
				id: t2, 
				stageId: s12, 
				boardId: board1Id, 
				projectId,
				groupId, 
				title: 'Build Dashboard UI', 
				description: 'Implement KPI cards, charts, and notification feed widgets using Svelte 5.', 
				priority: 'Medium', 
				orderIndex: generateKeyBetween(generateKeyBetween(null, null), null), 
				assigneeId: userId2,
				dueDate: daysFromNow(1),
				createdAt: daysAgo(5),
				updatedAt: daysAgo(1)
			},
			// Task 3: Setup DB - Completed (Due 8 days ago, completed 8 days ago)
			{ 
				id: t3, 
				stageId: s13, 
				boardId: board1Id, 
				projectId,
				groupId, 
				title: 'Setup DB Schema & ORM', 
				description: 'Configure Drizzle ORM and Postgres pool with automatic soft deletes.', 
				priority: 'Urgent', 
				orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null), 
				assigneeId: adminId,
				dueDate: daysAgo(8),
				createdAt: daysAgo(12),
				updatedAt: daysAgo(8)
			},
			// Task 4: React Native Setup - Backlog (Due in a week)
			{ 
				id: t4, 
				stageId: s21, 
				boardId: board2Id, 
				projectId,
				groupId, 
				title: 'React Native Setup', 
				description: 'Initialize bare react native workspace and setup development workflows.', 
				priority: 'High', 
				orderIndex: generateKeyBetween(null, null), 
				assigneeId: userId1,
				dueDate: daysFromNow(7),
				createdAt: daysAgo(7),
				updatedAt: daysAgo(7)
			},
			// Task 5: Write API Documentation (To Do, Low Priority, due in 5 days)
			{
				id: t5,
				stageId: s11,
				boardId: board1Id,
				projectId,
				groupId,
				title: 'Write API Documentation',
				description: 'Document endpoints, payloads, response codes, and authentication requirements.',
				priority: 'Low',
				orderIndex: generateKeyBetween(generateKeyBetween(null, null), null),
				assigneeId: userId3,
				dueDate: daysFromNow(5),
				createdAt: daysAgo(2),
				updatedAt: daysAgo(2)
			},
			// Task 6: Design Brand Assets (In Progress, Medium priority, due today)
			{
				id: t6,
				stageId: s12,
				boardId: board1Id,
				projectId,
				groupId,
				title: 'Design Brand Assets',
				description: 'Create high fidelity svg vector icons and responsive logo lockups.',
				priority: 'Medium',
				orderIndex: generateKeyBetween(null, null),
				assigneeId: userId3,
				dueDate: new Date(),
				createdAt: daysAgo(3),
				updatedAt: new Date()
			},
			// Task 7: Security Compliance Review (To Do, Urgent priority, due in 2 weeks)
			{
				id: t7,
				stageId: s11,
				boardId: board1Id,
				projectId,
				groupId,
				title: 'Security Compliance Review',
				description: 'Audit system routes and actions to ensure correct multi-tenant group checks are performed.',
				priority: 'Urgent',
				orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null),
				assigneeId: adminId,
				dueDate: daysFromNow(14),
				createdAt: daysAgo(1),
				updatedAt: daysAgo(1)
			}
		]).onConflictDoNothing();

		// Subtasks for T2 (Dashboard UI)
		const sub1 = uuidv4(); const sub2 = uuidv4(); const sub3 = uuidv4();
		await db.insert(tasks).values([
			{ 
				id: sub1, 
				stageId: s12, 
				boardId: board1Id, 
				projectId,
				groupId, 
				title: 'Header Component', 
				priority: 'Medium', 
				orderIndex: generateKeyBetween(null, null), 
				parentTaskId: t2, 
				assigneeId: userId2,
				createdAt: daysAgo(4),
				updatedAt: daysAgo(2)
			},
			{ 
				id: sub2, 
				stageId: s12, 
				boardId: board1Id, 
				projectId,
				groupId, 
				title: 'Sidebar Component', 
				priority: 'Medium', 
				orderIndex: generateKeyBetween(generateKeyBetween(null, null), null), 
				parentTaskId: t2, 
				assigneeId: userId1,
				dueDate: daysAgo(1), // Overdue subtask
				createdAt: daysAgo(4),
				updatedAt: daysAgo(1)
			},
			{ 
				id: sub3, 
				stageId: s13, 
				boardId: board1Id, 
				projectId,
				groupId, 
				title: 'KPI Cards Grid', 
				priority: 'Medium', 
				orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null), 
				parentTaskId: t2, 
				assigneeId: userId2,
				createdAt: daysAgo(3),
				updatedAt: daysAgo(1)
			}
		]).onConflictDoNothing();

		// Create Helpdesk Private Project
		console.log('Seeding Helpdesk Private Project & Tickets...');
		const supportProjectId = uuidv4();
		await db.insert(projects).values({
			id: supportProjectId,
			groupId,
			name: 'System Support & Tickets',
			visibility: 'Private'
		}).onConflictDoNothing();

		// Add Alice Admin, Charlie Developer, Emma Exec to Support Project
		await db.insert(projectMembers).values([
			{ projectId: supportProjectId, userId: adminId, role: 'Admin' },
			{ projectId: supportProjectId, userId: userId2, role: 'Member' },
			{ projectId: supportProjectId, userId: userId4, role: 'Member' }
		]).onConflictDoNothing();

		// Create Helpdesk Board
		const supportBoardId = uuidv4();
		await db.insert(boards).values({
			id: supportBoardId,
			projectId: supportProjectId,
			groupId,
			name: 'Helpdesk Tickets',
			prefix: 'TIC'
		}).onConflictDoNothing();

		// Create Helpdesk Stages
		const supportStageIncoming = uuidv4();
		const supportStageProgress = uuidv4();
		const supportStageResolved = uuidv4();

		await db.insert(stages).values([
			{ id: supportStageIncoming, boardId: supportBoardId, name: 'Incoming', orderIndex: generateKeyBetween(null, null) },
			{ id: supportStageProgress, boardId: supportBoardId, name: 'In Progress', orderIndex: generateKeyBetween(generateKeyBetween(null, null), null) },
			{ id: supportStageResolved, boardId: supportBoardId, name: 'Resolved', orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null), isCompleted: true }
		]).onConflictDoNothing();

		// Seed support tickets (Bob Builder and others are reporters)
		const ticket1Id = uuidv4();
		const ticket2Id = uuidv4();
		const ticket3Id = uuidv4();
		const ticket4Id = uuidv4();

		await db.insert(tasks).values([
			// Ticket 1: Bug on mobile - High priority, Incoming
			{
				id: ticket1Id,
				stageId: supportStageIncoming,
				boardId: supportBoardId,
				projectId: supportProjectId,
				groupId,
				title: '[Bug] Cannot load dashboards on mobile',
				description: 'When visiting dashboards on a mobile browser, the screen spins indefinitely. Tested on iOS 17.5 Safari.',
				priority: 'High',
				orderIndex: generateKeyBetween(null, null),
				assigneeId: userId2,
				customFields: {
					reporterId: userId1,
					ticketType: 'Bug'
				},
				createdAt: daysAgo(4),
				updatedAt: daysAgo(3)
			},
			// Ticket 2: Slack integration - Medium priority, In Progress
			{
				id: ticket2Id,
				stageId: supportStageProgress,
				boardId: supportBoardId,
				projectId: supportProjectId,
				groupId,
				title: '[Feature Request] Slack Integration for notifications',
				description: 'We need channel-specific alerts for comment mentions and status overrides.',
				priority: 'Medium',
				orderIndex: generateKeyBetween(generateKeyBetween(null, null), null),
				assigneeId: userId2,
				customFields: {
					reporterId: userId4,
					ticketType: 'Feature'
				},
				createdAt: daysAgo(3),
				updatedAt: daysAgo(1)
			},
			// Ticket 3: Reset Password link expired - Medium priority, Resolved
			{
				id: ticket3Id,
				stageId: supportStageResolved,
				boardId: supportBoardId,
				projectId: supportProjectId,
				groupId,
				title: '[Support] Reset Password link expired too fast',
				description: 'Bob reported the reset link expired in less than 5 minutes. Config value might be parsed wrong.',
				priority: 'Medium',
				orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null),
				assigneeId: adminId,
				customFields: {
					reporterId: userId1,
					ticketType: 'Support'
				},
				createdAt: daysAgo(6),
				updatedAt: daysAgo(3)
			},
			// Ticket 4: Pool exhaustion - Urgent priority, Incoming
			{
				id: ticket4Id,
				stageId: supportStageIncoming,
				boardId: supportBoardId,
				projectId: supportProjectId,
				groupId,
				title: '[Bug] Database connection pool exhaustion under load',
				description: 'High concurrency testing results in connection timeouts. Need to tune PG pool limit parameters.',
				priority: 'Urgent',
				orderIndex: generateKeyBetween(null, null),
				assigneeId: adminId,
				customFields: {
					reporterId: userId2,
					ticketType: 'Bug'
				},
				createdAt: new Date(),
				updatedAt: new Date()
			}
		]).onConflictDoNothing();

		// Seed Comments
		console.log('Seeding interactive comments...');
		await db.insert(comments).values([
			// Comments on Task 2 (Dashboard UI)
			{
				id: uuidv4(),
				taskId: t2,
				authorId: userId2,
				content: "I've started working on the Header component. Layout is fully responsive.",
				createdAt: daysAgo(3),
				updatedAt: daysAgo(3)
			},
			{
				id: uuidv4(),
				taskId: t2,
				authorId: userId3,
				content: "Awesome, please ensure the mobile slide-out menu works correctly and closes on tap outside.",
				createdAt: daysAgo(2),
				updatedAt: daysAgo(2)
			},
			{
				id: uuidv4(),
				taskId: t2,
				authorId: userId1,
				content: "Sidebar component is done and styles merged. Charlie, let me know when you need review.",
				createdAt: daysAgo(1),
				updatedAt: daysAgo(1)
			},
			// Comments on Ticket 1 (Mobile bug)
			{
				id: uuidv4(),
				taskId: ticket1Id,
				authorId: userId1,
				content: "I see a white screen on iOS 17.5. Seems like a Svelte 5 hydration error in layout.svelte.",
				createdAt: daysAgo(4),
				updatedAt: daysAgo(4)
			},
			{
				id: uuidv4(),
				taskId: ticket1Id,
				authorId: userId2,
				content: "Looking into it. I'll test it on my physical iPhone to check console logs.",
				createdAt: daysAgo(3),
				updatedAt: daysAgo(3)
			},
			{
				id: uuidv4(),
				taskId: ticket1Id,
				authorId: userId4,
				content: "Is there any progress on this? Our executives cannot check task metrics on the go.",
				createdAt: daysAgo(1),
				updatedAt: daysAgo(1)
			}
		]).onConflictDoNothing();

		// Seed Audit Logs
		console.log('Seeding historical audit logs...');
		await db.insert(auditLogs).values([
			{
				id: uuidv4(),
				groupId,
				projectId,
				taskId: t3,
				userId: adminId,
				actionType: 'status_change',
				oldValue: 'To Do',
				newValue: 'In Progress',
				createdAt: daysAgo(11)
			},
			{
				id: uuidv4(),
				groupId,
				projectId,
				taskId: t3,
				userId: adminId,
				actionType: 'status_change',
				oldValue: 'In Progress',
				newValue: 'Done',
				createdAt: daysAgo(8)
			},
			{
				id: uuidv4(),
				groupId,
				projectId,
				taskId: t2,
				userId: userId2,
				actionType: 'status_change',
				oldValue: 'To Do',
				newValue: 'In Progress',
				createdAt: daysAgo(4)
			},
			{
				id: uuidv4(),
				groupId,
				projectId: supportProjectId,
				taskId: ticket3Id,
				userId: adminId,
				actionType: 'status_change',
				oldValue: 'Incoming',
				newValue: 'In Progress',
				createdAt: daysAgo(5)
			},
			{
				id: uuidv4(),
				groupId,
				projectId: supportProjectId,
				taskId: ticket3Id,
				userId: adminId,
				actionType: 'status_change',
				oldValue: 'In Progress',
				newValue: 'Resolved',
				createdAt: daysAgo(3)
			}
		]).onConflictDoNothing();
	}

	console.log('=========================================');
	console.log('🎉 Seed completed successfully!');
	console.log('=========================================');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seed script encountered error:', err);
	process.exit(1);
});

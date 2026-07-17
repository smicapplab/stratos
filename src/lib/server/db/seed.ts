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

async function main() {
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

	console.log('Seeding data...');

	const passwordHash = await argon2.hash('password123');

	// Create Group
	const groupId = uuidv4();
	await db.insert(groups).values({
		id: groupId,
		name: 'Acme Corp'
	}).onConflictDoNothing();

	// Create Users
	const adminId = uuidv4();
	const userId1 = uuidv4();
	const userId2 = uuidv4();

	await db.insert(users).values([
		{ id: adminId, groupId, email: 'admin@acme.internal', name: 'Alice Admin', role: 'Admin', hashedPassword: passwordHash },
		{ id: userId1, groupId, email: 'bob@acme.internal', name: 'Bob Builder', role: 'Member', hashedPassword: passwordHash },
		{ id: userId2, groupId, email: 'charlie@acme.internal', name: 'Charlie Coder', role: 'Member', hashedPassword: passwordHash }
	]).onConflictDoNothing();

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
		{ projectId, userId: userId2, role: 'Member' }
	]).onConflictDoNothing();

	// Create Boards
	const board1Id = uuidv4();
	const board2Id = uuidv4();

	await db.insert(boards).values([
		{ id: board1Id, projectId, groupId, name: 'Web App' },
		{ id: board2Id, projectId, groupId, name: 'Mobile App' }
	]).onConflictDoNothing();

	// Create Stages
	const s11 = uuidv4(); const s12 = uuidv4(); const s13 = uuidv4();
	await db.insert(stages).values([
		{ id: s11, boardId: board1Id, name: 'To Do', orderIndex: generateKeyBetween(null, null) },
		{ id: s12, boardId: board1Id, name: 'In Progress', orderIndex: generateKeyBetween(generateKeyBetween(null, null), null) },
		{ id: s13, boardId: board1Id, name: 'Done', orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null) }
	]).onConflictDoNothing();

	const s21 = uuidv4(); const s22 = uuidv4();
	await db.insert(stages).values([
		{ id: s21, boardId: board2Id, name: 'Backlog', orderIndex: generateKeyBetween(null, null) },
		{ id: s22, boardId: board2Id, name: 'Sprint', orderIndex: generateKeyBetween(generateKeyBetween(null, null), null) }
	]).onConflictDoNothing();

	// Create Tasks
	const t1 = uuidv4(); const t2 = uuidv4(); const t3 = uuidv4(); const t4 = uuidv4();
	await db.insert(tasks).values([
		{ id: t1, stageId: s11, boardId: board1Id, groupId, title: 'Implement Login API', description: 'Use JWT', priority: 'High', orderIndex: generateKeyBetween(null, null), assigneeId: userId1 },
		{ id: t2, stageId: s12, boardId: board1Id, groupId, title: 'Build Dashboard UI', description: 'Use Svelte', priority: 'Medium', orderIndex: generateKeyBetween(null, null), assigneeId: userId2 },
		{ id: t3, stageId: s13, boardId: board1Id, groupId, title: 'Setup DB', description: 'Use Postgres', priority: 'Urgent', orderIndex: generateKeyBetween(null, null), assigneeId: adminId },
		
		{ id: t4, stageId: s21, boardId: board2Id, groupId, title: 'React Native Setup', description: 'Init project', priority: 'High', orderIndex: generateKeyBetween(null, null), assigneeId: userId1 }
	]).onConflictDoNothing();

	// Subtasks for T2
	await db.insert(tasks).values([
		{ id: uuidv4(), stageId: s12, boardId: board1Id, groupId, title: 'Header Component', priority: 'Medium', orderIndex: generateKeyBetween(null, null), parentTaskId: t2, assigneeId: userId2 },
		{ id: uuidv4(), stageId: s12, boardId: board1Id, groupId, title: 'Sidebar Component', priority: 'Medium', orderIndex: generateKeyBetween(generateKeyBetween(null, null), null), parentTaskId: t2, assigneeId: userId1 }
	]).onConflictDoNothing();

	// Create Helpdesk Private Project
	const supportProjectId = uuidv4();
	await db.insert(projects).values({
		id: supportProjectId,
		groupId,
		name: 'System Support & Tickets',
		visibility: 'Private'
	}).onConflictDoNothing();

	// Add Alice Admin and Charlie Developer to Support Project
	await db.insert(projectMembers).values([
		{ projectId: supportProjectId, userId: adminId, role: 'Admin' },
		{ projectId: supportProjectId, userId: userId2, role: 'Member' } // Charlie Developer
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
		{
			id: supportStageIncoming,
			boardId: supportBoardId,
			name: 'Incoming',
			orderIndex: generateKeyBetween(null, null)
		},
		{
			id: supportStageProgress,
			boardId: supportBoardId,
			name: 'In Progress',
			orderIndex: generateKeyBetween(generateKeyBetween(null, null), null)
		},
		{
			id: supportStageResolved,
			boardId: supportBoardId,
			name: 'Resolved',
			orderIndex: generateKeyBetween(generateKeyBetween(generateKeyBetween(null, null), null), null),
			isCompleted: true
		}
	]).onConflictDoNothing();

	// Seed support tickets (Bob Builder is the reporter)
	await db.insert(tasks).values([
		{
			id: uuidv4(),
			stageId: supportStageIncoming,
			boardId: supportBoardId,
			groupId,
			title: '[Bug] Cannot load dashboards on mobile',
			description: 'When visiting dashboards on a mobile browser, it spins indefinitely. Tested on iOS Safari.',
			priority: 'High',
			orderIndex: generateKeyBetween(null, null),
			customFields: {
				reporterId: userId1,
				ticketType: 'Bug'
			}
		}
	]).onConflictDoNothing();

	console.log('Seed completed successfully!');
	process.exit(0);
}

main().catch(console.error);

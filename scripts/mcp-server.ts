import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { eq, and, or, isNull, inArray, asc, sql } from 'drizzle-orm';
import { generateKeyBetween } from 'fractional-indexing';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	ListToolsRequestSchema,
	CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import {
	users,
	projects,
	projectMembers,
	boards,
	stages,
	tasks,
	comments,
	auditLogs
} from '../src/lib/server/db/schema';
import { createTask, updateTask } from '../src/lib/server/services/tasks';
import { notifyCommentAdded } from '../src/lib/server/services/notifications';


const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/stratos';
const pool = new Pool({
	connectionString,
	max: 10
});

const db = drizzle(pool);

interface Actor {
	id: string;
	role: 'Admin' | 'Manager' | 'Member' | 'Viewer';
	groupId: string;
}

function stripHtml(html: string): string {
	return html.replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function resolveActor(groupId: string, userId?: string): Promise<Actor> {
	if (userId) {
		const [u] = await db.select({
			id: users.id,
			role: users.role,
			groupId: users.groupId
		})
		.from(users)
		.where(
			and(
				eq(users.id, userId),
				eq(users.groupId, groupId),
				isNull(users.deletedAt)
			)
		)
		.limit(1);

		if (!u) {
			throw new Error(`User ${userId} not found in group ${groupId}`);
		}
		return {
			id: u.id,
			role: u.role as 'Admin' | 'Manager' | 'Member' | 'Viewer',
			groupId: u.groupId
		};
	}

	const uList = await db.select({
		id: users.id,
		role: users.role,
		groupId: users.groupId
	})
	.from(users)
	.where(
		and(
			eq(users.groupId, groupId),
			isNull(users.deletedAt)
		)
	)
	.orderBy(asc(users.createdAt))
	.limit(1);

	if (uList.length === 0) {
		throw new Error(`No active users found in group ${groupId}`);
	}

	const u = uList[0];
	return {
		id: u.id,
		role: u.role as 'Admin' | 'Manager' | 'Member' | 'Viewer',
		groupId: u.groupId
	};
}

const server = new Server(
	{
		name: 'stratos-mcp-server',
		version: '1.0.0'
	},
	{
		capabilities: {
			tools: {}
		}
	}
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: 'list_projects',
				description: 'Lists all projects accessible to the group. Tenant isolation is enforced via groupId.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						userId: { type: 'string', description: 'Optional user UUID to check permissions.' }
					},
					required: ['groupId']
				}
			},
			{
				name: 'list_boards',
				description: 'Lists boards in a project. Tenant isolation is enforced via groupId.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						projectId: { type: 'string', description: 'Optional project UUID to filter boards.' },
						userId: { type: 'string', description: 'Optional user UUID to check permissions.' }
					},
					required: ['groupId']
				}
			},
			{
				name: 'list_tasks',
				description: 'Lists tasks under a board or stage, capped at 50 results. Tenant isolation is enforced via groupId.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						boardId: { type: 'string', description: 'Optional board UUID to filter tasks.' },
						stageId: { type: 'string', description: 'Optional stage UUID to filter tasks.' },
						userId: { type: 'string', description: 'Optional user UUID to check permissions.' }
					},
					required: ['groupId']
				}
			},
			{
				name: 'get_task_details',
				description: 'Retrieves full details of a specific task, including description, custom fields, checklists, and comments.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						taskId: { type: 'string', description: 'The UUID of the task.' },
						userId: { type: 'string', description: 'Optional user UUID to check permissions.' }
					},
					required: ['groupId', 'taskId']
				}
			},
			{
				name: 'create_task',
				description: 'Creates a new task in a stage.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						stageId: { type: 'string', description: 'The UUID of the stage to place the task in.' },
						title: { type: 'string', description: 'The title of the task.' },
						description: { type: 'string', description: 'Optional task description (HTML supported).' },
						userId: { type: 'string', description: 'Optional user UUID to act as the creator.' }
					},
					required: ['groupId', 'stageId', 'title']
				}
			},
			{
				name: 'update_task',
				description: 'Updates details of an existing task.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						taskId: { type: 'string', description: 'The UUID of the task to update.' },
						title: { type: 'string', description: 'Optional new title.' },
						description: { type: 'string', description: 'Optional new description (HTML supported).' },
						priority: { type: 'string', description: 'Optional new priority (Low, Medium, High, Urgent).' },
						assigneeId: { type: 'string', description: 'Optional user UUID to assign the task to.' },
						dueDate: { type: 'string', description: 'Optional ISO-8601 string of the due date.' },
						stageId: { type: 'string', description: 'Optional stage UUID to move the task to.' },
						customFields: {
							type: 'object',
							description: 'Optional dictionary of custom fields to update.',
							additionalProperties: true
						},
						userId: { type: 'string', description: 'Optional user UUID to act as the updater.' }
					},
					required: ['groupId', 'taskId']
				}
			},
			{
				name: 'add_comment',
				description: 'Adds a comment/log to a task.',
				inputSchema: {
					type: 'object',
					properties: {
						groupId: { type: 'string', description: 'The UUID of the group (tenant).' },
						taskId: { type: 'string', description: 'The UUID of the task.' },
						content: { type: 'string', description: 'The HTML content of the comment.' },
						userId: { type: 'string', description: 'Optional user UUID to act as the commenter.' }
					},
					required: ['groupId', 'taskId', 'content']
				}
			}
		]
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args = {} } = request.params;

	try {
		const groupId = args.groupId as string;
		if (!groupId) {
			throw new Error('Missing required parameter: groupId');
		}

		const userId = args.userId as string | undefined;
		const actor = await resolveActor(groupId, userId);

		if (name === 'list_projects') {
			let projectList;
			if (actor.role === 'Admin') {
				projectList = await db.select({
					id: projects.id,
					name: projects.name,
					groupId: projects.groupId,
					visibility: projects.visibility,
					createdAt: projects.createdAt
				})
				.from(projects)
				.where(
					and(
						eq(projects.groupId, groupId),
						isNull(projects.deletedAt)
					)
				)
				.orderBy(asc(projects.createdAt));
			} else {
				const userMemberProjects = await db.select({ projectId: projectMembers.projectId })
					.from(projectMembers)
					.where(eq(projectMembers.userId, actor.id));

				const memberProjectIds = userMemberProjects.map((p) => p.projectId);
				const projectConditions = memberProjectIds.length > 0
					? and(
							eq(projects.groupId, groupId),
							isNull(projects.deletedAt),
							or(
								eq(projects.visibility, 'Public'),
								inArray(projects.id, memberProjectIds)
							)
						)
					: and(
							eq(projects.groupId, groupId),
							isNull(projects.deletedAt),
							eq(projects.visibility, 'Public')
						);

				projectList = await db.select({
					id: projects.id,
					name: projects.name,
					groupId: projects.groupId,
					visibility: projects.visibility,
					createdAt: projects.createdAt
				})
				.from(projects)
				.where(projectConditions)
				.orderBy(asc(projects.createdAt));
			}

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(projectList, null, 2)
					}
				]
			};
		}

		if (name === 'list_boards') {
			const projectId = args.projectId as string | undefined;
			const queryConditions = [
				eq(boards.groupId, groupId),
				isNull(boards.deletedAt)
			];
			if (projectId) {
				queryConditions.push(eq(boards.projectId, projectId));
			}

			const boardsList = await db.select({
				id: boards.id,
				name: boards.name,
				projectId: boards.projectId,
				groupId: boards.groupId,
				createdAt: boards.createdAt
			})
			.from(boards)
			.where(and(...queryConditions))
			.orderBy(asc(boards.createdAt));

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(boardsList, null, 2)
					}
				]
			};
		}

		if (name === 'list_tasks') {
			const boardId = args.boardId as string | undefined;
			const stageId = args.stageId as string | undefined;

			const queryConditions = [
				eq(tasks.groupId, groupId),
				isNull(tasks.deletedAt)
			];
			if (boardId) {
				queryConditions.push(eq(tasks.boardId, boardId));
			}
			if (stageId) {
				queryConditions.push(eq(tasks.stageId, stageId));
			}

			const tasksList = await db.select({
				id: tasks.id,
				groupId: tasks.groupId,
				projectId: tasks.projectId,
				boardId: tasks.boardId,
				stageId: tasks.stageId,
				title: tasks.title,
				number: tasks.number,
				priority: tasks.priority,
				assigneeId: tasks.assigneeId,
				dueDate: tasks.dueDate,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt
			})
			.from(tasks)
			.where(and(...queryConditions))
			.orderBy(asc(tasks.orderIndex))
			.limit(50);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(tasksList, null, 2)
					}
				]
			};
		}

		if (name === 'get_task_details') {
			const taskId = args.taskId as string;
			if (!taskId) {
				throw new Error('Missing required parameter: taskId');
			}

			const [task] = await db.select()
				.from(tasks)
				.where(
					and(
						eq(tasks.id, taskId),
						eq(tasks.groupId, groupId),
						isNull(tasks.deletedAt)
					)
				)
				.limit(1);

			if (!task) {
				throw new Error(`Task ${taskId} not found in group ${groupId}`);
			}

			const taskComments = await db.select()
				.from(comments)
				.where(eq(comments.taskId, taskId))
				.orderBy(asc(comments.createdAt));

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							...task,
							comments: taskComments
						}, null, 2)
					}
				]
			};
		}

		if (name === 'create_task') {
			const stageId = args.stageId as string;
			const title = args.title as string;
			const description = args.description as string | undefined;

			if (!stageId || !title) {
				throw new Error('Missing stageId or title for create_task');
			}

			const newTask = await createTask(
				actor,
				stageId,
				title,
				null,
				null,
				null,
				undefined,
				description
			);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(newTask, null, 2)
					}
				]
			};
		}

		if (name === 'update_task') {
			const taskId = args.taskId as string;
			if (!taskId) {
				throw new Error('Missing taskId for update_task');
			}

			const title = args.title as string | undefined;
			const description = args.description as string | undefined;
			const priority = args.priority as string | undefined;
			const assigneeId = args.assigneeId as string | undefined;
			const dueDateStr = args.dueDate as string | undefined;
			const stageId = args.stageId as string | undefined;
			const customFields = args.customFields as Record<string, string | number | boolean | null> | undefined;

			const updates: Parameters<typeof updateTask>[2] = {};
			if (title !== undefined) updates.title = title;
			if (description !== undefined) updates.description = description;
			if (priority !== undefined) updates.priority = priority;
			if (assigneeId !== undefined) updates.assigneeId = assigneeId;
			if (dueDateStr !== undefined) updates.dueDate = dueDateStr ? new Date(dueDateStr) : null;
			if (stageId !== undefined) updates.stageId = stageId;
			if (customFields !== undefined) updates.customFields = customFields;

			const updated = await updateTask(actor, taskId, updates);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(updated, null, 2)
					}
				]
			};
		}

		if (name === 'add_comment') {
			const taskId = args.taskId as string;
			const content = args.content as string;
			
			if (!taskId || !content) {
				throw new Error('Missing taskId or content for add_comment');
			}

			// Validate task exists in group
			const [task] = await db.select({ id: tasks.id })
				.from(tasks)
				.where(
					and(
						eq(tasks.id, taskId),
						eq(tasks.groupId, groupId),
						isNull(tasks.deletedAt)
					)
				);

			if (!task) {
				throw new Error('Task not found');
			}

			const [newComment] = await db.insert(comments).values({
				taskId,
				authorId: actor.id,
				content
			}).returning();

			await notifyCommentAdded(actor.id, taskId);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(newComment, null, 2)
					}
				]
			};
		}

		throw new Error(`Unknown tool name: ${name}`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: JSON.stringify({ error: errorMessage })
				}
			]
		};
	}
});

async function run() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('Stratos MCP Server running on stdio');
}

run().catch((error) => {
	console.error('Fatal error in Stratos MCP Server:', error);
	process.exit(1);
});

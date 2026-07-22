import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, primaryKey, integer, index } from 'drizzle-orm/pg-core';

export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  hashedPassword: text('hashed_password'), // Can be null if invited but not registered yet
  groupId: uuid('group_id').references(() => groups.id).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // Admin, Member, etc.
  jobTitle: varchar('job_title', { length: 100 }),
  avatarUrl: text('avatar_url'),
  theme: varchar('theme', { length: 20 }).default('system').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  groupId: uuid('group_id').references(() => groups.id).notNull(),
  visibility: varchar('visibility', { length: 50 }).default('Public').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('Member').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.userId] })
}));

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  prefix: varchar('prefix', { length: 10 }).notNull().default('TSK'),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  groupId: uuid('group_id').references(() => groups.id).notNull(),
  creatorId: uuid('creator_id').references(() => users.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stages = pgTable('stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  boardId: uuid('board_id').references(() => boards.id).notNull(),
  orderIndex: varchar('order_index', { length: 255 }).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const tasks = pgTable('tasks', {
	id: uuid('id').defaultRandom().primaryKey(),
	groupId: uuid('group_id').references(() => groups.id).notNull(),
	projectId: uuid('project_id').references(() => projects.id), // Added optional project link for boardless tasks
	boardId: uuid('board_id').references(() => boards.id), // Link task to board directly for easy querying
	stageId: uuid('stage_id').references(() => stages.id).notNull(),
	swimlaneId: uuid('swimlane_id'), // To be linked to swimlanes later
	parentTaskId: uuid('parent_task_id'), // Self-referential for Epics/Subtasks
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	number: integer('number').notNull().default(0), // Board-scoped task number
	priority: varchar('priority', { length: 50 }).default('Medium').notNull(), // Low, Medium, High, Urgent
	checklists: jsonb('checklists').default([]),
	assigneeId: uuid('assignee_id').references(() => users.id),
	dueDate: timestamp('due_date', { withTimezone: true }),
	orderIndex: text('order_index').notNull(),
	customFields: jsonb('custom_fields').default({}),
	sourceId: varchar('source_id', { length: 255 }),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => ({
	groupIdIdx: index('tasks_group_id_idx').on(t.groupId),
	boardIdIdx: index('tasks_board_id_idx').on(t.boardId),
	stageIdIdx: index('tasks_stage_id_idx').on(t.stageId),
	parentTaskIdIdx: index('tasks_parent_task_id_idx').on(t.parentTaskId),
	updatedAtIdx: index('tasks_updated_at_idx').on(t.updatedAt),
	sourceIdGroupIdx: index('tasks_source_id_group_idx').on(t.groupId, t.sourceId) // Note: PostgreSQL partial index handles this cleanly, we can build it as a standard index or a raw SQL migration, standard multi-column index works well for multi-tenant lookup.
}));

// Self-referencing foreign key has to be done carefully in some ORMs, but Drizzle supports it natively if we use a separate relations block, or just rely on the UUID field. For Postgres, we can leave it as a loose UUID or define it strictly.

export const comments = pgTable('comments', {
	id: uuid('id').defaultRandom().primaryKey(),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	authorId: uuid('author_id').references(() => users.id).notNull(),
	parentCommentId: uuid('parent_comment_id'), // Self-referential for threaded replies
	content: text('content').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const taskLinks = pgTable('task_links', {
	id: uuid('id').defaultRandom().primaryKey(),
	sourceTaskId: uuid('source_task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	targetTaskId: uuid('target_task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	linkType: varchar('link_type', { length: 50 }).notNull(), // e.g., 'blocks', 'relates_to', 'duplicates'
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const auditLogs = pgTable('audit_logs', {
	id: uuid('id').defaultRandom().primaryKey(),
	groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
	projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }), // Made nullable
	userId: uuid('user_id').references(() => users.id).notNull(),
	actionType: varchar('action_type', { length: 255 }).notNull(), // e.g. 'status_change', 'project_created'
	oldValue: text('old_value'),
	newValue: text('new_value'),
	details: jsonb('details'), // For structured data like invites, complex state changes
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (t) => ({
	groupProjectTaskIdx: index('audit_logs_group_project_task_idx').on(t.groupId, t.projectId, t.taskId),
	// Optional: add GIN index if searching inside details is needed frequently
	// detailsGinIdx: index('audit_logs_details_gin_idx').using('gin', t.details) 
}));

export const attachments = pgTable('attachments', {
	id: uuid('id').defaultRandom().primaryKey(),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	uploaderId: uuid('uploader_id').references(() => users.id).notNull(),
	fileName: varchar('file_name', { length: 255 }).notNull(),
	fileUrl: text('file_url').notNull(),
	mimeType: varchar('mime_type', { length: 100 }),
	storageBackend: varchar('storage_backend', { length: 10 }).notNull().default('local'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const commentReactions = pgTable('comment_reactions', {
	id: uuid('id').defaultRandom().primaryKey(),
	commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
	userId: uuid('user_id').references(() => users.id).notNull(),
	emoji: varchar('emoji', { length: 50 }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const customFieldDefinitions = pgTable('custom_field_definitions', {
	id: uuid('id').defaultRandom().primaryKey(),
	groupId: uuid('group_id').references(() => groups.id).notNull(),
	boardId: uuid('board_id').references(() => boards.id), // If null, applies to whole group/project (scoping can be flexible)
	name: varchar('name', { length: 255 }).notNull(),
	type: varchar('type', { length: 50 }).notNull(), // text, number, date, select, multi-select
	options: jsonb('options').default([]), // For select types
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const notifications = pgTable('notifications', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	actorId: uuid('actor_id').references(() => users.id),
	type: varchar('type', { length: 50 }).notNull(), // 'assigned', 'mentioned', 'status_changed'
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	readAt: timestamp('read_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const tags = pgTable('tags', {
	id: uuid('id').defaultRandom().primaryKey(),
	projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
	name: varchar('name', { length: 50 }).notNull(),
	color: varchar('color', { length: 20 }).default('blue').notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }), // Replaced isDeleted with deletedAt for consistency
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const taskTags = pgTable('task_tags', {
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
	pk: primaryKey({ columns: [t.taskId, t.tagId] })
}));

export const apiTokens = pgTable('api_tokens', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(), // SHA-256 hash of the bearer token
	groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Creator/Owner
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}, (t) => ({
	groupIdIdx: index('api_tokens_group_id_idx').on(t.groupId),
	tokenHashIdx: index('api_tokens_token_hash_idx').on(t.tokenHash)
}));

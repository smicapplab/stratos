# 05 - Project Management Module

## 1. Core Objectives
- Allow projects to be restricted to specific users within a Group.
- Support multiple "Project Admins" per project.
- Ensure that boards, tasks, and activities within a restricted project are completely isolated from non-members.

## 2. Database Schema Additions (`packages/db/src/schema.ts`)

We need to introduce a many-to-many relationship table connecting `users` to `projects` with a specific role.

```typescript
export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).default('Member').notNull(), // 'Admin' | 'Member' | 'Viewer'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.userId] })
}));
```

We also need to modify the `projects` table to include visibility rules (e.g., public to group vs. private):
```typescript
// Add to projects table
visibility: varchar('visibility', { length: 50 }).default('Public').notNull(), // 'Public' (entire group) | 'Private' (members only)
```

## 3. Access Control (Backend Guards)
All backend API routes and `+page.server.ts` loaders must enforce these checks:
1. **Global Admins**: Group Admins retain implicit full access to all projects, regardless of membership.
2. **Project Visibility**: 
   - If `project.visibility === 'Public'`, any group user can read boards/tasks.
   - If `project.visibility === 'Private'`, the `actor.id` must exist in `projectMembers` for the project.
3. **Project Admins**: Only Group Admins or Project Admins (`projectMembers.role === 'Admin'`) can rename the project, delete the project, or invite/remove members.

## 4. UI/UX Vision (Frontend)
- **Sidebar Navigation**: The `+layout.server.ts` must filter `data.projects` and `data.boards` to only return projects the user has access to.
- **Project Settings Popover/Modal**:
  - Add a "Manage Members" section inside the Project Settings (currently to be built).
  - Show a list of current members with their avatars and roles.
  - Provide a combobox (similar to assignee picker) to invite users from the group.
  - Allow changing a member's role to "Admin" or removing them entirely (requires Project Admin privileges).
- **Empty States**: If a user is removed from a project they are currently viewing, gracefully redirect them to the dashboard `/` or `/my-tasks` with a Toast notification: *"You no longer have access to this project."*

## 5. Implementation Steps
1. **Schema Update & Migration**: Add `projectMembers` and `visibility` columns. Run `drizzle-kit push`.
2. **Services Layer Update**: Update `src/lib/server/services/projects.ts` (and boards) to implement the Access Control guards.
3. **Sidebar Filtering**: Modify `src/routes/(app)/+layout.server.ts` to respect visibility and membership.
4. **Member Management UI**: Build the Project Settings UI to invite/manage members.

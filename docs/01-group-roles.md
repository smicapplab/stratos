# 01 - Groups, Roles, & Data Isolation

## The "Not-SaaS" Tenancy Model
While structurally similar to a multi-tenant application, Stratos is strictly an **internal company tool**. 
- A "Tenant" is effectively a **Group** or **Department** (e.g., Engineering, Marketing, HR).
- There is no billing infrastructure or harsh silo wall; however, groups serve to partition data so departments don't clutter each other's boards.

## User Management
- **Users**: Individuals within the company. A user can belong to multiple Groups.
- **Groups**: Distinct workspaces. All Tasks, Boards, and Projects belong to a Group. Groups include branding configuration: `logoUrl` (optional logo image URL) and `defaultTheme` (default color theme for group users, default `'stratos'`).
- **Projects**: Can be **Public** (visible to all Group members) or **Private** (visible only to explicitly invited members).
- **Roles**:
  - `Admin`: Can manage group settings, invite users, and delete boards.
## Security & Scoping: Application-Layer Service Enforcement

To guarantee no accidental data bleed between departments (e.g., HR data leaking to Engineering), data isolation is strictly enforced at the application service layer across all database queries.

**Implementation Strategy:**
All database interactions occur strictly within service functions (`src/lib/server/services/`). Every service function accepts an `actor: Actor` parameter and explicitly chains `.where(eq(table.groupId, actor.groupId))` and `isNull(table.deletedAt)` onto all queries. Database logic is isolated on the server side and never leaks to client-side code.

**Security Guards:**
1. **Service-Layer Guard (Primary Gate):** Every query that fetches or modifies data MUST explicitly enforce the group boundary via `.where(eq(table.groupId, actor.groupId))`. We strictly avoid `select *` and explicitly define required columns in queries to minimize memory footprint.
2. **Postgres RLS (Planned DB Backstop):** Application-layer scoping is currently our active defense. Adding Postgres RLS with `set_local` policies remains a planned database-level backstop for multi-tenant deployments.
3. **Private Projects Guard:** Every query requesting board/task data must also `LEFT JOIN` against a `project_members` table. If the project is `isPrivate: true`, the query must strictly verify that the `userId` exists in the `project_members` relation.

## Security Matrix (RBAC)

| Action \ Role | `Admin` | `Member` | `Viewer` |
| :--- | :---: | :---: | :---: |
| **User Management (Admin Panel)** |
| Invite/Add Users to Group | ✅ | ❌ | ❌ |
| Remove Users from Group | ✅ | ❌ | ❌ |
| Change User Roles | ✅ | ❌ | ❌ |
| **Project & Board Management** |
| Create New Projects | ✅ | ❌ | ❌ |
| Create/Delete Boards | ✅ | ❌ | ❌ |
| Modify Board Stages (Columns) | ✅ | ❌ | ❌ |
| **Task Operations** |
| Create Tasks | ✅ | ✅ | ❌ |
| Edit Task Details / Assignees | ✅ | ✅ | ❌ |
| Move Tasks (Change Stage) | ✅ | ✅ | ❌ |
| Delete Tasks (Soft Delete) | ✅ | ✅ | ❌ |
| Comment on Tasks | ✅ | ✅ | ✅ |

## Soft Deletion & User Recovery

To preserve relational history, Stratos implements a soft-deletion mechanism using a nullable `deletedAt` timestamp across all major entities (`users`, `projects`, `boards`, `stages`, and `tasks`).

### Enforcement & Isolation Rules
1. **Single Resource Queries**: All retrieval, update, and deletion operations on projects, boards, stages, and tasks must verify `isNull(table.deletedAt)`. Access to deleted resources must fail with a 404 or a "resource not found" error.
2. **Dashboard & Metric Isolation**: All metrics, chart aggregations, and counts must ignore soft-deleted resources (e.g. stage checks in dashboards must filter out deleted stages and boards).
3. **Search Filters**: Soft-deleted projects and boards are automatically excluded from the global search results. Task searches ensure both the task and its parent board (if linked) are not soft-deleted.
4. **Session Termination**: If a user is soft-deleted, their active sessions are immediately invalidated during request hook processing. Subsequent requests are treated as unauthenticated.

### User Re-Invitation / Recovery Flow
When a user is soft-deleted, their email remains in the system to preserve audit logs and historical assignments. To re-invite a soft-deleted user to a group:
- An `Admin` can submit the email through the invitation flow.
- The service uses a database upsert (`onConflictDoUpdate` on the email field) to reset `deletedAt` to `null`, update the user's role, and re-assign the group ID, cleanly restoring the user account without violating unique key constraints.

## Helpdesk Scoped Support Board Isolation

To allow standard users (`Member` / `Viewer`) to file and track support issues without granting them visibility into other company support requests or private board tasks, we enforce a specialized Helpdesk access pattern.

### Scoping Rules
*   **The Support Project:** A private project named `"System Support & Tickets"` is created per group.
*   **Permissions Matrix:**
    *   **Admins & Project Members (Developers):** Are invited as members of the private project. They have full access to view, update, and manage the board, columns, assignments, and all support tickets.
    *   **Standard Users:** Have no access to the `"System Support & Tickets"` project.
*   **User Portal Access Guard:**
    *   To query a ticket (task) or submit a comment inside the Helpdesk Portal (`/helpdesk/tickets/[id]`), the service verifies:
        1.  The user is a Group Admin OR a member of the `"System Support & Tickets"` project.
        2.  Or, the task's JSONB `customFields` contains `reporterId` equal to the user's ID.
    *   Any other access is rejected with a `403 Access Denied` error.

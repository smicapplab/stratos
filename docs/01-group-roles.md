# 01 - Groups, Roles, & Data Isolation

## The "Not-SaaS" Tenancy Model
While structurally similar to a multi-tenant application, Stratos is strictly an **internal company tool**. 
- A "Tenant" is effectively a **Group** or **Department** (e.g., Engineering, Marketing, HR).
- There is no billing infrastructure or harsh silo wall; however, groups serve to partition data so departments don't clutter each other's boards.

## User Management
- **Users**: Individuals within the company. A user can belong to multiple Groups.
- **Groups**: Distinct workspaces. All Tasks, Boards, and Projects belong to a Group.
- **Projects**: Can be **Public** (visible to all Group members) or **Private** (visible only to explicitly invited members).
- **Roles**:
  - `Admin`: Can manage group settings, invite users, and delete boards.
## Security & Scoping: Database-Layer Enforcement (RLS)
To mathematically guarantee no accidental data bleed between departments (e.g., HR data leaking to Engineering), we enforce strict **Postgres Row-Level Security (RLS)**.

While application-layer constraints (like Repository patterns) are good practice, relying on human discipline or complex Drizzle middleware hacks to append `where(eq(table.groupId, currentGroupId))` is too risky. A single raw `db.execute()` or bypassed repository can cause a catastrophic data leak.

**Implementation Strategy:**
While RLS is the gold standard for tenant isolation, relying on `set_config('app.current_group_id', ..., true)` within a Node.js connection pool (or PgBouncer in Transaction mode) is notoriously dangerous. If a Node process crashes or an unhandled promise rejection occurs before `RESET app.current_group_id` runs, the connection returns to the pool "dirty". The next user to grab that connection might accidentally read the previous tenant's data.

**The Hybrid Approach (Defense in Depth):**
1. **Service-Layer Guard (Primary Gate):** All database interactions happen within service functions (e.g. `src/lib/server/services/`). Every service function MUST accept an `actor: Actor` as its first parameter. Any query that fetches or modifies data MUST explicitly enforce the tenant boundary by chaining `.where(eq(table.groupId, actor.groupId))` to ensure data isolation. We strictly avoid `select *` and explicitly define required columns in queries to minimize memory footprint.
2. **Postgres RLS (Failsafe):** We still apply Postgres RLS. To safely use it in a highly-concurrent Node environment with a **Transaction-Mode** database pooler (like PgBouncer), we must wrap queries in `db.transaction()` and use `set_local`. `set_local` applies the configuration parameter only to the current transaction and automatically resets when the transaction commits or rolls back, completely eliminating the "dirty connection" risk in transaction-mode poolers.
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



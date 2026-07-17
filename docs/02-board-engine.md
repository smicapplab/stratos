# 02 - Board Engine & Fractional Indexing

## Data Hierarchy
1. **Group**: The top-level workspace.
2. **Project**: A collection of Boards.
3. **Board**: A multi-view surface for managing tasks. Supports Kanban (Board), List (Table), and Calendar views.
4. **Stage**: A column on a Board.
   - Stages include an `isCompleted` boolean flag.
   - Tasks moved into a completed stage are automatically considered "Done". 
   - The UI provides quick actions in the task sidebar to instantly move a task to the first available completed stage (and back again).
5. **Task**: The core unit of work.

## Lexicographical Fractional Indexing (LexoRank)
To support drag-and-drop without cascading database updates, we use **Lexicographical String Indexing**. 

- Every task has an `orderIndex` column (`varchar`).
- When moved between `a` and `c`, the midpoint is `b`. 
- Moving a card requires updating **only 1 row in the database**.
- **Drag-and-Drop Optimistic UI:** The client calculates a temporary string midpoint locally and applies it to the Svelte `$state`. 
- **Server Authority:** The client PATCHes the order. The server calculates the authoritative midpoint and returns the final string.
- **Strict ASCII Collation Required:** The string math inside `fractional-indexing` operates purely on ASCII byte values (where `'Z'` < `'a'`). The frontend and backend **must never** sort arrays using `String.prototype.localeCompare()`, as it interleaves uppercase and lowercase, which fundamentally breaks the math when users drag items. You must sort strictly using standard JS operators (`a < b`).
- **The Rebalancing Reality (Compromise):** Strings cannot grow infinitely. Repeated insertions at the exact same index will eventually cause the `orderIndex` to exceed optimal indexing sizes. To solve this, a background CRON job runs nightly to rebalance the `orderIndex` strings for congested boards. 
- **Deadlock Mitigation:** To prevent the CRON job from blocking live users dragging cards, the rebalancing job **must** process rows in small chunks (e.g., 50 rows per transaction) using `SELECT ... FOR UPDATE SKIP LOCKED`. If a user is actively modifying a task's order, the CRON job will safely skip it and retry on the next pass.

### Column (Stage) Repositioning
The exact same LexoRank string mechanics apply to `Stages` (columns). 
- The `stages` table natively uses `orderIndex`.
- Moving a column triggers the same `generateKeyBetween` utility.
- It updates only 1 database row without cascading effects.
- It broadcasts a `stage_moved` Server-Sent Event (SSE) to update connected clients in real-time.
- On mobile devices, since horizontal scroll-snap makes cross-column drag difficult, a vertical "Reorder Columns" modal is used for touch-friendly sorting.

## Task Data Structure
- `id`: UUIDv7 (time-ordered)
- `groupId`: UUIDv7 (required)
- `boardId`: UUIDv7 (nullable FK)
- `stageId`: FK to Stage
- `parentTaskId`: UUIDv7 (nullable, self-referential)
- `title`: varchar(255)
- `description_yjs`: **bytea** (Yjs binary document for collaborative rich text)
- `priority`: varchar
- `checklists`: JSONB 
- `assigneeId`: FK to User (nullable)
- `dueDate`: timestamptz (nullable)
- `orderIndex`: varchar
- `customFields`: JSONB
- `deletedAt`: timestamptz
- `createdAt` / `updatedAt`: timestamptz
- `version`: int (for OCC on scalar fields)

## Subtask Depth Contract: Capped at 4 Levels
We cap task hierarchy at **4 levels**: `Epic -> Story -> Task -> Subtask`.

- **Database Enforcement (Crucial):** Relying on the UI to prevent deep nesting is a security vulnerability. We enforce this at the database level using a **Postgres Trigger**.
- **Performance Guardrail:** The trigger runs `BEFORE UPDATE OR INSERT`, but **ONLY** if the `parentTaskId` is changing (`IF NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id`). Running recursive CTEs on every scalar update (e.g., changing a title) would cripple write throughput.
- It traverses the `parentTaskId` chain to ensure depth never exceeds 4, and explicitly throws an error if a cyclical dependency (Task A -> Task B -> Task A) is detected.
- This allows a cheap, predictable bounded recursive CTE to retrieve the entire tree:

```sql
WITH RECURSIVE task_tree AS (
  SELECT id, title, priority, assignee_id, order_index, parent_task_id, 1 as depth
  FROM tasks
  WHERE id = $taskId AND group_id = $groupId AND deleted_at IS NULL
  
  UNION ALL
  
  SELECT t.id, t.title, t.priority, t.assignee_id, t.order_index, t.parent_task_id, tt.depth + 1
  FROM tasks t
  JOIN task_tree tt ON t.parent_task_id = tt.id
  WHERE t.group_id = $groupId AND t.deleted_at IS NULL AND tt.depth < 4
)
SELECT * FROM task_tree ORDER BY depth ASC, order_index ASC;
```

## Task Relations (Linked Issues)
To support DAGs like "Blocks", we use a strict many-to-many junction table (`task_relations`), constrained to prevent duplicate relations and self-blocking.

# 09 - Activity Feed, Editor, & Search

## 1. Audit Logs (Activity Feed)
Every major action (changing a stage, updating a custom field, reassigning a task) will write a record to an `audit_logs` table.
- **Schema**: `id`, `groupId`, `projectId` (nullable), `taskId` (nullable), `userId`, `actionType`, `oldValue`, `newValue`, `details` (JSONB), `createdAt`.
  - We use **composite B-Tree indexes** on `(groupId, projectId, taskId)` to prevent full table scans when rendering feeds.
  - The `details` JSONB column stores structured metadata (e.g., `{ invitedUserEmail: "steve@...", role: "Editor" }`) for complex structural events, while `oldValue/newValue` text columns handle simple scalar changes.
- **UI**: Displayed as a unified "Activity" feed on the task modal (task-level), and a dedicated "Project Ledger" embedded inside the Project Settings page (project-level).
- **Pagination**: Because the ledger is an infinite record, the UI employs cursor-offset pagination via a "Load More Activity" strategy (limited to 15 records per fetch) to prevent payload bloat.
- **Data Retention & Soft Deletion:** To enforce strict compliance and a permanent ledger, **we do not hard-delete records** (like projects or tasks). Instead, we use a `deletedAt` soft-delete pattern. As a result, `audit_logs` are NEVER orphaned by cascading deletes. The audit ledger is an **infinite, immutable record** — the previous 90-day purge cron job rule has been explicitly scrapped.

## 2. Rich Text Editor (@ Mentions & CRDTs)
- **Library**: We will use **Tiptap** (a headless prose-mirror wrapper) paired with **Yjs** for real-time collaboration.
- **Why**: It gives us complete UI control over the editor and true multiplayer conflict resolution. When a user types `@`, we will query our locally-cached `users` array (from `localStorage`) to render the autocomplete dropdown instantly.

## 3. Full-Text Search
- Instead of using a heavy, expensive external service like Elasticsearch or Algolia, we will leverage **PostgreSQL Native Full-Text Search**.
- We will add a `tsvector` column to the `tasks` table that indexes the `title` and `description`.
- **Handling Yjs Binary Data (The Plaintext Extraction Problem):** Since the `description` is now stored as a Yjs binary (`bytea`) for CRDT collaboration, we cannot index it directly in Postgres. 
- **The Solution:** The application layer (Node.js) is responsible for extracting plaintext. When the Yjs document state is synced to the server, a headless Yjs instance applies the update, extracts the plain text from the document, and writes it to a dedicated `searchText` `text` column in Postgres. The Postgres `tsvector` index is generated strictly from this `searchText` column.
- **CRITICAL:** We explicitly create a **GIN (Generalized Inverted Index)** on this `tsvector` column. Without a GIN index, full-text search will trigger a catastrophic sequential table scan.

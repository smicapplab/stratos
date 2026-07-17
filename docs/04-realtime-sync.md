# 04 - Data Sync & Concurrency (SSE + OCC + CRDTs)

## The Architecture: REST + Server-Sent Events (SSE)
To guarantee **data stability, collaborative speed, and minimal database load**, we use a hybrid architecture: **REST Mutations + SSE (Delta-Patching) + Optimistic UI** for standard fields, and **Yjs/CRDTs** for rich text.

1. **Mutations via SvelteKit Endpoints:** All scalar mutations go through standard SvelteKit REST endpoints or actions, gated by Postgres ACID transactions.
2. **Client-Side Svelte 5 Store & Delta Merging:** SvelteKit Server Loaders **seed** a global client-side `$state` store. 
    - We explicitly **DO NOT** use SvelteKit's `invalidateAll()` for real-time synchronization to avoid "thundering herds".
    - Instead, we apply **Delta-Patching**. A standard SvelteKit `+server.ts` route holds an open `text/event-stream` (SSE) response. As mutations occur, delta payloads are streamed to the client and merged directly into the `$state` store.
3. **Data Refreshing (Redis Pub/Sub):** 
    - Server A handles a REST mutation, commits to Postgres, and publishes an event to Redis.
    - All Servers subscribe to Redis and push the event down their active SSE streams.
    - **DB Pool Safety:** SSE connections hold standard HTTP requests open, but they **must never** hold a checkout from the Postgres connection pool while idling.

## Dual-Layer Concurrency (Write OCC + Read Sequence IDs)

1. **Write Protection (Task OCC):** Every editable scalar entity has a `version` integer column. The client sends a PATCH with `version`. The server checks `payload.version === db.version`. If yes, update and increment. If no, return a `409 Conflict`, triggering a client rollback of the optimistic UI.
2. **Read Synchronization (Board Sequence IDs):** To guarantee clients process SSE deltas in the correct order, every board has a monotonic `sequence_id`. Every mutation on a board increments this ID via Postgres and attaches it to the SSE delta.

## The "Missed Event" & Flaky WiFi Problem (Thundering Herd Mitigation)
SSE is a unidirectional stream. If a client disconnects, it will sit with stale data.

- **The Catch-Up Endpoint:** When a client receives an SSE delta, it compares the payload's `board.sequence_id`. 
  - If `payload.sequence_id === local.sequence_id + 1`, apply the patch and increment local sequence.
  - If `payload.sequence_id > local.sequence_id + 1`, the client **missed an event**. 
  - Instead of invalidating the entire board, the client calls `GET /api/boards/[id]/sync?since={local.sequence_id}`. The server retrieves the missed delta payloads from a dedicated Postgres `board_events` log table and streams them back. The client applies them sequentially.
  - If the `since` sequence ID is too old (purged from the log), *only then* does the client fallback to a full `invalidate('app:board')`.
  - If `payload.sequence_id <= local.sequence_id`, it's a delayed duplicate; safely ignore.

## Mobile Background Queueing (DOM Memory Leak Mitigation)
On mobile devices, when the Task Detail overlay is active, the underlying Kanban board is hidden via CSS (`display: none`) to preserve its `$state` context without re-rendering.
- **The Issue:** Svelte 5 continues to process `$derived` reactivity for hidden DOM nodes. Applying 50 SSE updates to a hidden 1000-task board will drain battery and cause foreground jank.
- **The Solution:** The client sync engine must be visibility-aware. When the board is hidden, incoming SSE deltas are queued in a lightweight JavaScript array. The reactivity bindings to the Svelte `$state` store are paused. When the board becomes visible again (the user hits "Back"), the queue is rapidly flushed into the store in a single batch update.

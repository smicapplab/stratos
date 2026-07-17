# 00 - Architecture & Data Flow

## Overview
Stratos is an internal Jira/ClickUp replacement optimized for high performance, strict typing, and collaborative real-time sync. It uses a hybrid sync architecture: standard OCC for simple properties and CRDTs for collaborative rich text.

## The Core Stack
- **Framework**: Pure SvelteKit (Standard Node adapter for persistent connections).
- **Frontend State**: Svelte 5 `$state` and `$derived` runes with true real-time syncing.
- **Database**: Postgres (managed via Drizzle ORM).
- **Cache / PubSub**: Redis for fast session lookup, rate limiting, and cross-instance Server-Sent Events (SSE) broadcasting.
- **Authentication**: Lucia Auth with Drizzle adapter.
- **Rich Text Sync**: Yjs + Tiptap for collaborative description editing.

## Data Flow & Operations
1. **Reads (Loaders as Seed Data)**: Svelte components fetch initial data via SvelteKit Server Loaders (`+page.server.ts`). This data securely fetched from Postgres is used to **seed** a global client-side Svelte 5 `$state` store per board.
2. **Standard Writes (Mutations via OCC)**: Mutations for scalar fields (status, assignee, due date) are handled via native `fetch` to `+server.ts` endpoints using Optimistic Concurrency Control (OCC).
3. **Rich Text Writes (CRDTs)**: The task description uses Yjs to sync document states incrementally, ensuring true multiplayer editing without "last-write-wins" data loss.
4. **Optimistic UI & Real-Time Patching**: We use optimistic updates on our local Svelte 5 `$state` store for scalar mutations to provide 0ms latency. Real-time updates from other users are received as targeted delta patches over **Server-Sent Events (SSE)**.
5. **Stateless Server Boundary**: SvelteKit remains stateless. By utilizing standard HTTP SSE streams backed by Redis Pub/Sub, we scale horizontally and mitigate Postgres connection pool exhaustion (connections are only held during HTTP request lifecycles, not for open SSE streams).

## Design Philosophy
- **Zero Type Escapes**: `any` and `unknown` are strictly forbidden.
- **Server/Client Isolation**: Database logic and secrets never leak into the client bundle.
- **Aesthetic Excellence**: UI is built with Tailwind CSS, utilizing modern layouts to achieve a premium, modern UX.
- **Pragmatic Sync**: We use CRDTs *only* where necessary (Rich Text). For Kanban entity resolution (e.g., dragging a card, changing a status), we rely on REST + OCC. This isolates the complexity of CRDTs.

## Architectural Compromises & Limitations
1. **Local-First vs Offline-First:** This architecture provides **Local-First Latency (0ms Optimistic UI)** but is **NOT Offline-First**. Because we rely on the server as the ultimate authority for LexoRank strings, sequence IDs, and Postgres ACID transactions, the application requires an active internet connection.
2. **SSE Connection & Proxy Limits:** Browsers limit HTTP/1.1 connections to a single domain. **Compromise/Solution**: We mandate HTTP/2 in production to multiplex all SSE streams. Additionally, reverse proxies (Nginx, Cloudflare) must be explicitly configured to disable buffering (`X-Accel-Buffering: no`) to prevent SSE deltas from being artificially delayed.
3. **CRDT Storage Overhead:** Storing Yjs update histories in Postgres (`bytea`) will consume more space than flat JSONB. We accept this storage cost to guarantee users never lose long-form text edits during collaborative sessions.

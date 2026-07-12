# Stratos

Stratos is a persistent Node-based, multi-group productivity platform designed for internal company operations. It scales to the requirements of enterprise-grade task and project management, featuring high-performance Kanban boards, real-time synchronization, and strict role-based access control.

## Architecture & Technology Stack

Stratos operates as a unified full-stack application leveraging the following core technologies:

*   **Framework:** SvelteKit (Frontend and Backend execution)
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Authentication:** Lucia Auth (Session-based, securely mapped to internal roles)
*   **Real-time Engine:** Server-Sent Events (SSE) combined with Optimistic UI updates
*   **Ordering System:** Fractional Indexing (LexoRank) for deterministic, conflict-free manual sorting of tasks and stages

## Core Features

*   **Multi-Group Isolation:** Strict data partitioning where operations are scoped to a specific group/tenant ID at the database transaction level.
*   **High-Performance Board Engine:** Drag-and-drop mechanics operating on a fractional index system, ensuring real-time multi-user concurrency without cascading database writes.
*   **Strict Security & Guard Rails:** Zero server-side code leakage to the client, utilizing explicit route guards and secure environment variable parsing.
*   **Mobile-First Design:** Fully responsive interfaces ensuring 100% feature parity across desktop and mobile form factors.

## Development Setup

The application is designed to be runtime-agnostic and relies on standard Node.js primitives.

1. Ensure you have Node.js and a running PostgreSQL instance.
2. Install dependencies via your package manager.
3. Configure your environment variables in `.env` (refer to `$env/dynamic/private` schemas).
4. Run the development server:

```bash
npm run dev
```

## Documentation

This repository enforces strict documentation standards. All architectural decisions, data models, and feature specifications are maintained exclusively inside the `docs/` directory.

To understand the core mechanics of the system, start with the AI Entrypoint:
*   [docs/README.md](docs/README.md): Index of all active modules and specifications.

## Continuous Integration & Verification

All code must pass the automated verification suite before being merged. The following scripts are executed to ensure application integrity:

*   `scripts/build-review.sh`: Validates production builds.
*   `scripts/type-check.sh`: Enforces zero-tolerance for `any` or `unknown` typings.
*   `scripts/db-verify.sh`: Validates schema integrity and checks for unsafe operations.
*   `scripts/security-audit.sh`: Scans for secrets and unscoped database queries.
*   `scripts/bundle-budget.js`: Verifies container memory usage limits.

## Contribution Guidelines

*   **Strict SvelteKit Boundaries:** All database access and secret management must reside strictly in `+page.server.ts`, `+server.ts`, or `src/lib/server/`.
*   **No Markdown Proliferation:** All documentation must reside within the `docs/` directory. Standalone markdown files outside this directory are prohibited.
*   **Error Handling:** Errors must be explicitly handled and propagated to the client with valid HTTP status codes and typed error boundaries. Never fail silently.

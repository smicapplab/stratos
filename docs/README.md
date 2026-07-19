# Stratos: Documentation & Specs Index

This directory serves as the living documentation engine for the AI. It acts as the ultimate source of truth for architectural decisions, data models, and feature specifications.

## Active Specifications

- [00-architecture.md](./00-architecture.md): Global architecture, state management, and data flow.
- [01-group-roles.md](./01-group-roles.md): Group (tenant) isolation, user management, and roles for an internal organization.
- [02-board-engine.md](./02-board-engine.md): Kanban states, stages, & fractional indexing mechanics.
- [03-custom-fields.md](./03-custom-fields.md): Dynamic fields engine (JSONB indexing & queries).
- [04-realtime-sync.md](./04-realtime-sync.md): Data sync strategy — REST Mutations, Optimistic Concurrency Control (OCC), and WebSockets for real-time invalidation.
- [05-dashboards.md](./05-dashboards.md): Data aggregation, charts, and group-level reporting.
- [06-notifications.md](./06-notifications.md): In-app alerts and AWS SES email delivery mechanics.
- [07-auth-identity.md](./07-auth-identity.md): Lucia Auth, session-based security, and hooks.server.ts guard strategy.
- [08-file-attachments.md](./08-file-attachments.md): Agnostic S3/Local storage strategy.
- [09-activity-search.md](./09-activity-search.md): Audit logs, Tiptap rich text, and Postgres native search.
- [10-backend-caching.md](./10-backend-caching.md): Distributed caching (Redis) for auth guards and heavy dashboard queries.
- [11-testing-strategy.md](./11-testing-strategy.md): TDD enforcement via Vitest for backend services, with targeted Playwright E2E for core UI mechanics (DND & Sync).
- [12-ui-ux-vision.md](./12-ui-ux-vision.md): **Master UI/UX vision** — full spec for achieving premium design, navigation, all views (Kanban/Table/Calendar), Task Sidebar, Command Palette, keyboard shortcuts, micro-interactions, empty states, and mobile.
- [13-integrations-webhooks.md](./13-integrations-webhooks.md): API Tokens, programmatic access, and outbound webhooks architecture.
- [14-disaster-recovery.md](./14-disaster-recovery.md): Operational requirements for PITR database backups and storage redundancy.
- [15-deploy-migrations.md](./15-deploy-migrations.md): Zero-downtime deployment rules and decoupled database migration execution.
- [16-project-management.md](./16-project-management.md): Project isolation, access control, and membership rules for restricted projects.
- [17-programmatic-integration.md](./17-programmatic-integration.md): Integration Protocol and developer guidelines for external AI agents or programmatic clients.

## Secrets & Environment Configuration

*   **Secrets Isolation:** Dynamic parameters, API keys (e.g., `RESEND_API_KEY`), and database connection strings (`DATABASE_URL`) are strictly kept out of git-tracked code and documentation files.
*   **Environment Files:** All environment-specific values reside in the gitignored `.env` file (configured using SvelteKit's `$env/dynamic/private` or `$env/static/private` modules). Refer to `.env.sample` for local setup.
*   **Private Directory:** The `private/` folder in the workspace root is reserved for any local-only sensitive configurations, keys, or scripts. It is locked by a native `.gitignore` to prevent any contents from being tracked or pushed to GitHub.

> **AI Instruction**: Always update the relevant specification file synchronously when writing or modifying code in the application layer.


# 15 - Deployments & Migrations

## Concept
Stratos requires a rock-solid, zero-downtime deployment strategy. Because `AGENTS.md` explicitly forbids running database migrations inside the user-facing Node server startup loop, we must decouple schema changes from application boot.

## 1. The Danger of Startup Migrations
If you run `drizzle-kit migrate` inside your main SvelteKit/Node startup file:
1. **Race Conditions:** In a cluster (e.g., 4 instances spinning up simultaneously), they will all attempt to run the migration at the same time, potentially deadlocking Postgres.
2. **Crash Loops:** If a migration fails, the app server crashes and refuses to start, causing total downtime.
3. **Slow Boot:** Complex migrations block the server from accepting HTTP requests, extending deployment downtime.

## 2. The Execution Strategy
Migrations must be treated as a distinct pre-deployment step.

- **CI/CD Pipeline:** The deployment pipeline (e.g., GitHub Actions, GitLab CI) runs a standalone script (`npm run db:migrate`) that executes against the production database *before* the new Node containers are deployed.
- **Docker Init Containers:** If using Kubernetes or Docker Compose, migrations run in an ephemeral `init-container` or a separate one-off task that exits upon completion. The main application containers only boot after this task succeeds.

## 3. Zero-Downtime Rule (Expand and Contract)
Because the old version of the app is still running while the database migrates, **migrations must be backwards compatible**.

- **Do Not Rename/Drop Columns Immediately:** If you need to rename a column, you must:
  1. **Deploy 1:** Add the new column. Update the code to write to *both* columns, but read from the old one.
  2. **Deploy 2:** Update the code to read from the *new* column.
  3. **Deploy 3:** Drop the old column.
- **Concurrent Indexing:** Standard `CREATE INDEX` locks the table against writes. When adding an index to a large table (like `tasks` or `audit_logs`), you MUST use `CREATE INDEX CONCURRENTLY`. This prevents production write-outages during deployment. Drizzle supports this natively but it requires disabling Drizzle's wrapping transactions for that specific migration.
- Breaking these rules will cause `500 Internal Server Error` spikes or database lockups during deployments.

# 11 - Testing Strategy (TDD)

## Pragmatic Testing Philosophy
While we heavily de-prioritize Playwright E2E testing for basic CRUD pages to maintain velocity, **E2E UI Testing is Mandatory for Core Mechanics**. SvelteKit blurs the frontend/backend boundary. The most complex logic (Optimistic UI rollbacks, drag-and-drop state math, SSE reconnection jitter) lives in the UI layer. Manual testing is insufficient for these critical paths. We mandate Playwright test coverage specifically for:
1. Kanban Drag-and-Drop (cross-column and intra-column).
2. Optimistic UI Rollbacks (simulating 409 Conflicts).
3. SSE (Server-Sent Events) reconnection and delta-patching.

## Backend Unit Testing (TDD is Mandatory)
Test-Driven Development (TDD) is strictly enforced for all backend business logic and security access guards. 

- **Framework**: Vitest (runs natively and insanely fast within the SvelteKit/Vite ecosystem).
- **Target Areas**: 
  - `src/lib/server/services/*`: All core logic must have corresponding `.test.ts` files.
  - **Access Guards**: Tests must explicitly verify that a user from Group A cannot read/mutate data belonging to Group B.
  - **Board Mechanics**: The fractional index generation and rebalancing logic must be heavily unit tested to prevent board corruption.
- **The "No Mocking" Rule for DBs**: We explicitly **DO NOT mock** the Drizzle database layer (`src/lib/server/db`) during backend service tests. Mocking an ORM is an anti-pattern that results in tests that only verify the mock, completely missing SQL syntax errors, failed RLS constraints, or database trigger failures. Tests must run against a dedicated, isolated Postgres test database (e.g., spun up via Docker/Testcontainers) to guarantee integration safety.

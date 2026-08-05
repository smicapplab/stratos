# 11 - Testing Strategy (TDD)

## Pragmatic Testing Philosophy
We prioritize fast, isolated unit testing for backend service logic, access guards, and security validation to maintain velocity. Playwright E2E UI testing for complex interactive flows (Kanban drag-and-drop, optimistic UI rollbacks, and SSE reconnection) is planned as the application transitions to production freeze.

## Backend Unit Testing (TDD)
Test-Driven Development (TDD) is enforced for all backend business logic and security access guards.

- **Framework**: Vitest (runs natively and fast within the Vite/SvelteKit ecosystem).
- **Target Areas**:
  - `src/lib/server/services/*`: Core business services (users, boards, tasks, notifications, apiTokens, helpdesk, fileAttachments) are covered with unit tests.
  - **Access Guards**: Tests verify that role restrictions (Admin vs Member vs Viewer) and group scoping rules are strictly enforced.
  - **Isolation Strategy**: Vitest suites utilize lightweight module mocks (`vi.mock`) to isolate business logic, while integration testing against real Postgres containers is conducted during pre-commit quality audits (`scripts/security-audit.sh` and `scripts/db-verify.sh`).


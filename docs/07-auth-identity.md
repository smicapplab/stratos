# 07 - Authentication & Identity

## Strategy: Lucia Auth (Session-Based)
We use **Lucia Auth** with a Drizzle adapter backed by our Postgres database.

- **Why Lucia?** Avoids vendor lock-in (no Supabase Auth, no AWS Cognito). All auth logic lives inside our SvelteKit app, is fully typesafe, and is deletable without migrating a third-party service.
- **Session vs JWT:** Lucia uses **Session-based authentication**. On login, a cryptographically random Session ID is created, stored in an `HTTP-only` cookie, and saved to a `sessions` table in Postgres. This allows instant session revocation by deleting the row — impossible with stateless JWTs.

## SvelteKit Hooks Guard (`hooks.server.ts`)

SvelteKit's `handle` hook fires on **every** incoming request that reaches the Node server. Executing a standard Postgres query on every single request would:

1. Exhaust the database connection pool under any meaningful load.
2. Add 50–200ms of DB latency before the route handler even runs.

*(Note: Static assets and images should ideally **never** reach the Node server. They must be intercepted and served by a CDN or reverse-proxy like Vercel Edge or Nginx. However, for any traffic that does hit Node, we must be defensive.)*

To mitigate this, we securely cache active sessions in Redis (see `10-backend-caching.md`) with a 5-minute TTL. This cuts our auth latency to near-zero while preserving our ability to instantly revoke compromised sessions cluster-wide.

### The Pathname Guard (Critical)

The session validation query must be **gated behind a pathname check**. It only runs if the request is for a protected route:

```typescript
// hooks.server.ts — correct pattern
export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // Skip DB entirely for public routes and static assets (note: route groups like (app) are stripped at runtime)
  const isProtected =
    path.startsWith('/admin') ||
    path.startsWith('/boards') ||
    path.startsWith('/settings') ||
    path.startsWith('/api/') ||
    path.startsWith('/calendar') ||
    path.startsWith('/my-tasks') ||
    path.startsWith('/inbox') ||
    path.startsWith('/dashboard');

  if (!isProtected) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const sessionId = event.cookies.get(lucia.sessionCookieName);
  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await lucia.validateSession(sessionId);
  // ... set session cookie refresh if needed ...
  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};
```

> **Note on current implementation:** The current `hooks.server.ts` already short-circuits when no session cookie exists (`if (!sessionId) return resolve(event)`), which prevents unauthenticated traffic from hitting the DB. The pathname guard above should be added as an additional optimization layer before the cookie check, to also skip the cookie read for truly public paths.

## Route-Level Auth Guards

Individual `+page.server.ts` loaders must **not** rely solely on `hooks.server.ts` for auth. Each protected loader should verify `locals.user` exists and redirect if not:

```typescript
// +page.server.ts — guard pattern
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/login');
  // ... rest of loader
};
```

## Password Hashing

Passwords are hashed using `oslo/password` (Lucia's recommended companion) with the Argon2id algorithm. Raw passwords are never stored or logged.

## Soft-Deleted Users and Session Revocation

To ensure immediate revocation of active sessions when a user is soft-deleted, we enforce the following system design:

1. **Lucia Database Attributes**: The user's `deletedAt` timestamp is exposed in `DatabaseUserAttributes` and mapped in `getUserAttributes` so that `deletedAt` is available directly on the `user` object returned by session validation.
2. **Session Validation Check**: SvelteKit's `hooks.server.ts` intercepts requests, and immediately after calling `lucia.validateSession(sessionId)`, verifies if `user && user.deletedAt` is true. If so:
   - The active session is permanently invalidated using `lucia.invalidateSession(sessionId)`.
   - A blank session cookie is sent to the client to overwrite the session cookie.
   - `event.locals.user` and `event.locals.session` are cleared (set to `null`).
   - The request resolves early to prevent access to any protected downstream handlers.
3. **Login Protection**: The authentication lookup query inside the login route (`+page.server.ts`) includes a `isNull(users.deletedAt)` check to prevent soft-deleted users from initiating new sessions.

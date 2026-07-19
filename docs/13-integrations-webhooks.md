# 13 - Integrations & Webhooks

## Concept
An internal productivity platform must interact seamlessly with the company's existing toolchain (e.g., GitHub, GitLab, Slack, Sentry). To support this, Stratos implements a two-way integration architecture: Inbound API Tokens and Outbound Webhooks.

## 1. Inbound API Tokens
External services need a way to authenticate and trigger actions within Stratos.

- **Token Creators:** Only **Admins** and **Managers** can generate and manage API tokens. Members and Viewers have no access to the token management UI.
- **Token Scope:** Every token is linked to the creating user's `userId` and their `groupId` (tenant). Tokens are **not** scoped to individual projects — they inherit the full group context and act with the permissions of the owner user.
  - Admins: can create, view, and revoke all tokens belonging to the group.
  - Managers: can create, view, and revoke only their own tokens.
- **Storage:** The raw token is shown to the user exactly once on creation. Only the SHA-256 hash (`token_hash`) is persisted in the `api_tokens` table. The plaintext token is never stored.
- **Validation Cache:** Valid token hashes are cached in Redis with a 5-minute TTL to avoid hitting the database on every request. On explicit revocation, the cache key for that token is immediately deleted — do not rely solely on TTL expiry for revocation to take effect.
- **Usage:** External scripts include the token in every request: `Authorization: Bearer <stratos_tok_...>`. See `17-programmatic-integration.md` for the full client contract.
- **Example:** A GitHub Action runs on PR merge, calling the Stratos API to move the associated task from "In Progress" to "Done".

## 2. Outbound Webhooks
Stratos needs to notify external systems when data changes, without requiring those systems to continuously poll the Stratos API.

- **Registration:** Group Admins can register webhook endpoints (URLs) in the UI and select specific events to listen for (e.g., `task.created`, `task.moved`, `comment.added`).
- **SSRF Protection (CRITICAL):** Letting users register arbitrary URLs is a massive Server-Side Request Forgery (SSRF) vulnerability. The backend must strictly validate the URL before saving and during execution, explicitly blocking requests to private IP ranges (e.g., `127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`) to prevent malicious actors from accessing internal cloud metadata or internal Redis instances.
- **Execution:** When a mutation occurs, the Node server formats an event payload. To prevent blocking the main thread, the webhook delivery is pushed to a background worker queue (e.g., BullMQ).
- **Actor Metadata:** All outbound webhook payloads include `actorType: "bot"` and the `actorId` of the token owner when an API token triggered the action. Receiving clients must drop events where `actorType === "bot"` and `actorId` matches their own token user to prevent infinite feedback loops.
- **Security:** Outbound webhook payloads include a cryptographic signature (`x-stratos-signature`) generated using a shared secret so the receiving server can verify the webhook originated from Stratos.
- **Retry Logic:** The background worker will attempt delivery with exponential backoff if the external service is down or returns a 5xx error.

## 3. API Rate Limiting (Abuse Prevention)
Because Stratos is deployed on persistent Node containers without an implicit Serverless API Gateway, it is highly vulnerable to API abuse from bad Inbound Tokens.

- **The Strategy:** A two-tier Token Bucket rate limiting middleware is applied to all `/api/v1/*` routes, backed by Redis.
- **Tier 1 — Per-Token:** 60 requests per minute per individual token.
- **Tier 2 — Per-Group (Tenant):** 300 requests per minute across all tokens belonging to the same group.
- Exceeding either limit returns `429 Too Many Requests`, protecting the database connection pool from being exhausted by runaway integrations.

> **Full Client Contract:** For endpoint reference, error codes, payload schemas, and rules of engagement, see `17-programmatic-integration.md`.

# 13 - Integrations & Webhooks

## Concept
An internal productivity platform must interact seamlessly with the company's existing toolchain (e.g., GitHub, GitLab, Slack, Sentry). To support this, Stratos implements a two-way integration architecture: Inbound API Tokens and Outbound Webhooks.

## 1. Inbound API Tokens
External services need a way to authenticate and trigger actions within Stratos.

- **Tokens:** Admins can generate long-lived API tokens scoped to specific Projects or Groups.
- **Storage:** Tokens are hashed (e.g., SHA-256) before being stored in an `api_tokens` table.
- **Usage:** External scripts send HTTP `POST` requests to a stable endpoint, e.g., `/api/v1/tasks`, with the token in the `Authorization: Bearer <token>` header.
- **Example:** A GitHub Action runs on PR merge, calling the Stratos API to move the associated task ID from "In Progress" to "Done".

## 2. Outbound Webhooks
Stratos needs to notify external systems when data changes, without requiring those systems to continuously poll the Stratos API.

- **Registration:** Group Admins can register webhook endpoints (URLs) in the UI and select specific events to listen for (e.g., `task.created`, `task.moved`, `comment.added`).
- **SSRF Protection (CRITICAL):** Letting users register arbitrary URLs is a massive Server-Side Request Forgery (SSRF) vulnerability. The backend must strictly validate the URL before saving and during execution, explicitly blocking requests to private IP ranges (e.g., `127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`) to prevent malicious actors from accessing internal cloud metadata or internal Redis instances.
- **Execution:** When a mutation occurs, the Node server formats an event payload. To prevent blocking the main thread, the webhook delivery is pushed to a background worker queue (e.g., BullMQ).
- **Security:** Outbound webhook payloads include a cryptographic signature (`x-stratos-signature`) generated using a shared secret so the receiving server can verify the webhook originated from Stratos.
- **Retry Logic:** The background worker will attempt delivery with exponential backoff if the external service is down or returns a 5xx error.

## 3. API Rate Limiting (Abuse Prevention)
Because Stratos is deployed on persistent Node containers without an implicit Serverless API Gateway, it is highly vulnerable to API abuse from bad Inbound Tokens.

- **The Strategy:** A Token Bucket rate limiting middleware must be applied to all `/api/v1/*` routes.
- **The Store:** The rate limiter uses Redis (see `10-backend-caching.md`) to track request counts per API Token efficiently across the cluster.
- **Thresholds:** A conservative limit (e.g., 60 requests per minute per token) is enforced. Exceeding this limit returns a `429 Too Many Requests` status code, protecting the database connection pool from being exhausted by infinite loops in external integrations.

# 17 - Programmatic Client & AI Integration Protocol

This document serves as the interface specification and operational contract for any **External AI Agent or Programmatic Client** interacting with Stratos.

---

## 1. Authentication
* **Method:** HTTP Bearer Token.
* **Header:** `Authorization: Bearer <stratos_tok_...>`
* **Endpoint Base:** `/api/v1`

### Token Format & Generation
Tokens are generated server-side using 32 bytes of cryptographically secure random data, base64url-encoded, and prefixed with `stratos_tok_` for identification. Example:
```
stratos_tok_4Zx9mQk2Np7vLrEwYbHdCfJsAuT3gOiX
```
The plaintext token is presented to the user **exactly once** at creation time and is never stored — only its SHA-256 hash is persisted. If a token is lost, it must be revoked and a new one generated.

Tokens do not expire automatically. They remain valid until explicitly revoked by an Admin (all tokens) or the creating Manager (own tokens). Revocation takes effect immediately — the Redis validation cache entry is deleted synchronously on revoke, not after TTL expiry.

---

## 2. API Constraints & Client Limits

### Bulk API Payload Cap
* **Maximum Batch Size:** `POST /api/v1/tasks/bulk` is capped at a maximum of **50 tasks** (1 Epic + 49 Stories) per single request payload. Sending larger batches will result in a `413 Payload Too Large` error.

### Rate Limits & Parallelization
* **Per-Token Limit:** 60 requests per minute.
* **Per-Group (Tenant) Limit:** 300 requests per minute across all tokens in the group.
* **No Parallel Pushes:** Clients **must not** run parallel HTTP requests (e.g., `Promise.all`). Execute operations sequentially (in series) to prevent connection pool exhaustion and transaction lock timeouts.

---

## 3. Rules of Engagement (Rules for the Client/Agent)

### Rule 1: Prevent Webhook Feedback Loops (CRITICAL)
Outbound webhooks sent by Stratos include actor metadata (`actorType: "bot"` and the associated `actorId`).
* **The Rule:** The client **must** check the actor metadata in every webhook payload. If the event was triggered by `actorType === "bot"` or if the `actorId` matches the client's own token user, the client **must drop the event immediately** and take no action. Bypassing this will trigger an infinite loop.

### Rule 2: Enforce Idempotency & Prevent Duplication
Whenever pushing tasks, the client must calculate a unique signature (e.g., file path + spec hash) and supply it as `sourceId` in the payload. Stratos will reject duplicate imports with a `409 Conflict`.

### Rule 3: Input Sanitization
* **Descriptions:** When passing HTML to task descriptions, the client must ensure the HTML is clean and contains no scripting or iframe elements. Stratos enforces server-side sanitization, but passing un-sanitized tags can result in parsing errors.
* **Tag Names:** Tag names are upserted case-insensitively. Always use `POST /api/v1/projects/[id]/tags` to resolve or create tags rather than trying to match IDs locally.

### Rule 4: Epic-to-Story Hierarchy Sequence
If pushing incrementally instead of using the bulk endpoint:
1. Post the Epic card first: `POST /api/v1/tasks` (with no `parentTaskId`).
2. Capture the returned task `id` from the JSON response.
3. Post the child story cards sequentially, setting the `parentTaskId` parameter to the Epic's `id`.

### Rule 5: Delta-Sync using Server Time
When polling for updates or deletion events:
* **Header:** `GET /api/v1/tasks` and `GET /api/v1/tasks/[id]` both return a `X-Sync-Timestamp` response header.
* **Format:** ISO-8601 UTC string (e.g., `2026-07-19T07:22:00.000Z`).
* **Usage:** Capture `X-Sync-Timestamp` from each response and pass it as the `updatedSince` query parameter on the next poll:
  ```
  GET /api/v1/tasks?updatedSince=2026-07-19T07:22:00.000Z
  ```
* Using the server-generated timestamp prevents client clock drift from causing missed or duplicate events. Never substitute a locally generated `Date.now()` value here.

---

## 4. Reference Payload Examples

### A. Bulk Import Epic & Stories
`POST /api/v1/tasks/bulk`
```json
{
  "epic": {
    "title": "Epic: Implement Database Security Hardening",
    "description": "Epic tracking all stories for DB access controls.",
    "stageId": "backlog-stage-uuid"
  },
  "stories": [
    { "title": "Story: Add api_tokens Table", "description": "Write migration." },
    { "title": "Story: Implement Bearer Hook", "description": "Configure request hook." }
  ],
  "sourceId": "client-plan-2026-07-19-1500"
}
```

### B. Add Comment/Progress Update
`POST /api/v1/tasks/[id]/comments`
```json
{
  "content": "### Execution Run Log\n- Build checks: Passed\n- Migration: Pushed successfully"
}
```

---

## 5. HTTP Status Code Reference

All error responses return a JSON body: `{ "error": "<message>" }`.

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200 OK` | Success | GET / PATCH returned data |
| `201 Created` | Resource created | POST task, comment, tag |
| `204 No Content` | Success, no body | DELETE task/tag |
| `304 Not Modified` | No changes since `If-Modified-Since` | GET /api/v1/tasks with unchanged data |
| `400 Bad Request` | Invalid payload | Missing required field, invalid UUID, malformed JSON |
| `401 Unauthorized` | Token missing or invalid | No `Authorization` header, unrecognised or revoked token |
| `403 Forbidden` | Insufficient role | Viewer attempting write, Manager attempting Admin-only action |
| `404 Not Found` | Resource does not exist | Task/stage/project not found within the token's group |
| `409 Conflict` | Duplicate idempotency key | `sourceId` already imported in this group |
| `413 Payload Too Large` | Batch exceeds limit | Bulk import payload exceeds 50 tasks |
| `422 Unprocessable Entity` | Failed validation | Custom field value fails board schema validation |
| `429 Too Many Requests` | Rate limit exceeded | Per-token (60/min) or per-group (300/min) limit hit |
| `500 Internal Server Error` | Unexpected server failure | Database error, unhandled exception |

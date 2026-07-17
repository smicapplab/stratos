# 06 - Notifications Engine

## Overview
A critical component of any PM tool is keeping users informed of changes without overwhelming them. The notification engine handles alerting users about relevant activity.

### The "Read" Flow
When a user opens the Notification dropdown, we mark alerts as `read` via an optimistic UI `PATCH` request. The bell icon loses its badge immediately.

## Inbound Email (Reply-to-Comment)
To be a true Asana replacement, users must be able to interact with tasks via email.

- **The Flow:** When an email notification is sent (e.g., "Ana assigned you a task"), the `Reply-To` header is set to a unique address mapping to that task (e.g., `task-123+xyz@stratos.internal`).
- **The Inbound Webhook:** When a user replies to the email, the email provider (e.g., SendGrid Inbound Parse or AWS SES Inbound) intercepts the email and `POST`s the parsed JSON payload to a public SvelteKit `+server.ts` webhook.
- **The Execution:** The webhook verifies the payload signature, parses the raw text from the email body, and appends it as a new comment on the task under the user's name.

## Channels
1. **In-App Notifications**:
   - A bell icon in the **SvelteKit UI** showing unread alerts.
   - Stored in a `notifications` database table.
   - Delivery via WebSockets as described in `04-realtime-sync.md`.
2. **Email Notifications (Adapter Pattern)**:
   - We utilize an **Email Adapter Interface**. The system never strictly depends on AWS.
   - **Local / Self-Hosted Fallback:** If cloud credentials are not present, emails are sent via standard **SMTP** (e.g., a simple Gmail SMTP relay or a local Mailhog instance for dev).
   - **Production (Cloud):** If AWS credentials are present, the adapter switches to AWS Simple Email Service (SES) for bulk/reliable delivery.

## Triggers
Notifications will be generated for events such as:
- **Assignment**: User is assigned to a Task.
- **Mentions**: User is `@mentioned` in a task description or comment.
- **Updates**: A task the user is assigned to (or watching) changes stage (e.g., moved to "Done").
- **Reminders**: A task due date is approaching (requires a cron/scheduled job worker).

## Database Schema (Draft)
- `id`: UUID
- `userId`: UUID (The recipient)
- `actorId`: UUID (The person who triggered it, nullable)
- `type`: Enum (`assigned`, `mentioned`, `status_changed`, `reminder`)
- `taskId`: UUID (Reference to the relevant task)
- `readAt`: Timestamp (Null if unread)
- `createdAt`: Timestamp

# 08 - File Attachments & Storage

## Concept
Users need to upload screenshots and PDFs to tasks. In production, this will utilize AWS S3 (or an S3-compatible service like Cloudflare R2 or Supabase Storage). 

## Storage Adapter Pattern
To remain environment-agnostic, we implement a **Storage Adapter Interface**. The application does not care where the file lives, it only calls `storage.upload()` and `storage.delete()`.

- **Local Development / Fallback:** By default, files are saved directly to a local filesystem folder (e.g., `public/uploads`). This ensures the app works entirely offline or on a self-hosted single instance without any AWS dependencies.
- **Production (Cloud):** When `S3_BUCKET` environment variables are present, the adapter transparently switches to generating **presigned S3 URLs**. Clients upload files directly to the cloud without proxying through the Node server.

## Database Schema
An `attachments` table will link files to tasks:
- `id`: UUID
- `taskId`: UUID
- `uploaderId`: UUID
- `fileName`: String
- `fileUrl`: String (Relative path for local dev, absolute URL for production)
- `mimeType`: String

## Attachment Garbage Collection
Over time, users will upload large files to tasks and eventually delete the task, leading to orphaned files that consume expensive storage.

- **The Strategy:** When a task is soft-deleted, its attachments are marked as `pending_deletion`. 
- **The Worker:** A background Node worker (via BullMQ or `setInterval`) runs nightly. It scans for attachments where the associated task has been permanently deleted, or attachments that have been `pending_deletion` for over 30 days.
- **Distributed Locking (Cluster Safety):** Because the app is deployed as a cluster (multiple Node instances), a naïve `setInterval` will cause every instance to run the cron job simultaneously. The worker must acquire a distributed lock via Redis (e.g., Redlock) before executing, ensuring only one container performs the garbage collection.
- **Execution:** The worker calls `storage.delete(fileName)` (which deletes the local file or issues an S3 deletion command) and then drops the row from the `attachments` table.

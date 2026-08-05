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

## Attachment Garbage Collection (Planned Maintenance Utility)
Over time, deleted tasks can leave orphaned files on disk. An offline cleanup script `scripts/cleanup-orphan-tasks.ts` can scan for orphaned attachments where the parent task has been removed, call storage deletion, and prune orphaned records.

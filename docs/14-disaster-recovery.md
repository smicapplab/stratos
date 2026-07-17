# 14 - Disaster Recovery & Backups

## Concept
Because Stratos is designed to be environment-agnostic (capable of running on a bare-metal VPS or via managed clouds), we cannot assume magic backups exist. As the source of truth for company operations, data loss is catastrophic.

## 1. Database Backups
If using a managed service (like AWS RDS, Supabase, or Neon), automated backups are typically included. However, if self-hosting Postgres (e.g., via Docker on a VPS), an explicit backup strategy is mandatory.

- **Point-In-Time Recovery (PITR):** Standard `pg_dump` cron jobs are insufficient for an active Kanban board, as you can lose up to 24 hours of work between nightly dumps. We mandate **WAL (Write-Ahead Log) Archiving**.
- **The Tool:** We recommend using `pgBackRest` or `wal-g`. 
- **The Execution:** The database continuously streams WAL files to an external storage bucket (S3, Cloudflare R2, or a separate networked drive). This allows administrators to restore the database to the exact second before a catastrophic event (e.g., someone accidentally deleting a massive project).

## 2. Attachment Backups
Database backups do not cover user-uploaded files (images, PDFs) if stored locally.

- **Storage Adapter:** If the Storage Adapter (`08-file-attachments.md`) is configured for AWS S3, rely on S3 versioning and cross-region replication for disaster recovery.
- **Local Fallback:** If falling back to the local `public/uploads` folder, a nightly `rsync` or `rclone` cron job MUST be configured to mirror this directory to off-site storage.

## 3. Application State
Stratos is a strictly **Stateless Node Application**. 
- The Node containers hold zero persistent data (except for the ephemeral LRU memory cache). 
- If a server crashes, deploying a fresh container instantly restores full functionality, provided the Database and Storage endpoints are reachable.

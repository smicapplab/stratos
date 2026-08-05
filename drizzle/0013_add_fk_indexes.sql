CREATE INDEX IF NOT EXISTS "comments_task_id_idx" ON "comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_links_source_task_id_idx" ON "task_links" USING btree ("source_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_links_target_task_id_idx" ON "task_links" USING btree ("target_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_task_id_idx" ON "attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reactions_comment_id_idx" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_task_id_idx" ON "notifications" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");

CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "order_index" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" varchar(20) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_tokens_group_id_idx" ON "api_tokens" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "api_tokens_token_hash_idx" ON "api_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "tasks_group_id_idx" ON "tasks" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "tasks_board_id_idx" ON "tasks" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "tasks_stage_id_idx" ON "tasks" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "tasks_updated_at_idx" ON "tasks" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "tasks_source_id_group_idx" ON "tasks" USING btree ("group_id","source_id");
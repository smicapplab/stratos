CREATE TABLE "task_followers" (
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_followers_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "task_followers" ADD CONSTRAINT "task_followers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_followers" ADD CONSTRAINT "task_followers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
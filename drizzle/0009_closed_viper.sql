ALTER TABLE "groups" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "default_theme" varchar(50) DEFAULT 'stratos' NOT NULL;
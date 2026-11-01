ALTER TABLE "profiles" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "day_reset_hour" integer DEFAULT 0 NOT NULL;
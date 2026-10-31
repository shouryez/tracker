ALTER TYPE "public"."group_role" ADD VALUE 'admin';--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD COLUMN "paused_ms" integer DEFAULT 0 NOT NULL;
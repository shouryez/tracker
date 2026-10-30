ALTER TABLE "platform_accounts" ADD COLUMN "verify_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_accounts" ADD COLUMN "sync_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_accounts" ADD COLUMN "snapshot" jsonb;

-- DsaKaro

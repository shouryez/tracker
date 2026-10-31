ALTER TABLE "profiles" ADD COLUMN "daily_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "daily_email_sent_on" date;
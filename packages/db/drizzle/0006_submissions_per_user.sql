ALTER TABLE "submissions" DROP CONSTRAINT "submissions_platform_external_uq";--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_platform_external_uq" UNIQUE("user_id","platform","external_id");

-- DsaKaro

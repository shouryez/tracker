CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "college_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"college_id" uuid NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"image" "bytea",
	"image_type" text,
	"note" text,
	"reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text
);
--> statement-breakpoint
ALTER TABLE "college_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "college_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "college_verifications" ADD CONSTRAINT "college_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_verifications" ADD CONSTRAINT "college_verifications_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "college_verifications_queue_idx" ON "college_verifications" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "college_verifications_user_idx" ON "college_verifications" USING btree ("user_id","submitted_at");
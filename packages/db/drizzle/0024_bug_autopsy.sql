CREATE TABLE "bug_drills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"source_submission_id" uuid,
	"language" text,
	"bug_class" text NOT NULL,
	"broken_code" text NOT NULL,
	"bug_line" integer NOT NULL,
	"failing_input" text,
	"explanation" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answered_at" timestamp with time zone,
	"picked_line" integer,
	"correct" boolean,
	"answer_ms" integer
);
--> statement-breakpoint
ALTER TABLE "bug_drills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bug_findings" (
	"submission_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bug_class" text NOT NULL,
	"explanation" text NOT NULL,
	"line" integer,
	"user_class" text,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submission_code" (
	"submission_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"language" text,
	"code" text NOT NULL,
	"failing_input" text,
	"expected" text,
	"actual" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_code" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bug_drills" ADD CONSTRAINT "bug_drills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_drills" ADD CONSTRAINT "bug_drills_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_drills" ADD CONSTRAINT "bug_drills_source_submission_id_submissions_id_fk" FOREIGN KEY ("source_submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_findings" ADD CONSTRAINT "bug_findings_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_findings" ADD CONSTRAINT "bug_findings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_code" ADD CONSTRAINT "submission_code_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_code" ADD CONSTRAINT "submission_code_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bug_drills_user_idx" ON "bug_drills" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bug_findings_user_idx" ON "bug_findings" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submission_code_user_idx" ON "submission_code" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "owner can read" ON "bug_drills" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("bug_drills"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "bug_findings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("bug_findings"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "submission_code" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("submission_code"."user_id" = (select auth.uid()));
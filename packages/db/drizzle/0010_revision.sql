CREATE TYPE "public"."review_action" AS ENUM('remembered', 'shaky', 'forgot', 'retire', 'restore');--> statement-breakpoint
CREATE TABLE "problem_notes" (
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_notes_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
ALTER TABLE "problem_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"action" "review_action" NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "review_cap" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "weekly_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "problem_notes" ADD CONSTRAINT "problem_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_notes" ADD CONSTRAINT "problem_notes_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_logs_user_idx" ON "review_logs" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE POLICY "owner can read" ON "problem_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("problem_notes"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "review_logs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("review_logs"."user_id" = (select auth.uid()));
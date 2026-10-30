CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" text DEFAULT 'stopwatch' NOT NULL,
	"label" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"focus_ms" integer DEFAULT 0 NOT NULL,
	"away_ms" integer DEFAULT 0 NOT NULL,
	"switches" integer DEFAULT 0 NOT NULL,
	"tracked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nudges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"to_user" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"day" date NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nudges_pair_day_uq" UNIQUE("user_id","to_user","day")
);
--> statement-breakpoint
ALTER TABLE "nudges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_days" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "plan_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "plan_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"problem_id" uuid,
	"title" text NOT NULL,
	"url" text,
	"detail" text,
	"position" integer DEFAULT 0 NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "problem_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_shares_group_problem_uq" UNIQUE("group_id","problem_id")
);
--> statement-breakpoint
ALTER TABLE "problem_shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recall_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"correct" boolean NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recall_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"topic" text,
	"at_seconds" integer,
	"note" text,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_items_user_url_uq" UNIQUE("user_id","url")
);
--> statement-breakpoint
ALTER TABLE "saved_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weekly_goals" (
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"mediums" integer DEFAULT 10 NOT NULL,
	"focus_hours" integer DEFAULT 6 NOT NULL,
	"revisions" integer DEFAULT 15 NOT NULL,
	"reflection" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_goals_user_id_week_start_pk" PRIMARY KEY("user_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "weekly_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD COLUMN "pattern" text;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD COLUMN "takeaway" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reminders_on" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reminder_hour" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "contest_reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_to_user_users_id_fk" FOREIGN KEY ("to_user") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_shares" ADD CONSTRAINT "problem_shares_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_shares" ADD CONSTRAINT "problem_shares_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_shares" ADD CONSTRAINT "problem_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_answers" ADD CONSTRAINT "recall_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_answers" ADD CONSTRAINT "recall_answers_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focus_sessions_user_idx" ON "focus_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "nudges_to_idx" ON "nudges" USING btree ("to_user","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "plan_items_user_day_idx" ON "plan_items" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "problem_shares_group_idx" ON "problem_shares" USING btree ("group_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recall_answers_user_idx" ON "recall_answers" USING btree ("user_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "saved_items_user_idx" ON "saved_items" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "owner can read" ON "focus_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("focus_sessions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "plan_days" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("plan_days"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "plan_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("plan_items"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "recall_answers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("recall_answers"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "saved_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("saved_items"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "weekly_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("weekly_goals"."user_id" = (select auth.uid()));

-- DsaKaro

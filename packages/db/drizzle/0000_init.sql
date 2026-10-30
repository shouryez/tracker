CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('internship', 'placements', 'faang', 'cp');--> statement-breakpoint
CREATE TYPE "public"."independence" AS ENUM('solo', 'hint', 'solution');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('leetcode', 'codeforces', 'geeksforgeeks', 'codechef', 'atcoder', 'code360', 'hackerrank', 'interviewbit');--> statement-breakpoint
CREATE TYPE "public"."review_result" AS ENUM('pass', 'slow', 'hint', 'fail');--> statement-breakpoint
CREATE TYPE "public"."session_mode" AS ENUM('practice', 'review', 'interview');--> statement-breakpoint
CREATE TYPE "public"."session_outcome" AS ENUM('open', 'solved', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."submission_source" AS ENUM('api', 'extension');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'ok', 'error', 'rate_limited');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'OTHER');--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"city" text,
	"state" text,
	"aishe_code" text,
	"email_domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colleges_aishe_code_unique" UNIQUE("aishe_code")
);
--> statement-breakpoint
ALTER TABLE "colleges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contest_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"contest_id" text NOT NULL,
	"contest_name" text,
	"at" timestamp with time zone NOT NULL,
	"rank" integer,
	"old_rating" integer,
	"new_rating" integer,
	"solved" integer,
	"total" integer,
	CONSTRAINT "contest_results_user_contest_uq" UNIQUE("user_id","platform","contest_id")
);
--> statement-breakpoint
ALTER TABLE "contest_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"solved_easy" integer DEFAULT 0 NOT NULL,
	"solved_medium" integer DEFAULT 0 NOT NULL,
	"solved_hard" integer DEFAULT 0 NOT NULL,
	"active_ms" integer DEFAULT 0 NOT NULL,
	"topics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "daily_stats_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "daily_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"handle" text NOT NULL,
	"verify_code" text,
	"verified_at" timestamp with time zone,
	"status" "sync_status" DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"sync_cursor" jsonb,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_accounts_user_platform_uq" UNIQUE("user_id","platform")
);
--> statement-breakpoint
ALTER TABLE "platform_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "platform_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid,
	"platform" "platform" NOT NULL,
	"external_id" text NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"difficulty_raw" text,
	"rating" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_problems_platform_external_uq" UNIQUE("platform","external_id")
);
--> statement-breakpoint
ALTER TABLE "platform_problems" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform_problem_id" uuid NOT NULL,
	"mode" "session_mode" DEFAULT 'practice' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"active_ms" integer DEFAULT 0 NOT NULL,
	"idle_ms" integer DEFAULT 0 NOT NULL,
	"submits" integer DEFAULT 0 NOT NULL,
	"outcome" "session_outcome" DEFAULT 'open' NOT NULL,
	"independence" "independence",
	"note" text,
	"mistake_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_slug" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" "difficulty",
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problems_canonical_slug_unique" UNIQUE("canonical_slug")
);
--> statement-breakpoint
ALTER TABLE "problems" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"handle" text,
	"name" text,
	"avatar_url" text,
	"college_id" uuid,
	"branch" text,
	"grad_year" integer,
	"current_year" integer,
	"goal" "goal",
	"target_companies" text[] DEFAULT '{}'::text[] NOT NULL,
	"main_language" text,
	"daily_goal_min" integer DEFAULT 60 NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_result" "review_result",
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "reviews_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sheet_items" (
	"sheet_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"section" text,
	"title" text NOT NULL,
	"problem_id" uuid,
	CONSTRAINT "sheet_items_sheet_id_position_pk" PRIMARY KEY("sheet_id","position")
);
--> statement-breakpoint
ALTER TABLE "sheet_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"author" text,
	"source_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "sheets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "solves" (
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"first_solved_at" timestamp with time zone NOT NULL,
	"last_solved_at" timestamp with time zone NOT NULL,
	"best_independence" "independence",
	"solve_count" integer DEFAULT 1 NOT NULL,
	"best_active_ms" integer,
	CONSTRAINT "solves_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
ALTER TABLE "solves" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform_problem_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"external_id" text NOT NULL,
	"verdict" "verdict" NOT NULL,
	"language" text,
	"runtime_ms" integer,
	"memory_kb" integer,
	"submitted_at" timestamp with time zone NOT NULL,
	"source" "submission_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_platform_external_uq" UNIQUE("platform","external_id")
);
--> statement-breakpoint
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "topic_mastery" (
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"solved" integer DEFAULT 0 NOT NULL,
	"solo_rate" real,
	"median_ms" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_mastery_user_id_topic_pk" PRIMARY KEY("user_id","topic")
);
--> statement-breakpoint
ALTER TABLE "topic_mastery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contest_results" ADD CONSTRAINT "contest_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_problems" ADD CONSTRAINT "platform_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_platform_problem_id_platform_problems_id_fk" FOREIGN KEY ("platform_problem_id") REFERENCES "public"."platform_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD CONSTRAINT "sheet_items_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_items" ADD CONSTRAINT "sheet_items_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solves" ADD CONSTRAINT "solves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solves" ADD CONSTRAINT "solves_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_platform_problem_id_platform_problems_id_fk" FOREIGN KEY ("platform_problem_id") REFERENCES "public"."platform_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colleges_name_idx" ON "colleges" USING btree ("name");--> statement-breakpoint
CREATE INDEX "platform_problems_platform_slug_idx" ON "platform_problems" USING btree ("platform","slug");--> statement-breakpoint
CREATE INDEX "platform_problems_problem_idx" ON "platform_problems" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_time_idx" ON "practice_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "profiles_college_idx" ON "profiles" USING btree ("college_id");--> statement-breakpoint
CREATE INDEX "reviews_user_due_idx" ON "reviews" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "sheet_items_problem_idx" ON "sheet_items" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "submissions_user_time_idx" ON "submissions" USING btree ("user_id","submitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "public read" ON "colleges" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "owner can read" ON "contest_results" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("contest_results"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "daily_stats" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("daily_stats"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "platform_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("platform_accounts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "public read" ON "platform_problems" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "owner can read" ON "practice_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("practice_sessions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "public read" ON "problems" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "owner can read" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "public profiles are readable" ON "profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("profiles"."is_public");--> statement-breakpoint
CREATE POLICY "owner can read" ON "reviews" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("reviews"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "public read" ON "sheet_items" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "public read" ON "sheets" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "owner can read" ON "solves" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("solves"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("submissions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "owner can read" ON "topic_mastery" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("topic_mastery"."user_id" = (select auth.uid()));

-- DsaKaro

/**
 * Upsolve schema v1 (PLAN.md §3).
 *
 * Access model: the web server and job workers talk to Postgres directly via
 * Drizzle (DATABASE_URL), which bypasses RLS. RLS here protects the Supabase
 * Data API: signed-in users may only *read* their own rows; catalog tables are
 * public-read. All writes go through server code that validates input first.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";
import type { PlatformSnapshot, SyncCursor } from "@upsolve/adapters";

// ---------------------------------------------------------------- enums

// Keep in sync with PLATFORMS in @upsolve/adapters.
export const platform = pgEnum("platform", [
  "leetcode",
  "codeforces",
  "geeksforgeeks",
  "codechef",
  "atcoder",
  "code360",
  "hackerrank",
  "interviewbit",
]);
export const difficulty = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const goal = pgEnum("goal", ["internship", "placements", "faang", "cp"]);
export const verdict = pgEnum("verdict", ["AC", "WA", "TLE", "MLE", "RE", "CE", "OTHER"]);
export const submissionSource = pgEnum("submission_source", ["api", "extension"]);
export const syncStatus = pgEnum("sync_status", ["pending", "ok", "error", "rate_limited"]);
export const sessionMode = pgEnum("session_mode", ["practice", "review", "interview"]);
export const sessionOutcome = pgEnum("session_outcome", ["open", "solved", "abandoned"]);
export const independence = pgEnum("independence", ["solo", "hint", "solution"]);
/** Things a user does in the revision queue by hand (PLAN.md §6.2). */
export const reviewAction = pgEnum("review_action", [
  "remembered",
  "shaky",
  "forgot",
  "retire",
  "restore",
]);

// ---------------------------------------------------------------- helpers

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const userRef = () =>
  uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });

/** Signed-in users can read only their own rows. */
const ownerCanRead = (userId: AnyPgColumn) =>
  pgPolicy("owner can read", {
    for: "select",
    to: authenticatedRole,
    using: sql`${userId} = ${authUid}`,
  });

/** Anyone (signed in or not) can read. For shared catalog data. */
const publicRead = () =>
  pgPolicy("public read", {
    for: "select",
    to: [anonRole, authenticatedRole],
    using: sql`true`,
  });

// ---------------------------------------------------------------- people

export const colleges = pgTable(
  "colleges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    city: text("city"),
    state: text("state"),
    /** All India Survey on Higher Education code, when known. */
    aisheCode: text("aishe_code").unique(),
    emailDomain: text("email_domain"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("colleges_name_lower_uq").on(sql`lower(${t.name})`), publicRead()],
).enableRLS();

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    /** Public URL handle (/u/<handle>). Chosen during onboarding. */
    handle: text("handle").unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    collegeId: uuid("college_id").references(() => colleges.id, { onDelete: "set null" }),
    branch: text("branch"),
    /** We ask for graduation year instead of age / date of birth (DESIGN.md §9.2). */
    gradYear: integer("grad_year"),
    currentYear: integer("current_year"),
    goal: goal("goal"),
    targetCompanies: text("target_companies")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    mainLanguage: text("main_language"),
    dailyGoalMin: integer("daily_goal_min").notNull().default(60),
    /** Most reviews shown per day in the revision queue. */
    reviewCap: integer("review_cap").notNull().default(5),
    weeklyEmail: boolean("weekly_email").notNull().default(true),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    isPublic: boolean("is_public").notNull().default(false),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("profiles_college_idx").on(t.collegeId),
    ownerCanRead(t.userId),
    pgPolicy("public profiles are readable", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`${t.isPublic}`,
    }),
  ],
).enableRLS();

export const platformAccounts = pgTable(
  "platform_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    platform: platform("platform").notNull(),
    handle: text("handle").notNull(),
    /** Code the user pastes into their platform bio to prove ownership. */
    verifyCode: text("verify_code"),
    /** When the current verification challenge was issued (Codeforces checks submissions after it). */
    verifyRequestedAt: timestamp("verify_requested_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    status: syncStatus("status").notNull().default("pending"),
    /** Set while a sync runs; doubles as a lock so two syncs don't overlap. */
    syncStartedAt: timestamp("sync_started_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncCursor: jsonb("sync_cursor").$type<SyncCursor>(),
    /** Latest profile-level numbers from the platform (counts, rating, calendar, topics). */
    snapshot: jsonb("snapshot").$type<PlatformSnapshot>(),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("platform_accounts_user_platform_uq").on(t.userId, t.platform),
    ownerCanRead(t.userId),
  ],
).enableRLS();

/**
 * Long-lived API tokens for the browser extension. Only a SHA-256 hash is
 * stored; the plain token lives in the user's extension storage.
 */
export const extensionTokens = pgTable(
  "extension_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    tokenHash: text("token_hash").notNull().unique(),
    /** Browser description shown in Settings, e.g. "Chrome on Windows". */
    label: text("label"),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("extension_tokens_user_idx").on(t.userId), ownerCanRead(t.userId)],
).enableRLS();

// ---------------------------------------------------------------- problem catalog

/** Our canonical problem: one row per real-world problem, across platforms. */
export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalSlug: text("canonical_slug").notNull().unique(),
    title: text("title").notNull(),
    difficulty: difficulty("difficulty"),
    topics: text("topics")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  () => [publicRead()],
).enableRLS();

/** A problem as it exists on one platform; linked to `problems` by the catalog matcher. */
export const platformProblems = pgTable(
  "platform_problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id").references(() => problems.id, { onDelete: "set null" }),
    platform: platform("platform").notNull(),
    externalId: text("external_id").notNull(),
    slug: text("slug").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    difficultyRaw: text("difficulty_raw"),
    /** Numeric rating where the platform has one (Codeforces, AtCoder). */
    rating: integer("rating"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [
    unique("platform_problems_platform_external_uq").on(t.platform, t.externalId),
    index("platform_problems_platform_slug_idx").on(t.platform, t.slug),
    index("platform_problems_problem_idx").on(t.problemId),
    publicRead(),
  ],
).enableRLS();

// ---------------------------------------------------------------- activity

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    platformProblemId: uuid("platform_problem_id")
      .notNull()
      .references(() => platformProblems.id, { onDelete: "cascade" }),
    platform: platform("platform").notNull(),
    externalId: text("external_id").notNull(),
    verdict: verdict("verdict").notNull(),
    language: text("language"),
    runtimeMs: integer("runtime_ms"),
    memoryKb: integer("memory_kb"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    source: submissionSource("source").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("submissions_user_platform_external_uq").on(t.userId, t.platform, t.externalId),
    index("submissions_user_time_idx").on(t.userId, t.submittedAt.desc()),
    ownerCanRead(t.userId),
  ],
).enableRLS();

/** One timed attempt at a problem, captured by the extension. */
export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    /** Id the extension generated, so repeated uploads update one row. */
    clientId: text("client_id").notNull(),
    platformProblemId: uuid("platform_problem_id")
      .notNull()
      .references(() => platformProblems.id, { onDelete: "cascade" }),
    mode: sessionMode("mode").notNull().default("practice"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    activeMs: integer("active_ms").notNull().default(0),
    idleMs: integer("idle_ms").notNull().default(0),
    submits: integer("submits").notNull().default(0),
    outcome: sessionOutcome("outcome").notNull().default("open"),
    independence: independence("independence"),
    note: text("note"),
    mistakeTags: text("mistake_tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("practice_sessions_user_client_uq").on(t.userId, t.clientId),
    index("practice_sessions_user_time_idx").on(t.userId, t.startedAt.desc()),
    ownerCanRead(t.userId),
  ],
).enableRLS();

/** Derived: one row per (user, canonical problem) once solved. */
export const solves = pgTable(
  "solves",
  {
    userId: userRef(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    firstSolvedAt: timestamp("first_solved_at", { withTimezone: true }).notNull(),
    lastSolvedAt: timestamp("last_solved_at", { withTimezone: true }).notNull(),
    bestIndependence: independence("best_independence"),
    solveCount: integer("solve_count").notNull().default(1),
    bestActiveMs: integer("best_active_ms"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId] }), ownerCanRead(t.userId)],
).enableRLS();

// ---------------------------------------------------------------- sheets

export const sheets = pgTable(
  "sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    author: text("author"),
    sourceUrl: text("source_url"),
    /** Date the list was extracted from its source (YYYY-MM-DD). */
    version: text("version"),
    /** Display order on the Sheets page. */
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  () => [publicRead()],
).enableRLS();

export const sheetItemKind = pgEnum("sheet_item_kind", ["practice", "learning"]);

export type SheetItemLink = {
  site: "leetcode" | "geeksforgeeks" | "takeuforward" | "source";
  url: string;
};

export const sheetItems = pgTable(
  "sheet_items",
  {
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    /** Stable id within the sheet (survives reordering), e.g. the source's slug. */
    itemKey: text("item_key").notNull(),
    position: integer("position").notNull(),
    step: text("step").notNull(),
    section: text("section"),
    title: text("title").notNull(),
    kind: sheetItemKind("kind").notNull().default("practice"),
    /** Source's own difficulty label (easy/medium/hard, or basic/core/pro on Striver). */
    tier: text("tier"),
    /** Primary place to solve it (first of `links`). */
    url: text("url"),
    /** Every known place to solve it, e.g. LeetCode, GeeksforGeeks, takeUforward. */
    links: jsonb("links")
      .$type<SheetItemLink[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Canonical problem, when it exists on a platform we track. Null = tick manually. */
    problemId: uuid("problem_id").references(() => problems.id, { onDelete: "set null" }),
  },
  (t) => [
    primaryKey({ columns: [t.sheetId, t.itemKey] }),
    index("sheet_items_sheet_position_idx").on(t.sheetId, t.position),
    index("sheet_items_problem_idx").on(t.problemId),
    publicRead(),
  ],
).enableRLS();

/** Sheets a user follows; their progress shows on the dashboard. */
export const userSheets = pgTable(
  "user_sheets",
  {
    userId: userRef(),
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sheetId] }), ownerCanRead(t.userId)],
).enableRLS();

/** Items a user ticked by hand (problems we can't detect automatically). */
export const sheetMarks = pgTable(
  "sheet_marks",
  {
    userId: userRef(),
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sheetId, t.itemKey] }), ownerCanRead(t.userId)],
).enableRLS();

// ---------------------------------------------------------------- learning

/**
 * Manual revision actions. The review schedule itself isn't stored: it's
 * recomputed from submissions, sessions and these rows (@upsolve/core srs).
 */
export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    action: reviewAction("action").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_logs_user_idx").on(t.userId, t.problemId), ownerCanRead(t.userId)],
).enableRLS();

/** The user's own notes on a problem (plain text, shown on the problem page). */
export const problemNotes = pgTable(
  "problem_notes",
  {
    userId: userRef(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.problemId] }), ownerCanRead(t.userId)],
).enableRLS();

export const contestResults = pgTable(
  "contest_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    platform: platform("platform").notNull(),
    contestId: text("contest_id").notNull(),
    contestName: text("contest_name"),
    at: timestamp("at", { withTimezone: true }).notNull(),
    rank: integer("rank"),
    oldRating: integer("old_rating"),
    newRating: integer("new_rating"),
    solved: integer("solved"),
    total: integer("total"),
  },
  (t) => [
    unique("contest_results_user_contest_uq").on(t.userId, t.platform, t.contestId),
    ownerCanRead(t.userId),
  ],
).enableRLS();

// ---------------------------------------------------------------- beta feedback

export const feedbackKind = pgEnum("feedback_kind", ["bug", "confusing", "idea", "other"]);

/** Notes from the in-app feedback button. Read by admins (ADMIN_EMAILS) at /dashboard/feedback. */
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    kind: feedbackKind("kind").notNull(),
    message: text("message").notNull(),
    /** Page the user was on, e.g. "/dashboard/revision". */
    page: text("page"),
    createdAt: createdAt(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt.desc()), ownerCanRead(t.userId)],
).enableRLS();

// ---------------------------------------------------------------- rollups (dashboard reads these)

export const dailyStats = pgTable(
  "daily_stats",
  {
    userId: userRef(),
    date: date("date").notNull(),
    solvedEasy: integer("solved_easy").notNull().default(0),
    solvedMedium: integer("solved_medium").notNull().default(0),
    solvedHard: integer("solved_hard").notNull().default(0),
    activeMs: integer("active_ms").notNull().default(0),
    topics: jsonb("topics")
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] }), ownerCanRead(t.userId)],
).enableRLS();

export const topicMastery = pgTable(
  "topic_mastery",
  {
    userId: userRef(),
    topic: text("topic").notNull(),
    score: real("score").notNull().default(0),
    solved: integer("solved").notNull().default(0),
    soloRate: real("solo_rate"),
    medianMs: integer("median_ms"),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topic] }), ownerCanRead(t.userId)],
).enableRLS();

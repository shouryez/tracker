/**
 * DsaKaro schema v1 (PLAN.md §3).
 *
 * Access model: the web server and job workers talk to Postgres directly via
 * Drizzle (DATABASE_URL), which bypasses RLS. RLS here protects the Supabase
 * Data API: signed-in users may only *read* their own rows; catalog tables are
 * public-read. All writes go through server code that validates input first.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
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
    /** Opt-in: appear on (and see) the college and batch leaderboards. */
    onLeaderboards: boolean("on_leaderboards").notNull().default(false),
    /** Friend-group members can see the problem you're solving right now. */
    shareLive: boolean("share_live").notNull().default(true),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    isPublic: boolean("is_public").notNull().default(false),
    /** Browser reminders from the extension (revisions due, today's plan). */
    remindersOn: boolean("reminders_on").notNull().default(true),
    /** Local hour (0-23) for the daily reminder; null = your usual best hour. */
    reminderHour: integer("reminder_hour"),
    /** Remind 30 minutes before upcoming contests. */
    contestReminders: boolean("contest_reminders").notNull().default(true),
    /** Daily reminder email at the reminder hour, only on days with revisions due or plan left. */
    dailyEmail: boolean("daily_email").notNull().default(true),
    /** Local date the last daily email went out, so it's sent at most once a day. */
    dailyEmailSentOn: date("daily_email_sent_on"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    /** An admin checked a college ID for the current college. Cleared when the college changes. */
    collegeVerifiedAt: timestamp("college_verified_at", { withTimezone: true }),
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
    /** The extension's timer at its last report (active/paused/...), for the live clock. */
    liveStatus: text("live_status"),
    independence: independence("independence"),
    note: text("note"),
    mistakeTags: text("mistake_tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Wrap-up after Accepted: the pattern (a topic id) and a one-line takeaway. */
    pattern: text("pattern"),
    takeaway: text("takeaway"),
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
  /** Places to solve it, then places to learn it (the creator's video and article). */
  site:
    "leetcode" | "geeksforgeeks" | "takeuforward" | "neetcode" | "source" | "youtube" | "article";
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
    /** The sheet's own time estimate (Striver: "17 min"). */
    minutes: integer("minutes"),
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

/**
 * Sheet ticks and unticks made in DsaKaro that still have to reach the same sheet on
 * takeUforward. The extension applies them from a takeuforward.org tab, then clears them.
 * One row per item: the latest change wins.
 */
export const tufPushQueue = pgTable(
  "tuf_push_queue",
  {
    userId: userRef(),
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    done: boolean("done").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sheetId, t.itemKey] }), ownerCanRead(t.userId)],
).enableRLS();

/** Items a user starred to come back to (the sheet's "bookmark"). */
export const sheetStars = pgTable(
  "sheet_stars",
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

// ---------------------------------------------------------------- social

/** owner (one, created the group) > admin (can manage members and settings) > member. */
export const groupRole = pgEnum("group_role", ["owner", "member", "admin"]);

/** Friend groups: a shared leaderboard and study room, joined with an invite link. */
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Secret part of the invite link (/join/<code>); the owner can reset it. */
    inviteCode: text("invite_code").notNull().unique(),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    pgPolicy("members can read", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from group_members m where m.group_id = ${t.id} and m.user_id = ${authUid})`,
    }),
  ],
).enableRLS();

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: userRef(),
    role: groupRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index("group_members_user_idx").on(t.userId),
    ownerCanRead(t.userId),
  ],
).enableRLS();

/** Exam-week freezes: days in [start, end] neither count towards nor break a streak. */
export const streakFreezes = pgTable(
  "streak_freezes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("streak_freezes_user_idx").on(t.userId), ownerCanRead(t.userId)],
).enableRLS();

// ---------------------------------------------------------------- daily loop

/**
 * Today plan. Suggested items (revision, next, stretch, shared, contest) are generated once
 * per local day; custom items are the user's own. Problem items tick themselves when the
 * problem is solved that day (computed on read), custom items via `doneAt`.
 */
export const planItems = pgTable(
  "plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    day: date("day").notNull(),
    kind: text("kind").notNull(),
    problemId: uuid("problem_id").references(() => problems.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url"),
    detail: text("detail"),
    position: integer("position").notNull().default(0),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("plan_items_user_day_idx").on(t.userId, t.day), ownerCanRead(t.userId)],
).enableRLS();

/** Days whose suggestions were already generated, so deleting them doesn't bring them back. */
export const planDays = pgTable(
  "plan_days",
  {
    userId: userRef(),
    day: date("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), ownerCanRead(t.userId)],
).enableRLS();

/**
 * Focus (Lab) sessions: a study timer. With the extension, time on coding sites counts as
 * focus and other tabs as away; only the totals are stored, never which sites.
 */
export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    mode: text("mode").notNull().default("stopwatch"),
    label: text("label"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    focusMs: integer("focus_ms").notNull().default(0),
    awayMs: integer("away_ms").notNull().default(0),
    switches: integer("switches").notNull().default(0),
    /** True when the extension measured focus/away; false = wall-clock only. */
    tracked: boolean("tracked").notNull().default(false),
    /** Set while the session is paused. Paused time never counts. */
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    /** Total paused time of earlier pauses. */
    pausedMs: integer("paused_ms").notNull().default(0),
  },
  (t) => [
    index("focus_sessions_user_idx").on(t.userId, t.startedAt.desc()),
    ownerCanRead(t.userId),
  ],
).enableRLS();

/**
 * Videos watched in the app's player (a sheet's YouTube explanations), so a study session can
 * list what you watched. Only views of 20 seconds or more are kept.
 */
export const videoWatches = pgTable(
  "video_watches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    sheetId: uuid("sheet_id").references(() => sheets.id, { onDelete: "set null" }),
    itemKey: text("item_key"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    watchedMs: integer("watched_ms").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("video_watches_user_idx").on(t.userId, t.startedAt.desc()), ownerCanRead(t.userId)],
).enableRLS();

/** Save-for-later: videos, articles and problems saved from anywhere. */
export const savedItems = pgTable(
  "saved_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("other"),
    topic: text("topic"),
    /** Seconds into a video where it was saved. */
    atSeconds: integer("at_seconds"),
    note: text("note"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("saved_items_user_url_uq").on(t.userId, t.url),
    index("saved_items_user_idx").on(t.userId, t.createdAt.desc()),
    ownerCanRead(t.userId),
  ],
).enableRLS();

/** Weekly targets and the Sunday reflection. `weekStart` is the local Monday. */
export const weeklyGoals = pgTable(
  "weekly_goals",
  {
    userId: userRef(),
    weekStart: date("week_start").notNull(),
    mediums: integer("mediums").notNull().default(10),
    focusHours: integer("focus_hours").notNull().default(6),
    revisions: integer("revisions").notNull().default(15),
    reflection: text("reflection"),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekStart] }), ownerCanRead(t.userId)],
).enableRLS();

/** Answers in the 2-minute recall quiz. */
export const recallAnswers = pgTable(
  "recall_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    correct: boolean("correct").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recall_answers_user_idx").on(t.userId, t.at.desc()), ownerCanRead(t.userId)],
).enableRLS();

/** "Solve this": a problem shared into a friend group. */
export const problemShares = pgTable(
  "problem_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    fromUser: userRef(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("problem_shares_group_problem_uq").on(t.groupId, t.problemId),
    index("problem_shares_group_idx").on(t.groupId, t.createdAt.desc()),
  ],
).enableRLS();

/** Gentle nudges between group members: at most one per pair per day. */
export const nudges = pgTable(
  "nudges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUser: userRef(),
    toUser: uuid("to_user")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("nudges_pair_day_uq").on(t.fromUser, t.toUser, t.day),
    index("nudges_to_idx").on(t.toUser, t.createdAt.desc()),
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

// ---------------------------------------------------------------- college verification

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
]);

/**
 * College ID uploads waiting for an admin. The photo is deleted (set to null) as soon
 * as it is reviewed; only the decision is kept. No RLS policies: server code only.
 */
export const collegeVerifications = pgTable(
  "college_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userRef(),
    collegeId: uuid("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    status: verificationStatus("status").notNull().default("pending"),
    image: bytea("image"),
    imageType: text("image_type"),
    /** Optional note from the student ("new card, old college name on it"). */
    note: text("note"),
    /** Shown to the student when rejected. */
    reason: text("reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
  },
  (t) => [
    index("college_verifications_queue_idx").on(t.status, t.submittedAt),
    index("college_verifications_user_idx").on(t.userId, t.submittedAt),
  ],
).enableRLS();

// DsaKaro

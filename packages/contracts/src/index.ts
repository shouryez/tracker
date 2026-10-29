/**
 * Wire format between the browser extension and the API (PLAN.md §5.4).
 * The server validates every request with these schemas; the extension
 * imports only the types.
 */
import { z } from "zod";

export * from "./leetcode.ts";
import { MISTAKE_TAGS } from "./leetcode.ts";

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);
const epochMs = z.number().int().min(1_500_000_000_000).max(4_000_000_000_000);
const ms = z
  .number()
  .int()
  .min(0)
  .max(24 * 60 * 60 * 1000);

export const Verdict = z.enum(["AC", "WA", "TLE", "MLE", "RE", "CE", "OTHER"]);

export const ExtSubmission = z.object({
  /** LeetCode's numeric submission id, as a string. */
  id: z.string().regex(/^\d{1,20}$/),
  verdict: Verdict,
  language: z.string().max(40).nullable(),
  runtimeMs: z.number().int().min(0).max(1_000_000).nullable(),
  memoryKb: z.number().int().min(0).max(100_000_000).nullable(),
  at: epochMs,
});

/** One timed attempt. The extension re-sends the whole record as it changes. */
export const ExtSession = z.object({
  clientId: z.uuid(),
  platform: z.enum(["leetcode", "geeksforgeeks"]),
  titleSlug: slug,
  title: z.string().max(200).nullable(),
  mode: z.enum(["practice", "review", "interview"]).default("practice"),
  startedAt: epochMs,
  endedAt: epochMs.nullable(),
  activeMs: ms,
  idleMs: ms,
  outcome: z.enum(["open", "solved", "abandoned"]),
  independence: z.enum(["solo", "hint", "solution"]).nullable(),
  note: z.string().max(500).nullable(),
  mistakeTags: z.array(z.enum(MISTAKE_TAGS)).max(MISTAKE_TAGS.length),
  /** Wrap-up after Accepted: the pattern used (a topic id) and a one-line takeaway. */
  pattern: z
    .string()
    .regex(/^[a-z-]{2,30}$/)
    .nullable()
    .default(null),
  takeaway: z.string().max(200).nullable().default(null),
  submissions: z.array(ExtSubmission).max(200),
  /** The timer right now, so the website's live clock runs only while you're solving. */
  status: z.enum(["armed", "active", "paused", "solved"]).optional(),
});

export const ExtSessionsRequest = z.object({
  sessions: z.array(ExtSession).min(1).max(50),
});

/** A past submission imported from the user's own LeetCode account. Never contains code. */
export const ExtHistoryItem = ExtSubmission.extend({
  titleSlug: slug,
  title: z.string().max(200),
});

export const ExtHistoryRequest = z.object({
  items: z.array(ExtHistoryItem).min(1).max(500),
});

export type ExtSubmission = z.infer<typeof ExtSubmission>;
export type ExtSession = z.infer<typeof ExtSession>;
export type ExtSessionsRequest = z.infer<typeof ExtSessionsRequest>;
export type ExtHistoryItem = z.infer<typeof ExtHistoryItem>;
export type ExtHistoryRequest = z.infer<typeof ExtHistoryRequest>;

/** Save-for-later from the extension (popup, context menu). */
export const ExtSaveRequest = z.object({
  url: z.url().max(2000),
  title: z.string().max(300),
  atSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
});
export type ExtSaveRequest = z.infer<typeof ExtSaveRequest>;

/** Everything the in-page panel shows for the problem you're on. */
export type ExtProblemContext = {
  known: boolean;
  problemId: string | null;
  title: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  /** Our topic ids and labels for this problem. */
  topics: { id: string; label: string }[];
  memory: {
    solvedCount: number;
    lastSolvedAt: number | null;
    bestActiveMs: number | null;
    independence: "solo" | "hint" | "solution" | null;
    attempts: number;
    lastTakeaway: string | null;
  };
  note: string | null;
  review: { step: number; intervalDays: number; dueAt: number; retired: boolean } | null;
  similar: { title: string; url: string | null; difficulty: string | null }[];
  /** Hints, least to most revealing. */
  hints: { level: 1 | 2 | 3; title: string; body: string }[];
  /** Pre-submit checks, the user's own repeated mistakes first. */
  checklist: { text: string; mine: number }[];
  dashboardUrl: string | null;
};

/** What the background worker polls for reminders and the focus timer. */
export type ExtTodayResponse = {
  timezone: string;
  remindersOn: boolean;
  /** Local hour to remind at (explicit setting, or the user's usual best hour). */
  reminderHour: number;
  due: number;
  planLeft: number;
  planTotal: number;
  contestReminders: boolean;
  contests: { id: string; name: string; platform: string; startsAt: number; url: string }[];
  nudges: { id: string; from: string; group: string }[];
  /** The running focus session, if any (started on the web). */
  focus: { id: string; startedAt: number; label: string | null } | null;
  dashboardUrl: string;
};

/**
 * Progress read from the user's own takeUforward sheet page (their ticks there). `solved`
 * adds ticks; `removed` holds items the user just unticked on takeUforward.
 */
/** takeUforward item slugs can hold apostrophes and commas ("kadane's-algorithm"). */
const tufSlug = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^\s<>"\\]+$/);

export const ExtSheetSyncRequest = z.object({
  source: z.literal("takeuforward"),
  /** takeUforward's sheet slug, e.g. "strivers-a2z-dsa-sheet". */
  sheet: slug,
  solved: z.array(tufSlug).max(1000),
  removed: z.array(tufSlug).max(50).default([]),
});
export type ExtSheetSyncRequest = z.infer<typeof ExtSheetSyncRequest>;

/** Focus totals reported by the extension when a Lab session ends. */
export const ExtFocusReport = z.object({
  focusId: z.uuid(),
  focusMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 3_600_000),
  awayMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 3_600_000),
  switches: z.number().int().min(0).max(100_000),
});
export type ExtFocusReport = z.infer<typeof ExtFocusReport>;

export type ExtMeResponse = {
  user: { name: string | null; handle: string | null };
  today: { sessions: number; solved: number; activeMs: number };
  dashboardUrl: string;
};

export type ExtSyncResponse = { ok: true; stored: number } | { ok: false; error: string };

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
  submissions: z.array(ExtSubmission).max(200),
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

export type ExtMeResponse = {
  user: { name: string | null; handle: string | null };
  today: { sessions: number; solved: number; activeMs: number };
  dashboardUrl: string;
};

export type ExtSyncResponse = { ok: true; stored: number } | { ok: false; error: string };

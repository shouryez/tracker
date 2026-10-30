// A practice session as the extension keeps it locally, and its wire form.
import type { ExtSession, ExtSubmission, MistakeTag } from "@upsolve/contracts";
import { newTimer, type TimerState } from "./timer.ts";

/** Sessions untouched for this long are closed as abandoned (or solved, if they were). */
export const SESSION_EXPIRES_MS = 30 * 60_000;
/** Shorter visits with no submissions are just browsing and are never uploaded. */
export const MIN_UPLOAD_ACTIVE_MS = 15_000;

export type SessionPlatform = ExtSession["platform"];

export type LocalSession = {
  /** Missing on sessions saved before GFG support; those are LeetCode. */
  platform?: SessionPlatform;
  /** "review" when opened from the revision queue. Missing = practice. */
  mode?: ExtSession["mode"];
  clientId: string;
  titleSlug: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  timer: TimerState;
  submissions: ExtSubmission[];
  outcome: ExtSession["outcome"];
  independence: ExtSession["independence"];
  note: string | null;
  mistakeTags: MistakeTag[];
  /** Wrap-up after Accepted (missing on older sessions). */
  pattern?: string | null;
  takeaway?: string | null;
  endedAt: number | null;
};

export function newSession(
  platform: SessionPlatform,
  slug: string,
  title: string | null,
  now: number,
  id: string,
): LocalSession {
  return {
    platform,
    clientId: id,
    titleSlug: slug,
    title,
    createdAt: now,
    updatedAt: now,
    timer: newTimer(now),
    submissions: [],
    outcome: "open",
    independence: null,
    note: null,
    mistakeTags: [],
    pattern: null,
    takeaway: null,
    endedAt: null,
  };
}

/** Whether to continue `existing` when the problem is opened again. */
export function canResume(existing: LocalSession | undefined, now: number): boolean {
  return !!existing && existing.outcome === "open" && now - existing.updatedAt < SESSION_EXPIRES_MS;
}

/** True for links from the revision queue (`?upsolve=review`). */
export function isReviewUrl(href: string): boolean {
  try {
    return new URL(href).searchParams.get("upsolve") === "review";
  } catch {
    return false;
  }
}

export function addSubmission(s: LocalSession, sub: ExtSubmission): LocalSession {
  if (s.submissions.some((x) => x.id === sub.id)) return s;
  return { ...s, submissions: [...s.submissions, sub].slice(-200) };
}

export function worthUploading(s: LocalSession): boolean {
  return (
    s.timer.startedAt !== null &&
    (s.timer.activeMs >= MIN_UPLOAD_ACTIVE_MS || s.submissions.length > 0)
  );
}

export function toWire(s: LocalSession): ExtSession {
  return {
    clientId: s.clientId,
    platform: s.platform ?? "leetcode",
    titleSlug: s.titleSlug,
    title: s.title,
    mode: s.mode ?? "practice",
    startedAt: s.timer.startedAt ?? s.createdAt,
    endedAt: s.endedAt,
    activeMs: Math.min(s.timer.activeMs, 24 * 3_600_000),
    idleMs: Math.min(s.timer.idleMs, 24 * 3_600_000),
    outcome: s.outcome,
    independence: s.independence,
    note: s.note,
    mistakeTags: s.mistakeTags,
    pattern: s.pattern ?? null,
    takeaway: s.takeaway ?? null,
    submissions: s.submissions,
    status: s.timer.status,
  };
}

// DsaKaro

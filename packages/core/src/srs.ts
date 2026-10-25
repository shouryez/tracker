// Spaced repetition (PLAN.md §6.2). A problem's review state is a fold over
// everything that happened to it (solves, manual reviews), so it can always be
// recomputed from stored history and never drifts.

export const INTERVAL_DAYS = [1, 3, 7, 16, 35, 90] as const;
export const MAX_STEP = INTERVAL_DAYS.length - 1;
/** Unproven reviews (platform re-solves, "I revised it") can't push a problem past this step. */
export const UNPROVEN_MAX_STEP = 3;
/** A re-solve sooner than this share of the current interval is practice, not a review. */
const EARLY_SHARE = 0.5;
/** Solo but this much slower than your best time counts as "slow". */
const SLOW_FACTOR = 1.2;
/** An Accepted submission this close to a timed session is that session's own submit. */
const SAME_SOLVE_MS = 3 * 3_600_000;
const HISTORY_KEEP = 30;
const DAY_MS = 86_400_000;

export type Independence = "solo" | "hint" | "solution";
export type Difficulty = "easy" | "medium" | "hard";
export type ReviewResult = "pass" | "slow" | "hint" | "fail";
export type ManualRating = "remembered" | "shaky" | "forgot";

export type ReviewEvent =
  | {
      kind: "solve";
      at: number;
      /** Seen by the extension (timed session), not just reported by a platform. */
      proven: boolean;
      independence: Independence | null;
      activeMs: number | null;
    }
  | { kind: "manual"; at: number; rating: ManualRating }
  | { kind: "retire"; at: number }
  | { kind: "restore"; at: number };

export type ReviewLogEntry = {
  at: number;
  result: ReviewResult;
  proven: boolean;
  manual: boolean;
  /** Step after this review. */
  step: number;
};

export type ReviewState = {
  step: number;
  dueAt: number;
  firstSolvedAt: number;
  /** Last solve or graded review; the interval counts from here. */
  lastAt: number;
  lastResult: ReviewResult | null;
  /** Fastest extension-timed solve. */
  bestMs: number | null;
  retired: boolean;
  /** Graded reviews, oldest first (the first solve isn't a review). */
  history: ReviewLogEntry[];
};

export const intervalMs = (step: number) =>
  INTERVAL_DAYS[Math.max(0, Math.min(MAX_STEP, step))]! * DAY_MS;

/** First solve: saw the solution → 1 day, used a hint → 3 days, solo → 7 days. Unknown → 3 days. */
export function firstStep(independence: Independence | null): number {
  return independence === "solution" ? 0 : independence === "solo" ? 2 : 1;
}

export function gradeSolve(
  independence: Independence | null,
  activeMs: number | null,
  bestMs: number | null,
): ReviewResult {
  if (independence === "solution") return "fail";
  if (independence === "hint") return "hint";
  if (activeMs !== null && bestMs !== null && activeMs > bestMs * SLOW_FACTOR) return "slow";
  return "pass";
}

const MANUAL_RESULT: Record<ManualRating, ReviewResult> = {
  remembered: "pass",
  shaky: "slow",
  forgot: "fail",
};

export function nextStep(step: number, result: ReviewResult, proven: boolean): number {
  switch (result) {
    case "pass": {
      const up = Math.min(step + 1, MAX_STEP);
      return proven ? up : Math.min(up, Math.max(step, UNPROVEN_MAX_STEP));
    }
    case "slow":
      return step;
    case "hint":
      return Math.max(0, step - 2);
    case "fail":
      return 0;
  }
}

/** Applies one event. Events must be applied oldest first. */
export function applyEvent(state: ReviewState | null, e: ReviewEvent): ReviewState | null {
  if (e.kind === "retire" || e.kind === "restore") {
    return state && { ...state, retired: e.kind === "retire" };
  }
  if (!state) {
    if (e.kind !== "solve") return null; // nothing to review before the first solve
    const step = firstStep(e.independence);
    return {
      step,
      dueAt: e.at + intervalMs(step),
      firstSolvedAt: e.at,
      lastAt: e.at,
      lastResult: null,
      bestMs: e.proven ? e.activeMs : null,
      retired: false,
      history: [],
    };
  }

  let result: ReviewResult;
  let proven: boolean;
  let bestMs = state.bestMs;
  if (e.kind === "solve") {
    if (e.proven && e.activeMs !== null) bestMs = Math.min(bestMs ?? Infinity, e.activeMs);
    // Re-solving soon after the last one (same evening, resubmits) is practice, not recall.
    if (e.at < state.lastAt + intervalMs(state.step) * EARLY_SHARE) return { ...state, bestMs };
    result = gradeSolve(e.independence, e.proven ? e.activeMs : null, state.bestMs);
    proven = e.proven;
  } else {
    result = MANUAL_RESULT[e.rating];
    proven = false;
  }

  const step = nextStep(state.step, result, proven);
  return {
    ...state,
    step,
    dueAt: e.at + intervalMs(step),
    lastAt: e.at,
    lastResult: result,
    bestMs,
    history: [
      ...state.history,
      { at: e.at, result, proven, manual: e.kind === "manual", step },
    ].slice(-HISTORY_KEEP),
  };
}

export function foldEvents(events: ReviewEvent[]): ReviewState | null {
  return [...events].sort((a, b) => a.at - b.at).reduce(applyEvent, null);
}

/**
 * Solve events for one problem. Each extension session that ended solved is a
 * proven solve; an Accepted submission with no session nearby (synced from a
 * platform) is an unproven one.
 */
export function solveEvents(
  acceptedAt: number[],
  sessions: { at: number; independence: Independence | null; activeMs: number }[],
): ReviewEvent[] {
  const events: ReviewEvent[] = sessions.map((s) => ({
    kind: "solve",
    at: s.at,
    proven: true,
    independence: s.independence,
    activeMs: s.activeMs,
  }));
  for (const at of acceptedAt) {
    if (sessions.some((s) => Math.abs(s.at - at) < SAME_SOLVE_MS)) continue;
    events.push({ kind: "solve", at, proven: false, independence: null, activeMs: null });
  }
  return events;
}

// ---------------------------------------------------------------- the queue

export type QueueItem = {
  problemId: string;
  state: ReviewState;
  difficulty: Difficulty | null;
  /** Mastery (0–100) of the problem's weakest topic, if it has one. */
  weakestMastery: number | null;
};

const DIFF_WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 1.5, hard: 2 };

/** Overdue × difficulty × weak topic (PLAN.md §6.2). Higher goes first. */
export function priority(item: QueueItem, now: number): number {
  const overdueDays = Math.max(0, (now - item.state.dueAt) / DAY_MS);
  const diff = item.difficulty ? DIFF_WEIGHT[item.difficulty] : 1.2;
  const weak = 1 + (100 - (item.weakestMastery ?? 50)) / 100;
  return (1 + overdueDays) * diff * weak;
}

export type Queue<T extends QueueItem> = {
  /** Reviews for today, at most cap minus what was already reviewed today. */
  today: T[];
  /** Due but over today's cap. */
  backlog: number;
  /** Reviews coming due in each of the next 14 days (index 0 = tomorrow). */
  upcoming: number[];
};

export function buildQueue<T extends QueueItem>(
  items: T[],
  opts: { now: number; endOfToday: number; cap: number; reviewedToday: number },
): Queue<T> {
  const live = items.filter((i) => !i.state.retired);
  const due = live
    .filter((i) => i.state.dueAt <= opts.endOfToday)
    .sort((a, b) => priority(b, opts.now) - priority(a, opts.now));
  const room = Math.max(0, opts.cap - opts.reviewedToday);
  const upcoming = Array.from({ length: 14 }, () => 0);
  for (const i of live) {
    const day = Math.ceil((i.state.dueAt - opts.endOfToday) / DAY_MS) - 1;
    if (i.state.dueAt > opts.endOfToday && day < 14) upcoming[day]!++;
  }
  return { today: due.slice(0, room), backlog: Math.max(0, due.length - room), upcoming };
}

/** Graded reviews that happened at or after `since`. */
export function reviewsSince(states: ReviewState[], since: number): number {
  return states.reduce((n, s) => n + s.history.filter((h) => h.at >= since).length, 0);
}

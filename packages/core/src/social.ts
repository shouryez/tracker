// Leaderboards (Phase 5). Boards rank this week's consistency by default so a
// newcomer can top them; all-time totals would only ever reward seniors.

export type WeekActivity = {
  /** Days this week with any submission or timed session (0–7). */
  activeDays: number;
  /** Re-solves of earlier problems plus self-graded revisions. */
  reviews: number;
  focusMs: number;
  /** Distinct problems accepted this week. */
  solved: number;
};

/** Each part is capped so no single habit (e.g. farming easies) can win alone. */
export const SCORE_PARTS = {
  activeDays: { per: 10, cap: 7 },
  reviews: { per: 2, cap: 15 },
  focusHours: { per: 3, cap: 10 },
  solved: { per: 1, cap: 20 },
} as const;

export const MAX_SCORE =
  SCORE_PARTS.activeDays.per * SCORE_PARTS.activeDays.cap +
  SCORE_PARTS.reviews.per * SCORE_PARTS.reviews.cap +
  SCORE_PARTS.focusHours.per * SCORE_PARTS.focusHours.cap +
  SCORE_PARTS.solved.per * SCORE_PARTS.solved.cap;

/** Weekly consistency score, 0–150. */
export function consistencyScore(a: WeekActivity): number {
  const part = (v: number, p: { per: number; cap: number }) =>
    p.per * Math.min(Math.max(0, v), p.cap);
  return Math.round(
    part(a.activeDays, SCORE_PARTS.activeDays) +
      part(a.reviews, SCORE_PARTS.reviews) +
      part(a.focusMs / 3_600_000, SCORE_PARTS.focusHours) +
      part(a.solved, SCORE_PARTS.solved),
  );
}

/** Sorts by value (highest first) and assigns ranks; equal values share a rank (1, 2, 2, 4). */
export function rankBy<T>(rows: T[], value: (row: T) => number): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => value(b) - value(a));
  let rank = 0;
  return sorted.map((row, i) => {
    if (i === 0 || value(row) !== value(sorted[i - 1]!)) rank = i + 1;
    return { ...row, rank };
  });
}

// ---------------------------------------------------------------- streaks

const DAY_MS = 86_400_000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Every YYYY-MM-DD in the given inclusive date ranges. */
export function frozenDays(ranges: { start: string; end: string }[]): Set<string> {
  const out = new Set<string>();
  for (const r of ranges) {
    for (
      let t = Date.parse(`${r.start}T00:00:00Z`);
      t <= Date.parse(`${r.end}T00:00:00Z`);
      t += DAY_MS
    ) {
      out.add(dayKey(t));
    }
  }
  return out;
}

/**
 * Consecutive active days ending today (or yesterday, if today has nothing yet).
 * Frozen days are skipped: they don't break the streak and don't add to it.
 */
export function streakWithFreezes(
  activeDays: ReadonlySet<string>,
  frozen: ReadonlySet<string>,
  todayMs: number,
): number {
  let cursor = todayMs;
  if (!activeDays.has(dayKey(cursor))) cursor -= DAY_MS;
  let streak = 0;
  // A year of look-back is plenty and guarantees the loop ends.
  for (let i = 0; i < 400; i++, cursor -= DAY_MS) {
    const key = dayKey(cursor);
    if (activeDays.has(key)) streak++;
    else if (!frozen.has(key)) break;
  }
  return streak;
}

export const FREEZE_MAX_DAYS = 14;
export const FREEZE_MAX_UPCOMING = 2;

/** Why a freeze can't be added, or null if it can. Dates are YYYY-MM-DD; today is the user's local date. */
export function freezeProblem(
  start: string,
  end: string,
  today: string,
  existing: { start: string; end: string }[],
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    return "Pick both dates.";
  if (start < today) return "A freeze can't start in the past.";
  if (end < start) return "The end date is before the start date.";
  const days = (Date.parse(end) - Date.parse(start)) / DAY_MS + 1;
  if (days > FREEZE_MAX_DAYS) return `A freeze can be at most ${FREEZE_MAX_DAYS} days.`;
  const upcoming = existing.filter((f) => f.end >= today);
  if (upcoming.length >= FREEZE_MAX_UPCOMING) {
    return `You can have ${FREEZE_MAX_UPCOMING} freezes planned at a time.`;
  }
  if (upcoming.some((f) => f.start <= end && start <= f.end))
    return "That overlaps another freeze.";
  return null;
}

import type { PlatformSnapshot, SolvedCounts, TopicCount } from "@upsolve/adapters";
import { streakWithFreezes } from "@upsolve/core";

const DAY_MS = 86_400_000;

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Adds per-day counts from several calendars together. */
export function mergeCalendars(calendars: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const cal of calendars) {
    for (const [day, n] of Object.entries(cal)) out[day] = (out[day] ?? 0) + n;
  }
  return out;
}

/**
 * Consecutive active days ending today. If today has no activity yet the
 * streak is still alive, so we count back from yesterday. Frozen days (exam
 * weeks) are skipped: they neither break nor extend the streak.
 */
export function currentStreak(
  calendar: Record<string, number>,
  today: Date,
  frozen: ReadonlySet<string> = new Set(),
): number {
  const active = new Set(Object.keys(calendar).filter((d) => (calendar[d] ?? 0) > 0));
  return streakWithFreezes(active, frozen, today.getTime());
}

export function activeDays(calendar: Record<string, number>, today: Date, days = 365): number {
  let n = 0;
  for (let i = 0; i < days; i++) if (calendar[dayKey(new Date(today.getTime() - i * DAY_MS))]) n++;
  return n;
}

/** Activity level 0–4 per day for the last `days` days, oldest first (DESIGN.md §8). */
export function heatmapLevels(
  calendar: Record<string, number>,
  today: Date,
  days: number,
): number[] {
  const levels: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const n = calendar[dayKey(new Date(today.getTime() - i * DAY_MS))] ?? 0;
    levels.push(n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  }
  return levels;
}

export function sumSolved(snapshots: PlatformSnapshot[]): SolvedCounts {
  const total: SolvedCounts = { total: 0, easy: 0, medium: 0, hard: 0, unknown: 0 };
  for (const s of snapshots) {
    for (const k of Object.keys(total) as (keyof SolvedCounts)[]) total[k] += s.solved[k];
  }
  return total;
}

export function topTopics(
  snapshots: PlatformSnapshot[],
  limit = 8,
): (TopicCount & { slug: string })[] {
  const merged: Record<string, TopicCount> = {};
  for (const s of snapshots) {
    for (const [slug, t] of Object.entries(s.topics)) {
      const existing = merged[slug];
      if (existing) existing.solved += t.solved;
      else merged[slug] = { ...t };
    }
  }
  return Object.entries(merged)
    .map(([slug, t]) => ({ slug, ...t }))
    .sort((a, b) => b.solved - a.solved)
    .slice(0, limit);
}

// DsaKaro

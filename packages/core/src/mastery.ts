// Topic mastery, 0–100 (PLAN.md §6.3). Every input is shown next to the score
// in the UI so it never feels like a black box.
import type { Difficulty, Independence } from "./srs.ts";
import { TOPICS, topicsOf, type TopicId } from "./topics.ts";

const DIFF_WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
/** Unknown difficulty (e.g. unrated problems) counts like an easy. */
const UNKNOWN_DIFF_WEIGHT = 1;
const INDEPENDENCE_WEIGHT: Record<Independence, number> = { solo: 1, hint: 0.6, solution: 0.3 };
/** Synced solves without a timed session: we don't know how they were solved. */
const UNKNOWN_INDEPENDENCE_WEIGHT = 0.7;
const HALF_LIFE_DAYS = 45;
/** Old solves still count for something; knowledge doesn't vanish. */
const RETENTION_FLOOR = 0.25;
/** Typical solve times used for the speed factor. */
const REFERENCE_MS: Record<Difficulty, number> = {
  easy: 15 * 60_000,
  medium: 30 * 60_000,
  hard: 50 * 60_000,
};
/** 100 = this share of the topic's weighted problems across all curated sheets. */
const TARGET_SHARE = 0.5;
const MIN_TARGET = 10;
/** Broad tags (arrays, strings) sit on most sheet problems; ~30 fresh solo mediums is plenty. */
const MAX_TARGET = 60;
const DAY_MS = 86_400_000;

export type MasteryProblem = {
  difficulty: Difficulty | null;
  tags: readonly string[];
  /** Best known independence across solves; null when only synced from a platform. */
  independence: Independence | null;
  /** Latest Accepted solve or passed review. */
  lastSuccessAt: number;
  /** Fastest timed solve, if the extension saw one. */
  bestMs: number | null;
};

export type TopicMastery = {
  topic: TopicId;
  label: string;
  score: number;
  solved: number;
  /** Share solved solo among solves where we know how (null = none known). */
  soloRate: number | null;
  medianMs: number | null;
  points: number;
  target: number;
};

const diffWeight = (d: Difficulty | null) => (d ? DIFF_WEIGHT[d] : UNKNOWN_DIFF_WEIGHT);

export function retention(lastSuccessAt: number, now: number): number {
  const days = Math.max(0, (now - lastSuccessAt) / DAY_MS);
  return Math.max(RETENTION_FLOOR, 0.5 ** (days / HALF_LIFE_DAYS));
}

export function speed(difficulty: Difficulty | null, bestMs: number | null): number {
  if (!difficulty || !bestMs || bestMs <= 0) return 1;
  return Math.min(1.2, Math.max(0.7, REFERENCE_MS[difficulty] / bestMs));
}

export function problemPoints(p: MasteryProblem, now: number): number {
  const independence = p.independence
    ? INDEPENDENCE_WEIGHT[p.independence]
    : UNKNOWN_INDEPENDENCE_WEIGHT;
  return (
    diffWeight(p.difficulty) *
    independence *
    retention(p.lastSuccessAt, now) *
    speed(p.difficulty, p.bestMs)
  );
}

/** Points needed for 100 in each topic, from the problems in the curated sheets. */
export function topicTargets(
  sheetProblems: { difficulty: Difficulty | null; tags: readonly string[] }[],
): Record<TopicId, number> {
  const sums = Object.fromEntries(TOPICS.map((t) => [t.id, 0])) as Record<TopicId, number>;
  for (const p of sheetProblems) {
    for (const t of topicsOf(p.tags)) sums[t] += diffWeight(p.difficulty);
  }
  for (const t of TOPICS)
    sums[t.id] = Math.min(MAX_TARGET, Math.max(MIN_TARGET, sums[t.id] * TARGET_SHARE));
  return sums;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

/** Mastery for every topic, in TOPICS order. */
export function topicMastery(
  solved: MasteryProblem[],
  targets: Record<TopicId, number>,
  now: number,
): TopicMastery[] {
  const byTopic = new Map<TopicId, MasteryProblem[]>();
  for (const p of solved) {
    for (const t of topicsOf(p.tags)) byTopic.set(t, [...(byTopic.get(t) ?? []), p]);
  }
  return TOPICS.map(({ id, label }) => {
    const list = byTopic.get(id) ?? [];
    const points = list.reduce((n, p) => n + problemPoints(p, now), 0);
    const known = list.filter((p) => p.independence !== null);
    return {
      topic: id,
      label,
      score: Math.round(100 * Math.min(1, points / targets[id])),
      solved: list.length,
      soloRate: known.length
        ? known.filter((p) => p.independence === "solo").length / known.length
        : null,
      medianMs: median(list.flatMap((p) => (p.bestMs ? [p.bestMs] : []))),
      points: Math.round(points * 10) / 10,
      target: Math.round(targets[id]),
    };
  });
}

/** The weakest topic's score among a problem's topics, or null if it has none. */
export function weakestScore(tags: readonly string[], mastery: TopicMastery[]): number | null {
  const scores = topicsOf(tags).map((t) => mastery.find((m) => m.topic === t)?.score ?? 0);
  return scores.length ? Math.min(...scores) : null;
}

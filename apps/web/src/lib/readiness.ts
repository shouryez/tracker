import type { TopicId, TopicMastery } from "@upsolve/core";

/**
 * Interview readiness (FEATURES-PLAN F2): one explainable 0–100. Five parts, each with its
 * arithmetic on show, plus the two cheapest next points. Pure: everything is derived by the
 * caller from data we already have; nothing is stored.
 */

/** The ten topics interviews actually lean on. */
export const CORE_TOPICS: TopicId[] = [
  "arrays",
  "strings",
  "hashing",
  "two-pointers",
  "binary-search",
  "linked-list",
  "stack-queue",
  "trees",
  "graphs",
  "dp",
];

export type ReadinessInput = {
  mastery: TopicMastery[];
  /** Current streak (days). */
  streak: number;
  /** Days with any activity in the last 28. */
  activeDays28: number;
  /** Problems on the ladder (not retired), and how many of them are ≥1 day overdue. */
  ladder: { active: number; overdue: number };
  /** Review pass rate over the last 30 days, or null with no reviews. */
  passRate30: number | null;
  /** Your median medium solve time (ms), or null with no timed mediums. */
  medianMediumMs: number | null;
  /** Difficulty mix of your last 50 first-solves. */
  last50: { medium: number; hard: number; total: number };
};

export type ReadinessPart = {
  id: "coverage" | "revision" | "consistency" | "speed" | "mix";
  label: string;
  pts: number;
  max: number;
  detail: string;
};

export type Readiness = {
  score: number;
  parts: ReadinessPart[];
  /** The cheapest concrete moves, best first. */
  next: { move: string; gain: number }[];
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

function coveragePts(mastery: TopicMastery[]) {
  const by = new Map(mastery.map((m) => [m.topic, m.score]));
  const mean = CORE_TOPICS.reduce((n, t) => n + (by.get(t) ?? 0), 0) / CORE_TOPICS.length;
  return { pts: (mean / 100) * 40, mean };
}

function revisionPts(i: ReadinessInput) {
  if (i.ladder.active === 0) return { pts: 0, overdueShare: 0 };
  const overdueShare = clamp(i.ladder.overdue / i.ladder.active, 0, 1);
  const pass = i.passRate30 ?? 0.6; // no reviews yet: benefit of the doubt, not full marks
  return { pts: pass * (1 - overdueShare) * 20, overdueShare };
}

function speedPts(ms: number | null) {
  if (ms === null) return 0;
  const min = ms / 60_000;
  // 18 min or faster = full marks; 60+ = 2. Linear in between.
  return clamp(15 - ((min - 18) / (60 - 18)) * 13, 2, 15);
}

export function readiness(i: ReadinessInput): Readiness {
  const cov = coveragePts(i.mastery);
  const rev = revisionPts(i);
  const consistency = (clamp(i.activeDays28, 0, 20) / 20) * 12 + (clamp(i.streak, 0, 14) / 14) * 3;
  const speed = speedPts(i.medianMediumMs);
  const mixShare = i.last50.total ? (i.last50.medium + i.last50.hard) / i.last50.total : 0;
  const mix = clamp(mixShare * 12.5, 0, 10);

  const parts: ReadinessPart[] = [
    {
      id: "coverage",
      label: "Topic coverage",
      pts: r1(cov.pts),
      max: 40,
      detail: `mean mastery ${Math.round(cov.mean)}/100 across the ${CORE_TOPICS.length} core topics`,
    },
    {
      id: "revision",
      label: "Revision health",
      pts: r1(rev.pts),
      max: 20,
      detail:
        i.ladder.active === 0
          ? "nothing on the ladder yet — solve, then prove it again"
          : `${i.passRate30 === null ? "no reviews in 30 days" : `${Math.round(i.passRate30 * 100)}% passed`} · ${Math.round(rev.overdueShare * 100)}% of the ladder overdue`,
    },
    {
      id: "consistency",
      label: "Consistency",
      pts: r1(consistency),
      max: 15,
      detail: `${i.activeDays28} of the last 28 days active · ${i.streak}-day streak`,
    },
    {
      id: "speed",
      label: "Speed on mediums",
      pts: r1(speed),
      max: 15,
      detail:
        i.medianMediumMs === null
          ? "no timed mediums yet — solve with the extension on"
          : `your median medium: ${Math.round(i.medianMediumMs / 60_000)} min (18 min = full marks)`,
    },
    {
      id: "mix",
      label: "Difficulty mix",
      pts: r1(mix),
      max: 10,
      detail: `${Math.round(mixShare * 100)}% of your last ${i.last50.total || 0} solves were medium or hard`,
    },
  ];
  const score = Math.round(
    clamp(
      parts.reduce((n, p) => n + p.pts, 0),
      0,
      100,
    ),
  );

  // The cheapest next points: recompute each part under one concrete move.
  const next: { move: string; gain: number }[] = [];
  if (i.ladder.overdue > 0) {
    const healed = revisionPts({ ...i, ladder: { ...i.ladder, overdue: 0 } }).pts - rev.pts;
    if (healed >= 0.5)
      next.push({
        move: `Clear ${i.ladder.overdue} overdue revision${i.ladder.overdue === 1 ? "" : "s"}`,
        gain: Math.round(healed),
      });
  }
  const weakest = [...i.mastery]
    .filter((m) => CORE_TOPICS.includes(m.topic))
    .sort((a, b) => a.score - b.score)[0];
  const missing = CORE_TOPICS.find((t) => !i.mastery.some((m) => m.topic === t));
  const target = missing ?? weakest?.topic;
  if (target) {
    // +15 mastery on one core topic ≈ +15/10/100*40 points of coverage.
    // +15 mastery on one of ten core topics moves coverage by 15/10 × 0.4 ≈ 1 point.
    next.push({
      move: `Push ${i.mastery.find((m) => m.topic === target)?.label ?? target} up 15 mastery (2–3 solo solves)`,
      gain: Math.max(1, Math.round((15 / CORE_TOPICS.length) * 0.4)),
    });
  }
  if (i.activeDays28 < 20)
    next.push({ move: "Show up today (any one problem)", gain: Math.max(1, Math.round(12 / 20)) });
  if (i.medianMediumMs === null)
    next.push({ move: "Time three mediums with the extension", gain: 4 });
  next.sort((a, b) => b.gain - a.gain);
  return { score, parts, next: next.slice(0, 2) };
}

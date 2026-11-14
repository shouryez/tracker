import { sql } from "drizzle-orm";
import { frozenDays } from "@upsolve/core";
import type { AccountView } from "@/lib/data";
import { buildStats, getAccounts } from "@/lib/data";
import { db } from "@/lib/db";
import { getStreakFreezes } from "@/lib/social-data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { getSheetSummaries } from "@/lib/sheets-data";

/**
 * Badges (FRONTEND-PLAN §9.1, FINAL-FEATURES A6), all worked out from data we already store
 * (no badge table). Milestone ladders (problems solved, streaks, graduations) get one medal
 * per tier, so the row reads as a ladder; the rest are one-off collectible tiles. Every
 * badge carries a short visible line: how to earn it, or what you did.
 */
export type BadgeTone = "ember" | "mint" | "sky" | "sand" | "rose";
export type BadgeIcon =
  | "flame"
  | "check"
  | "graduate"
  | "book"
  | "target"
  | "trophy"
  | "layers"
  | "rewind"
  | "moon"
  | "sun"
  | "brain";
export type BadgeMetal = "bronze" | "silver" | "gold" | "holo";
export type BadgeFamily = "solved" | "streak" | "graduated";

export type Badge = {
  id: string;
  name: string;
  /** One full sentence: what it's for and where you stand (tooltip, screen readers). */
  hint: string;
  /** Short, always shown: how to earn it. */
  how: string;
  /** Short, shown once earned: what you did. */
  did?: string;
  icon: BadgeIcon;
  tone: BadgeTone;
  earned: boolean;
  /** When it was earned, when stored history can tell. */
  earnedAt?: number;
  /** Progress towards earning it. */
  progress?: { value: number; goal: number };
  /** Milestone ladders: one medal per tier with `mark` in the centre. */
  family?: BadgeFamily;
  mark?: string;
  metal?: BadgeMetal;
};

export const FAMILY_LABEL: Record<BadgeFamily, string> = {
  solved: "Problems solved",
  streak: "Streaks",
  graduated: "Graduated from revision",
};

export type BadgeInput = {
  /** Activity level per day, oldest first (up to a year), the last entry being today. */
  days: number[];
  solved: number;
  /** First Accepted of each distinct problem we hold, oldest first (dates milestones). */
  solvedDates?: number[];
  /** Today, to date streak milestones. */
  now?: number;
  platformsSolved: string[];
  retired: number;
  sheetsFinished: number;
  topicsMastered: string[];
  contests: number;
  nightSolves: number;
  earlySolves: number;
  bestRecallRun: number;
};

/** Longest run of active days, and the day index where each run length was first reached. */
function runs(days: number[]) {
  let best = 0;
  let run = 0;
  const reachedAt: number[] = [];
  days.forEach((d, i) => {
    run = d > 0 ? run + 1 : 0;
    if (run > best) {
      best = run;
      reachedAt[run] = i;
    }
  });
  return { best, reachedAt };
}

/** Came back after a week or more off, and kept going for 3 days. */
function cameBack(days: number[]) {
  let gap = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i]! > 0) {
      if (gap >= 7 && days.slice(i, i + 3).length === 3 && days.slice(i, i + 3).every((d) => d > 0))
        return true;
      gap = 0;
    } else gap++;
  }
  return false;
}

type Tier = { at: number; metal: BadgeMetal };

const SOLVED_TIERS: Tier[] = [
  { at: 50, metal: "bronze" },
  { at: 100, metal: "bronze" },
  { at: 150, metal: "silver" },
  { at: 200, metal: "silver" },
  { at: 250, metal: "gold" },
  { at: 300, metal: "gold" },
  { at: 400, metal: "gold" },
  { at: 500, metal: "gold" },
  { at: 750, metal: "holo" },
  { at: 1000, metal: "holo" },
];
const STREAK_TIERS: Tier[] = [
  { at: 7, metal: "bronze" },
  { at: 30, metal: "silver" },
  { at: 60, metal: "gold" },
  { at: 100, metal: "gold" },
  { at: 365, metal: "holo" },
];
const GRADUATED_TIERS: Tier[] = [
  { at: 1, metal: "bronze" },
  { at: 10, metal: "silver" },
  { at: 25, metal: "gold" },
  { at: 50, metal: "holo" },
];

/** One medal per tier of a milestone ladder. */
function ladder(
  family: BadgeFamily,
  look: { icon: BadgeIcon; tone: BadgeTone },
  value: number,
  tiers: Tier[],
  text: (at: number) => { name: string; how: string; did: string },
  earnedAt?: (at: number) => number | undefined,
): Badge[] {
  return tiers.map((t) => {
    const earned = value >= t.at;
    const { name, how, did } = text(t.at);
    return {
      id: `${family}-${t.at}`,
      name,
      how,
      did: earned ? did : undefined,
      hint: earned ? `${did}.` : `${how}. You're at ${value}, ${t.at - value} to go.`,
      ...look,
      earned,
      earnedAt: earned ? earnedAt?.(t.at) : undefined,
      progress: earned ? undefined : { value, goal: t.at },
      family,
      mark: String(t.at),
      metal: t.metal,
    };
  });
}

function single(b: Omit<Badge, "hint">): Badge {
  const did = b.earned ? b.did : undefined;
  return { ...b, did, hint: `${did ?? b.how}.` };
}

export function deriveBadges(b: BadgeInput): Badge[] {
  const { best: streak, reachedAt } = runs(b.days);
  const today = b.now ?? Date.now();
  const three = ["leetcode", "codeforces", "geeksforgeeks"].filter((p) =>
    b.platformsSolved.includes(p),
  ).length;
  const dates = b.solvedDates ?? [];
  return [
    ...ladder(
      "solved",
      { icon: "check", tone: "mint" },
      b.solved,
      SOLVED_TIERS,
      (n) => ({
        name: `${n} solved`,
        how: `Solve ${n} problems, any platform`,
        did: `Solved ${n} problems`,
      }),
      (n) => dates[n - 1],
    ),
    ...ladder(
      "streak",
      { icon: "flame", tone: "ember" },
      streak,
      STREAK_TIERS,
      (n) => ({
        name: `${n}-day streak`,
        how: `Practise ${n} days in a row`,
        did: `${n} days in a row`,
      }),
      (n) => {
        const i = reachedAt[n];
        return i === undefined ? undefined : today - (b.days.length - 1 - i) * 86_400_000;
      },
    ),
    ...ladder("graduated", { icon: "graduate", tone: "sky" }, b.retired, GRADUATED_TIERS, (n) =>
      n === 1
        ? {
            name: "First graduate",
            how: "Take one problem to the top of the revision ladder",
            did: "Graduated a problem from revision",
          }
        : {
            name: `${n} graduated`,
            how: `Graduate ${n} problems from revision`,
            did: `Graduated ${n} problems`,
          },
    ),
    single({
      id: "sheet",
      name: "Sheet Finisher",
      icon: "book",
      tone: "mint",
      earned: b.sheetsFinished > 0,
      how: "Finish every problem on a sheet you follow",
      did: `Finished ${b.sheetsFinished} sheet${b.sheetsFinished === 1 ? "" : "s"}`,
    }),
    single({
      id: "master",
      name: "Topic Master",
      icon: "target",
      tone: "sand",
      earned: b.topicsMastered.length > 0,
      how: "Reach 80% mastery in any topic",
      did: `Mastered ${b.topicsMastered.slice(0, 2).join(", ")}${b.topicsMastered.length > 2 ? ` +${b.topicsMastered.length - 2}` : ""}`,
    }),
    single({
      id: "contests",
      name: "Contest Regular",
      icon: "trophy",
      tone: "ember",
      earned: b.contests >= 10,
      how: "Take part in 10 rated contests",
      did: `${b.contests} rated contests`,
      progress: b.contests >= 10 ? undefined : { value: b.contests, goal: 10 },
    }),
    single({
      id: "platforms",
      name: "Three Platforms",
      icon: "layers",
      tone: "sky",
      earned: three === 3,
      how: "Solve on LeetCode, Codeforces and GFG",
      did: "Solved on LeetCode, Codeforces and GFG",
      progress: three === 3 ? undefined : { value: three, goal: 3 },
    }),
    single({
      id: "perfect",
      name: "Perfect Five",
      icon: "brain",
      tone: "mint",
      earned: b.bestRecallRun >= 5,
      how: "Get five Recall answers right in a row",
      did: "Five right in a row in Recall",
      progress: b.bestRecallRun >= 5 ? undefined : { value: b.bestRecallRun, goal: 5 },
    }),
    single({
      id: "comeback",
      name: "Comeback",
      icon: "rewind",
      tone: "rose",
      earned: cameBack(b.days),
      how: "Come back after a week off, then keep going for three days",
      did: "Came back after a week off",
    }),
    single({
      id: "night",
      name: "Night Owl",
      icon: "moon",
      tone: "sky",
      earned: b.nightSolves >= 10,
      how: "Ten solves between midnight and 4 am",
      did: `${b.nightSolves} solves after midnight`,
      progress: b.nightSolves >= 10 ? undefined : { value: b.nightSolves, goal: 10 },
    }),
    single({
      id: "early",
      name: "Early Bird",
      icon: "sun",
      tone: "sand",
      earned: b.earlySolves >= 10,
      how: "Ten solves between 5 and 8 am",
      did: `${b.earlySolves} solves before 8 am`,
      progress: b.earlySolves >= 10 ? undefined : { value: b.earlySolves, goal: 10 },
    }),
  ];
}

/** The locked badge closest to being earned, by share of its goal. */
export function nextBadge(badges: Badge[]): Badge | null {
  let best: Badge | null = null;
  let bestShare = 0;
  for (const b of badges) {
    if (b.earned || !b.progress || b.progress.value <= 0) continue;
    const share = b.progress.value / Math.max(1, b.progress.goal);
    if (share > bestShare) {
      best = b;
      bestShare = share;
    }
  }
  return best;
}

/**
 * Everything badges need beyond the stats a page already has: revision, sheets, contests,
 * Recall and solve times. Small queries; the heavy inputs (learning, sheets) are cached.
 */
export async function getBadges(
  userId: string,
  opts: { days: number[]; solved: number; platformsSolved: string[]; tz: string; now: number },
): Promise<Badge[]> {
  const [learning, targets, sheets, counts, recall, firsts] = await Promise.all([
    getLearning(userId),
    getTopicTargets(),
    getSheetSummaries(userId),
    db().execute(sql`
      select
        (select count(*) from contest_results where user_id = ${userId})::int as contests,
        (select count(*) from practice_sessions
          where user_id = ${userId} and outcome = 'solved' and ended_at is not null
            and extract(hour from ended_at at time zone ${opts.tz}) < 4)::int as night,
        (select count(*) from practice_sessions
          where user_id = ${userId} and outcome = 'solved' and ended_at is not null
            and extract(hour from ended_at at time zone ${opts.tz}) between 5 and 7)::int as early`),
    db().execute(sql`
      select correct from recall_answers where user_id = ${userId} order by at limit 2000`),
    // First Accepted of each problem, oldest first, so a milestone can say when you hit it.
    db().execute(sql`
      select (extract(epoch from min(s.submitted_at)) * 1000)::float8 as at
      from submissions s join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id = ${userId} and s.verdict = 'AC'
      group by coalesce(pp.problem_id, pp.id)
      order by 1
      limit 1000`),
  ]);
  const c = (counts as unknown as { contests: number; night: number; early: number }[])[0];
  let run = 0;
  let bestRecallRun = 0;
  for (const r of recall as unknown as { correct: boolean }[]) {
    run = r.correct ? run + 1 : 0;
    bestRecallRun = Math.max(bestRecallRun, run);
  }
  return deriveBadges({
    days: opts.days,
    solved: opts.solved,
    solvedDates: (firsts as unknown as { at: number }[]).map((r) => Number(r.at)),
    now: opts.now,
    platformsSolved: opts.platformsSolved,
    retired: learning.filter((p) => p.state.retired).length,
    sheetsFinished: sheets.filter((s) => s.following && s.total > 0 && s.done >= s.total).length,
    topicsMastered: masteryOf(learning, targets, opts.now)
      .filter((m) => m.score >= 80)
      .map((m) => m.label),
    contests: c?.contests ?? 0,
    nightSolves: c?.night ?? 0,
    earlySolves: c?.early ?? 0,
    bestRecallRun,
  });
}

/** Platforms where an account has at least one solve. */
export function platformsWithSolves(accounts: AccountView[]) {
  return accounts.filter((a) => (a.snapshot?.solved.total ?? 0) > 0).map((a) => a.platform);
}

/** Badges for a page that doesn't already have the user's stats. */
export async function loadBadges(userId: string, tz: string, now: number) {
  const [accounts, freezes] = await Promise.all([getAccounts(userId), getStreakFreezes(userId)]);
  const stats = buildStats(accounts, new Date(now), frozenDays(freezes));
  return getBadges(userId, {
    days: stats.heatmap52,
    solved: stats.solved.total,
    platformsSolved: platformsWithSolves(accounts),
    tz,
    now,
  });
}

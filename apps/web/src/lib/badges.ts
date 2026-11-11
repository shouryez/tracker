import { sql } from "drizzle-orm";
import { frozenDays } from "@upsolve/core";
import type { AccountView } from "@/lib/data";
import { buildStats, getAccounts } from "@/lib/data";
import { db } from "@/lib/db";
import { getStreakFreezes } from "@/lib/social-data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { getSheetSummaries } from "@/lib/sheets-data";

/**
 * Badges (FRONTEND-PLAN §9.1): collectible holo tiles for real milestones, all worked out
 * from data we already store (no badge table). Families have tiers; a tile shows the best
 * tier you've reached and how far the next one is.
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

export type Badge = {
  id: string;
  name: string;
  /** What it's for, or how to earn it. */
  hint: string;
  icon: BadgeIcon;
  tone: BadgeTone;
  earned: boolean;
  /** Progress to the next tier (or to earning it). */
  progress?: { value: number; goal: number };
};

export type BadgeInput = {
  /** Activity level per day, oldest first (up to a year). Above 0 = active. */
  days: number[];
  solved: number;
  platformsSolved: string[];
  retired: number;
  sheetsFinished: number;
  topicsMastered: string[];
  contests: number;
  nightSolves: number;
  earlySolves: number;
  bestRecallRun: number;
};

function longestRun(days: number[]) {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
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

function tiered(
  base: Omit<Badge, "name" | "earned" | "progress" | "hint">,
  value: number,
  tiers: { at: number; name: string }[],
  unit: string,
): Badge {
  const reached = tiers.filter((t) => value >= t.at);
  const top = reached.at(-1);
  const next = tiers[reached.length];
  return {
    ...base,
    name: top?.name ?? tiers[0]!.name,
    earned: Boolean(top),
    hint: next
      ? `${top ? `${top.at} ${unit}. ` : ""}Next: ${next.name} at ${next.at} ${unit}.`
      : `${value} ${unit}. Top tier.`,
    progress: next ? { value, goal: next.at } : undefined,
  };
}

export function deriveBadges(b: BadgeInput): Badge[] {
  const streak = longestRun(b.days);
  const three = ["leetcode", "codeforces", "geeksforgeeks"].filter((p) =>
    b.platformsSolved.includes(p),
  ).length;
  return [
    tiered(
      { id: "streak", icon: "flame", tone: "ember" },
      streak,
      [
        { at: 7, name: "Spark" },
        { at: 30, name: "Flame" },
        { at: 100, name: "Blaze" },
        { at: 365, name: "Eternal" },
      ],
      "day streak",
    ),
    tiered(
      { id: "solved", icon: "check", tone: "mint" },
      b.solved,
      [
        { at: 50, name: "50 Club" },
        { at: 100, name: "100 Club" },
        { at: 250, name: "250 Club" },
        { at: 500, name: "500 Club" },
        { at: 1000, name: "1000 Club" },
      ],
      "solved",
    ),
    tiered(
      { id: "graduated", icon: "graduate", tone: "sky" },
      b.retired,
      [
        { at: 1, name: "First Graduate" },
        { at: 10, name: "Ten Rings" },
        { at: 50, name: "Fifty Rings" },
      ],
      "graduated from revision",
    ),
    {
      id: "sheet",
      name: "Sheet Finisher",
      icon: "book",
      tone: "mint",
      earned: b.sheetsFinished > 0,
      hint: b.sheetsFinished
        ? `Finished ${b.sheetsFinished} sheet${b.sheetsFinished === 1 ? "" : "s"}.`
        : "Finish every problem on a sheet you follow.",
    },
    {
      id: "master",
      name: "Topic Master",
      icon: "target",
      tone: "sand",
      earned: b.topicsMastered.length > 0,
      hint: b.topicsMastered.length
        ? `Mastered ${b.topicsMastered.slice(0, 2).join(", ")}${b.topicsMastered.length > 2 ? ` +${b.topicsMastered.length - 2}` : ""}.`
        : "Reach 80% mastery in any topic.",
    },
    {
      id: "contests",
      name: "Contest Regular",
      icon: "trophy",
      tone: "ember",
      earned: b.contests >= 10,
      hint: b.contests >= 10 ? `${b.contests} rated contests.` : "Take part in 10 rated contests.",
      progress: b.contests >= 10 ? undefined : { value: b.contests, goal: 10 },
    },
    {
      id: "platforms",
      name: "Three Platforms",
      icon: "layers",
      tone: "sky",
      earned: three === 3,
      hint:
        three === 3
          ? "Solved on LeetCode, Codeforces and GFG."
          : "Solve on LeetCode, Codeforces and GFG.",
      progress: three === 3 ? undefined : { value: three, goal: 3 },
    },
    {
      id: "perfect",
      name: "Perfect Five",
      icon: "brain",
      tone: "mint",
      earned: b.bestRecallRun >= 5,
      hint:
        b.bestRecallRun >= 5
          ? "Five right in a row in Recall."
          : "Get five Recall answers right in a row.",
      progress: b.bestRecallRun >= 5 ? undefined : { value: b.bestRecallRun, goal: 5 },
    },
    {
      id: "comeback",
      name: "Comeback",
      icon: "rewind",
      tone: "rose",
      earned: cameBack(b.days),
      hint: "Back after a week off, and kept going for three days.",
    },
    {
      id: "night",
      name: "Night Owl",
      icon: "moon",
      tone: "sky",
      earned: b.nightSolves >= 10,
      hint: "Ten solves between midnight and 4 am.",
      progress: b.nightSolves >= 10 ? undefined : { value: b.nightSolves, goal: 10 },
    },
    {
      id: "early",
      name: "Early Bird",
      icon: "sun",
      tone: "sand",
      earned: b.earlySolves >= 10,
      hint: "Ten solves between 5 and 8 am.",
      progress: b.earlySolves >= 10 ? undefined : { value: b.earlySolves, goal: 10 },
    },
  ];
}

/**
 * Everything badges need beyond the stats a page already has: revision, sheets, contests,
 * Recall and solve times. Small queries; the heavy inputs (learning, sheets) are cached.
 */
export async function getBadges(
  userId: string,
  opts: { days: number[]; solved: number; platformsSolved: string[]; tz: string; now: number },
): Promise<Badge[]> {
  const [learning, targets, sheets, counts, recall] = await Promise.all([
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

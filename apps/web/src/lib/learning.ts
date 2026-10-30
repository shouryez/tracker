import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { Platform } from "@upsolve/adapters";
import {
  buildQueue,
  foldEvents,
  reviewsSince,
  solveEvents,
  topicMastery,
  topicTargets,
  weakestScore,
  type Difficulty,
  type Independence,
  type ReviewEvent,
  type ReviewState,
  type TopicId,
  type TopicMastery,
} from "@upsolve/core";
import { db, userTag } from "@/lib/db";
import { localDay } from "@/lib/time";

// The learning engine's reads: review schedule, topic mastery and suggestions.
// Review state is recomputed from submissions, sessions and manual review logs
// on every read (see @upsolve/core srs), so it can't drift from the history.
// Callers pass a user id resolved from the session, never one from the client.

export type LearningProblem = {
  problemId: string;
  title: string;
  difficulty: Difficulty | null;
  topics: string[];
  /** Where to solve it again: LeetCode when it exists there. */
  url: string;
  platform: Platform;
  state: ReviewState;
  /** Best of the answers given after Accepted; null when never timed. */
  independence: Independence | null;
  lastSuccessAt: number;
};

const INDEPENDENCE_RANK: Record<Independence, number> = { solution: 0, hint: 1, solo: 2 };

export async function getLearning(userId: string): Promise<LearningProblem[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const [solved, sessions, logs] = await Promise.all([
    db().execute(sql`
      select p.id, p.title, p.difficulty, p.topics,
             array_agg((extract(epoch from s.submitted_at) * 1000)::float8) as ac,
             (select pp2.url from platform_problems pp2 where pp2.problem_id = p.id
               order by (pp2.platform = 'leetcode') desc, pp2.created_at limit 1) as url,
             (select pp2.platform from platform_problems pp2 where pp2.problem_id = p.id
               order by (pp2.platform = 'leetcode') desc, pp2.created_at limit 1) as platform
      from submissions s
      join platform_problems pp on pp.id = s.platform_problem_id
      join problems p on p.id = pp.problem_id
      where s.user_id = ${userId} and s.verdict = 'AC'
      group by p.id`),
    db().execute(sql`
      select pp.problem_id,
             (extract(epoch from coalesce(ps.ended_at, ps.started_at)) * 1000)::float8 as at,
             ps.independence, ps.active_ms
      from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${userId} and ps.outcome = 'solved' and pp.problem_id is not null`),
    db().execute(sql`
      select problem_id, action, (extract(epoch from at) * 1000)::float8 as at
      from review_logs where user_id = ${userId}`),
  ]);

  type SessionRow = { at: number; independence: Independence | null; activeMs: number };
  const sessionsBy = new Map<string, SessionRow[]>();
  for (const r of sessions as unknown as {
    problem_id: string;
    at: number;
    independence: Independence | null;
    active_ms: number;
  }[]) {
    const list = sessionsBy.get(r.problem_id) ?? [];
    list.push({ at: r.at, independence: r.independence, activeMs: r.active_ms });
    sessionsBy.set(r.problem_id, list);
  }
  const logsBy = new Map<string, ReviewEvent[]>();
  for (const r of logs as unknown as { problem_id: string; action: string; at: number }[]) {
    const e: ReviewEvent =
      r.action === "retire" || r.action === "restore"
        ? { kind: r.action, at: r.at }
        : { kind: "manual", at: r.at, rating: r.action as "remembered" | "shaky" | "forgot" };
    logsBy.set(r.problem_id, [...(logsBy.get(r.problem_id) ?? []), e]);
  }

  const out: LearningProblem[] = [];
  for (const r of solved as unknown as {
    id: string;
    title: string;
    difficulty: Difficulty | null;
    topics: string[];
    ac: number[];
    url: string;
    platform: Platform;
  }[]) {
    const timed = sessionsBy.get(r.id) ?? [];
    const manual = logsBy.get(r.id) ?? [];
    const state = foldEvents([...solveEvents(r.ac, timed), ...manual]);
    if (!state) continue;
    const independence = timed.reduce<Independence | null>(
      (best, s) =>
        s.independence &&
        (best === null || INDEPENDENCE_RANK[s.independence] > INDEPENDENCE_RANK[best])
          ? s.independence
          : best,
      null,
    );
    const remembered = manual.filter((e) => e.kind === "manual" && e.rating === "remembered");
    out.push({
      problemId: r.id,
      title: r.title,
      difficulty: r.difficulty,
      topics: r.topics,
      url: r.url,
      platform: r.platform,
      state,
      independence,
      lastSuccessAt: Math.max(...r.ac, ...timed.map((s) => s.at), ...remembered.map((e) => e.at)),
    });
  }
  return out;
}

/** Points needed per topic, from every problem in the curated sheets. */
export async function getTopicTargets(): Promise<Record<TopicId, number>> {
  "use cache";
  cacheTag("sheets");
  cacheLife("days");

  const rows = (await db().execute(sql`
    select distinct p.id, p.difficulty, p.topics as tags
    from sheet_items si join problems p on p.id = si.problem_id`)) as unknown as {
    difficulty: Difficulty | null;
    tags: string[];
  }[];
  return topicTargets(rows);
}

export function masteryOf(
  problems: LearningProblem[],
  targets: Record<TopicId, number>,
  now: number,
): TopicMastery[] {
  return topicMastery(
    problems.map((p) => ({
      difficulty: p.difficulty,
      tags: p.topics,
      independence: p.independence,
      lastSuccessAt: p.lastSuccessAt,
      bestMs: p.state.bestMs,
    })),
    targets,
    now,
  );
}

export type QueueEntry = LearningProblem & { weakestMastery: number | null };

export function revisionQueue(
  problems: LearningProblem[],
  mastery: TopicMastery[],
  opts: { tz: string; cap: number; now: number },
) {
  const today = localDay(opts.tz, opts.now);
  const items: QueueEntry[] = problems.map((p) => ({
    ...p,
    weakestMastery: weakestScore(p.topics, mastery),
  }));
  const states = problems.map((p) => p.state);
  const reviewedToday = reviewsSince(states, today.start);
  return {
    ...buildQueue(items, {
      now: opts.now,
      endOfToday: today.end,
      cap: opts.cap,
      reviewedToday,
    }),
    reviewedToday,
    reviewedWeek: reviewsSince(states, today.start - 6 * 86_400_000),
    cap: opts.cap,
  };
}

/** Graded reviews, newest first, with the problem they belong to. */
export function reviewHistory(problems: LearningProblem[], limit = 20) {
  return problems
    .flatMap((p) => p.state.history.map((h) => ({ ...h, problem: p })))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

export type NextCandidate = {
  problemId: string;
  title: string;
  difficulty: Difficulty | null;
  tags: string[];
  url: string | null;
  sheet: string;
};

/**
 * Unsolved problems from the sheets the user follows (all sheets if none), in
 * sheet order, skipping anything they touched in the last 14 days.
 */
export async function getNextCandidates(userId: string): Promise<NextCandidate[]> {
  "use cache";
  cacheTag(userTag(userId), "sheets");
  cacheLife("minutes");

  return (await db().execute(sql`
    with followed as (
      select sheet_id, row_number() over (order by created_at) as rank
      from user_sheets where user_id = ${userId}
    ),
    pool as (
      select sh.id, sh.name, coalesce(f.rank, 1000 + sh.position) as rank
      from sheets sh left join followed f on f.sheet_id = sh.id
      where f.sheet_id is not null or not exists (select 1 from followed)
    ),
    touched as (
      select distinct pp.problem_id from submissions s
      join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id = ${userId}
        and (s.verdict = 'AC' or s.submitted_at > now() - interval '14 days')
        and pp.problem_id is not null
      union
      select pp.problem_id from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${userId} and ps.started_at > now() - interval '14 days'
    )
    select "problemId", title, difficulty, tags, url, sheet from (
      select distinct on (p.id) p.id as "problemId", si.title, p.difficulty, p.topics as tags,
             si.url, pool.name as sheet, pool.rank, si.position
      from sheet_items si
      join pool on pool.id = si.sheet_id
      join problems p on p.id = si.problem_id
      where si.kind = 'practice' and p.id not in (select problem_id from touched)
      order by p.id, pool.rank, si.position
    ) c
    order by rank, position
    limit 500`)) as unknown as NextCandidate[];
}

// DsaKaro

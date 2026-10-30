import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { topicLabel, topicsOf, type Difficulty, type TopicId } from "@upsolve/core";
import { db, userTag } from "@/lib/db";

// Numbers for the Analytics page over a time range. Callers pass a session-resolved user id.

export const RANGES = { "7": 7, "30": 30, "90": 90, all: null } as const;
export type RangeKey = keyof typeof RANGES;

export type Analytics = {
  /** Days in the range; null = all time (see firstActivityAt). */
  rangeDays: number | null;
  firstActivityAt: number | null;
  verdicts: { verdict: string; n: number }[];
  /** Problems first tried in range, where we see every verdict (extension, Codeforces). */
  firstTry: { total: number; ac: number };
  /** Accepted submissions per local hour, 0–23. */
  byHour: number[];
  byDifficulty: {
    difficulty: Difficulty | "unrated";
    activeMs: number;
    solved: number;
    medianMs: number | null;
  }[];
  byTopic: { topic: TopicId; label: string; activeMs: number }[];
  activeDays: number;
  solved: number;
  focusMs: number;
  independence: { solo: number; hint: number; solution: number };
  mistakes: { tag: string; n: number }[];
};

export async function getAnalytics(
  userId: string,
  range: RangeKey,
  tz: string,
): Promise<Analytics> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const days = RANGES[range];
  const since =
    days === null ? sql`'-infinity'::timestamptz` : sql`now() - make_interval(days => ${days})`;

  const [verdicts, firstTry, hours, difficulty, topics, totals, mistakes, firstSeen] =
    await Promise.all([
      db().execute(sql`
      select verdict, count(*)::int as n from submissions
      where user_id = ${userId} and submitted_at >= ${since}
      group by 1 order by 2 desc`),
      db().execute(sql`
      with firsts as (
        select distinct on (pp.problem_id) s.verdict, s.submitted_at
        from submissions s join platform_problems pp on pp.id = s.platform_problem_id
        where s.user_id = ${userId} and pp.problem_id is not null
          and (s.source = 'extension' or s.platform = 'codeforces')
        order by pp.problem_id, s.submitted_at
      )
      select count(*)::int as total, count(*) filter (where verdict = 'AC')::int as ac
      from firsts where submitted_at >= ${since}`),
      db().execute(sql`
      select extract(hour from submitted_at at time zone ${tz})::int as hour, count(*)::int as n
      from submissions
      where user_id = ${userId} and verdict = 'AC' and submitted_at >= ${since}
      group by 1`),
      db().execute(sql`
      select coalesce(p.difficulty::text, 'unrated') as difficulty,
             sum(ps.active_ms)::float8 as "activeMs",
             count(*) filter (where ps.outcome = 'solved')::int as solved,
             (percentile_cont(0.5) within group (order by ps.active_ms)
               filter (where ps.outcome = 'solved'))::float8 as "medianMs"
      from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      left join problems p on p.id = pp.problem_id
      where ps.user_id = ${userId} and ps.started_at >= ${since}
      group by 1`),
      db().execute(sql`
      select coalesce(p.topics, pp.tags) as tags, ps.active_ms as "activeMs"
      from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      left join problems p on p.id = pp.problem_id
      where ps.user_id = ${userId} and ps.started_at >= ${since}`),
      db().execute(sql`
      select
        (select count(*)::int from (
          select (submitted_at at time zone ${tz})::date from submissions
          where user_id = ${userId} and submitted_at >= ${since}
          union
          select (started_at at time zone ${tz})::date from practice_sessions
          where user_id = ${userId} and started_at >= ${since}) d) as "activeDays",
        (select count(distinct pp.problem_id)::int from submissions s
          join platform_problems pp on pp.id = s.platform_problem_id
          where s.user_id = ${userId} and s.verdict = 'AC' and s.submitted_at >= ${since}) as solved,
        (select coalesce(sum(active_ms), 0)::float8 from practice_sessions
          where user_id = ${userId} and started_at >= ${since}) as "focusMs",
        (select count(*)::int from practice_sessions
          where user_id = ${userId} and started_at >= ${since} and independence = 'solo') as solo,
        (select count(*)::int from practice_sessions
          where user_id = ${userId} and started_at >= ${since} and independence = 'hint') as hint,
        (select count(*)::int from practice_sessions
          where user_id = ${userId} and started_at >= ${since} and independence = 'solution') as solution`),
      db().execute(sql`
      select tag, count(*)::int as n
      from practice_sessions, unnest(mistake_tags) as tag
      where user_id = ${userId} and started_at >= ${since}
      group by 1 order by 2 desc`),
      db().execute(sql`
      select (extract(epoch from least(
        (select min(submitted_at) from submissions where user_id = ${userId}),
        (select min(started_at) from practice_sessions where user_id = ${userId})
      )) * 1000)::float8 as at`),
    ]);

  const byHour = Array.from({ length: 24 }, () => 0);
  for (const r of hours as unknown as { hour: number; n: number }[]) byHour[r.hour] = r.n;

  const topicMs = new Map<TopicId, number>();
  for (const r of topics as unknown as { tags: string[]; activeMs: number }[]) {
    for (const t of topicsOf(r.tags)) topicMs.set(t, (topicMs.get(t) ?? 0) + r.activeMs);
  }

  const t = (totals as unknown as Record<string, number>[])[0]!;
  const order = ["easy", "medium", "hard", "unrated"];

  return {
    rangeDays: days,
    firstActivityAt: (firstSeen as unknown as { at: number | null }[])[0]?.at ?? null,
    verdicts: verdicts as unknown as Analytics["verdicts"],
    firstTry: (firstTry as unknown as Analytics["firstTry"][])[0] ?? { total: 0, ac: 0 },
    byHour,
    byDifficulty: (difficulty as unknown as Analytics["byDifficulty"]).sort(
      (a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty),
    ),
    byTopic: [...topicMs]
      .map(([topic, activeMs]) => ({ topic, label: topicLabel(topic), activeMs }))
      .sort((a, b) => b.activeMs - a.activeMs),
    activeDays: t.activeDays ?? 0,
    solved: t.solved ?? 0,
    focusMs: t.focusMs ?? 0,
    independence: { solo: t.solo ?? 0, hint: t.hint ?? 0, solution: t.solution ?? 0 },
    mistakes: mistakes as unknown as Analytics["mistakes"],
  };
}

// DsaKaro

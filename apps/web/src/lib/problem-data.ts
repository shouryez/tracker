import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { Platform } from "@upsolve/adapters";
import type { Difficulty } from "@upsolve/core";
import type { SheetItemLink } from "@upsolve/db";
import { db, userTag } from "@/lib/db";

// One canonical problem as the user sees it: where it lives, every attempt,
// their notes and the sheets it's in. Callers pass a session-resolved user id.

export type ProblemDetail = {
  id: string;
  title: string;
  difficulty: Difficulty | null;
  topics: string[];
  versions: { platform: Platform; url: string; title: string }[];
  sheets: { slug: string; name: string; step: string; links: SheetItemLink[] }[];
  submissions: {
    id: string;
    platform: Platform;
    verdict: "AC" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER";
    language: string | null;
    runtimeMs: number | null;
    source: "api" | "extension";
    at: Date;
  }[];
  sessions: {
    id: string;
    mode: "practice" | "review" | "interview";
    at: Date;
    /** When it ended (or started, while open). */
    endedAt: Date;
    activeMs: number;
    submits: number;
    outcome: "open" | "solved" | "abandoned";
    independence: "solo" | "hint" | "solution" | null;
    note: string | null;
    mistakeTags: string[];
    pattern: string | null;
    takeaway: string | null;
  }[];
  note: { body: string; updatedAt: Date } | null;
  similar: { id: string; title: string; difficulty: Difficulty | null; url: string | null }[];
  /** Explanation videos of this problem watched in the app's player. */
  watches: { at: number; watchedMs: number; title: string }[];
};

export async function getProblemDetail(
  userId: string,
  problemId: string,
): Promise<ProblemDetail | null> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const [problem] = (await db().execute(sql`
    select id, title, difficulty, topics from problems where id = ${problemId}`)) as unknown as {
    id: string;
    title: string;
    difficulty: Difficulty | null;
    topics: string[];
  }[];
  if (!problem) return null;

  const [versions, sheets, submissions, sessions, notes, similar, watches] = await Promise.all([
    db().execute(sql`
      select platform, url, title from platform_problems
      where problem_id = ${problemId}
      order by (platform = 'leetcode') desc, platform`),
    db().execute(sql`
      select sh.slug, sh.name, si.step, si.links
      from sheet_items si join sheets sh on sh.id = si.sheet_id
      where si.problem_id = ${problemId}
      order by sh.position`),
    db().execute(sql`
      select s.id, s.platform, s.verdict, s.language, s.runtime_ms as "runtimeMs", s.source,
             s.submitted_at as at
      from submissions s join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id = ${userId} and pp.problem_id = ${problemId}
      order by s.submitted_at desc limit 200`),
    db().execute(sql`
      select ps.id, ps.mode, ps.started_at as at,
             coalesce(ps.ended_at, ps.started_at) as "endedAt",
             ps.active_ms as "activeMs", ps.submits,
             ps.outcome, ps.independence, ps.note, ps.mistake_tags as "mistakeTags",
             ps.pattern, ps.takeaway
      from practice_sessions ps join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${userId} and pp.problem_id = ${problemId}
      order by ps.started_at desc limit 100`),
    db().execute(sql`
      select body, updated_at as "updatedAt" from problem_notes
      where user_id = ${userId} and problem_id = ${problemId}`),
    // Sheet problems sharing the most tags, same difficulty first, not solved yet.
    db().execute(sql`
      select p.id, p.title, p.difficulty, min(si.url) as url
      from sheet_items si
      join problems p on p.id = si.problem_id
      cross join (select topics, difficulty from problems where id = ${problemId}) me
      where p.id <> ${problemId}
        and p.topics && me.topics
        and not exists (
          select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
          where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = p.id)
      group by p.id, me.topics, me.difficulty
      order by (p.difficulty is not distinct from me.difficulty) desc,
               cardinality(array(select unnest(p.topics) intersect select unnest(me.topics))) desc,
               min(si.position)
      limit 5`),
    db().execute(sql`
      select (extract(epoch from vw.started_at) * 1000)::float8 as at,
             vw.watched_ms as "watchedMs", vw.title
      from video_watches vw
      join sheet_items si on si.sheet_id = vw.sheet_id and si.item_key = vw.item_key
      where vw.user_id = ${userId} and si.problem_id = ${problemId}
      order by vw.started_at desc limit 50`),
  ]);

  const toDate = (v: unknown) => (v instanceof Date ? v : new Date(String(v)));
  return {
    ...problem,
    versions: versions as unknown as ProblemDetail["versions"],
    sheets: sheets as unknown as ProblemDetail["sheets"],
    submissions: (submissions as unknown as ProblemDetail["submissions"]).map((s) => ({
      ...s,
      at: toDate(s.at),
    })),
    sessions: (sessions as unknown as ProblemDetail["sessions"]).map((s) => ({
      ...s,
      at: toDate(s.at),
      endedAt: toDate(s.endedAt),
    })),
    note: (() => {
      const n = (notes as unknown as { body: string; updatedAt: unknown }[])[0];
      return n ? { body: n.body, updatedAt: toDate(n.updatedAt) } : null;
    })(),
    similar: similar as unknown as ProblemDetail["similar"],
    watches: (watches as unknown as ProblemDetail["watches"]).map((w) => ({
      ...w,
      at: Number(w.at),
    })),
  };
}

export type SolveMedian = { medianMs: number; solvers: number };

/**
 * Everyone's median solve time for a problem (FRONTEND-PLAN B2): active time of solved
 * sessions across all users, only when at least 5 people have solved it (so it's never one
 * person's number). Cached for a day per problem.
 */
export async function getSolveMedian(problemId: string): Promise<SolveMedian | null> {
  "use cache";
  cacheTag(`median:${problemId}`);
  cacheLife("days");
  const [row] = (await db().execute(sql`
    select percentile_cont(0.5) within group (order by best)::int as "medianMs",
           count(*)::int as solvers
    from (
      select ps.user_id, min(ps.active_ms) as best
      from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      where pp.problem_id = ${problemId} and ps.outcome = 'solved' and ps.active_ms > 30000
      group by ps.user_id
    ) t`)) as unknown as { medianMs: number | null; solvers: number }[];
  if (!row || row.solvers < 5 || !row.medianMs) return null;
  return { medianMs: row.medianMs, solvers: row.solvers };
}

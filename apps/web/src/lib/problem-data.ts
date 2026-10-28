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

  const [versions, sheets, submissions, sessions, notes, similar] = await Promise.all([
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
      select ps.id, ps.mode, ps.started_at as at, ps.active_ms as "activeMs", ps.submits,
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
    })),
    note: (() => {
      const n = (notes as unknown as { body: string; updatedAt: unknown }[])[0];
      return n ? { body: n.body, updatedAt: toDate(n.updatedAt) } : null;
    })(),
    similar: similar as unknown as ProblemDetail["similar"],
  };
}

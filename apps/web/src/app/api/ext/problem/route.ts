import { sql } from "drizzle-orm";
import type { ExtProblemContext } from "@upsolve/contracts";
import { INTERVAL_DAYS, MISTAKE_CHECKS, TOPIC_GUIDE, topicLabel, topicsOf } from "@upsolve/core";
import { db } from "@/lib/db";
import { authenticateExtension, unauthorized } from "@/lib/ext-auth";
import { getLearning } from "@/lib/learning";
import { getProblemDetail } from "@/lib/problem-data";

const PLATFORMS = new Set(["leetcode", "geeksforgeeks"]);

/**
 * Context for the in-page panel on a problem: what you remember about it, its revision
 * step, similar problems, progressive hints and a pre-submit checklist from your mistakes.
 */
export async function GET(request: Request) {
  const userId = await authenticateExtension(request);
  if (!userId) return unauthorized();
  const params = new URL(request.url).searchParams;
  const platform = params.get("platform") ?? "";
  const slug = params.get("slug") ?? "";
  if (!PLATFORMS.has(platform) || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return Response.json({ ok: false, error: "Bad problem" }, { status: 400 });
  }
  const dashboard = new URL("/dashboard", request.url).toString();

  const [pp] = (await db().execute(sql`
    select problem_id as "problemId", title from platform_problems
    where platform = ${platform} and slug = ${slug} limit 1`)) as unknown as {
    problemId: string | null;
    title: string;
  }[];

  const empty: ExtProblemContext = {
    known: false,
    problemId: null,
    title: pp?.title ?? null,
    difficulty: null,
    topics: [],
    memory: {
      solvedCount: 0,
      lastSolvedAt: null,
      bestActiveMs: null,
      independence: null,
      attempts: 0,
      lastTakeaway: null,
    },
    note: null,
    review: null,
    similar: [],
    hints: [
      {
        level: 1,
        title: "Start small",
        body: "Solve the smallest example by hand and write down every step you take.",
      },
      {
        level: 2,
        title: "Brute force first",
        body: "Write the simplest correct approach, then look for repeated work you can remember or skip.",
      },
    ],
    checklist: Object.values(MISTAKE_CHECKS)
      .slice(0, 3)
      .map((text) => ({ text, mine: 0 })),
    dashboardUrl: dashboard,
  };
  if (!pp?.problemId) return Response.json(empty);

  const problemId = pp.problemId;
  const [detail, learning] = await Promise.all([
    getProblemDetail(userId, problemId),
    getLearning(userId),
  ]);
  if (!detail) return Response.json(empty);

  const topics = topicsOf(detail.topics);
  const [mistakeRows, takeRows] = await Promise.all([
    detail.topics.length
      ? db().execute(sql`
          select tag, count(*)::int as n
          from practice_sessions ps
          join platform_problems pp on pp.id = ps.platform_problem_id
          join problems p on p.id = pp.problem_id
          cross join unnest(ps.mistake_tags) as tag
          where ps.user_id = ${userId}
            and p.topics && string_to_array(${detail.topics.join("\u001f")}, ${"\u001f"})
          group by tag order by n desc`)
      : Promise.resolve([]),
    db().execute(sql`
      select ps.takeaway from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${userId} and pp.problem_id = ${problemId} and ps.takeaway is not null
      order by ps.started_at desc limit 1`),
  ]);

  const solvedSubs = detail.submissions.filter((s) => s.verdict === "AC");
  const timed = detail.sessions.filter((s) => s.outcome === "solved");
  const best = timed.reduce<number | null>(
    (b, s) => (b === null || s.activeMs < b ? s.activeMs : b),
    null,
  );
  const rank = { solution: 0, hint: 1, solo: 2 } as const;
  const independence = timed.reduce<ExtProblemContext["memory"]["independence"]>(
    (b, s) => (s.independence && (!b || rank[s.independence] > rank[b]) ? s.independence : b),
    null,
  );
  const lastTakeaway = (takeRows as unknown as { takeaway: string }[])[0]?.takeaway ?? null;
  const learned = learning.find((l) => l.problemId === problemId);

  const hints: ExtProblemContext["hints"] = [];
  if (topics.length) {
    hints.push({
      level: 1,
      title: "The pattern",
      body: `Think ${topics.map(topicLabel).join(" + ")}.`,
    });
    hints.push({ level: 2, title: "The key idea", body: TOPIC_GUIDE[topics[0]!].idea });
  } else {
    hints.push(...empty.hints);
  }
  const past = lastTakeaway ?? detail.note?.body ?? null;
  if (past) {
    hints.push({ level: 3, title: "Your own note from last time", body: past.slice(0, 400) });
  }

  const mine = mistakeRows as unknown as { tag: string; n: number }[];
  const checklist: ExtProblemContext["checklist"] = [
    ...mine
      .filter((m) => MISTAKE_CHECKS[m.tag])
      .slice(0, 3)
      .map((m) => ({ text: MISTAKE_CHECKS[m.tag]!, mine: m.n })),
    ...(topics[0] ? TOPIC_GUIDE[topics[0]].checks : []).map((text) => ({ text, mine: 0 })),
  ].slice(0, 6);

  const body: ExtProblemContext = {
    known: true,
    problemId,
    title: detail.title,
    difficulty: detail.difficulty,
    topics: topics.map((id) => ({ id, label: topicLabel(id) })),
    memory: {
      solvedCount: solvedSubs.length,
      lastSolvedAt: solvedSubs[0]?.at.getTime() ?? null,
      bestActiveMs: best,
      independence,
      attempts: detail.sessions.length,
      lastTakeaway,
    },
    note: detail.note?.body.slice(0, 600) ?? null,
    review: learned
      ? {
          step: learned.state.step,
          intervalDays: INTERVAL_DAYS[learned.state.step] ?? 1,
          dueAt: learned.state.dueAt,
          retired: learned.state.retired,
        }
      : null,
    similar: detail.similar.slice(0, 3).map((s) => ({
      title: s.title,
      url: s.url,
      difficulty: s.difficulty,
    })),
    hints,
    checklist,
    dashboardUrl: new URL(`/dashboard/problems/${problemId}`, request.url).toString(),
  };
  return Response.json(body);
}

// DsaKaro

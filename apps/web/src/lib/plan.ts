import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { suggestNext, topicLabel, type Difficulty } from "@upsolve/core";
import { planDays, planItems } from "@upsolve/db";
import { reviewUrl } from "@/components/learning";
import { getUpcomingContests } from "@/lib/contest-calendar";
import { db } from "@/lib/db";
import {
  getLearning,
  getNextCandidates,
  getTopicTargets,
  masteryOf,
  revisionQueue,
} from "@/lib/learning";
import { localDate, localDay } from "@/lib/time";

// The Today plan: suggestions generated once per local day, plus the user's own
// tasks. A problem item counts as done when that problem is solved (or reviewed)
// today, so the list ticks itself as the extension and syncs report Accepted.

export type PlanKind = "revision" | "next" | "stretch" | "shared" | "contest" | "drill" | "custom";

export type PlanItem = {
  id: string;
  kind: PlanKind;
  title: string;
  url: string | null;
  detail: string | null;
  problemId: string | null;
  difficulty: Difficulty | null;
  done: boolean;
  /** Ticked by solving (vs. by hand). */
  auto: boolean;
};

export type TodayPlan = { day: string; items: PlanItem[]; done: number; total: number };

const MAX_REVISIONS = 4;

/** Creates today's suggestions once. Safe to call on every render; only the first call writes. */
async function ensureGenerated(userId: string, tz: string, cap: number, now: number, day: string) {
  const claimed = await db()
    .insert(planDays)
    .values({ userId, day })
    .onConflictDoNothing()
    .returning({ day: planDays.day });
  if (claimed.length === 0) return;

  try {
    const [learning, targets, candidates, contests, shared] = await Promise.all([
      getLearning(userId),
      getTopicTargets(),
      getNextCandidates(userId),
      getUpcomingContests(),
      db().execute(sql`
        select ps.problem_id as "problemId", p.title, p.difficulty, coalesce(pr.name, pr.handle, 'A friend') as "from",
               g.name as "group",
               (select pp.url from platform_problems pp where pp.problem_id = p.id
                 order by (pp.platform = 'leetcode') desc limit 1) as url
        from problem_shares ps
        join group_members gm on gm.group_id = ps.group_id and gm.user_id = ${userId}
        join groups g on g.id = ps.group_id
        join problems p on p.id = ps.problem_id
        left join profiles pr on pr.user_id = ps.user_id
        where ps.user_id <> ${userId} and ps.created_at > now() - interval '3 days'
          and not exists (
            select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
            where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = ps.problem_id)
        order by ps.created_at desc limit 2`),
    ]);
    const mastery = masteryOf(learning, targets, now);
    const queue = revisionQueue(learning, mastery, { tz, cap, now });
    const solvedBy: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const p of learning) if (p.difficulty) solvedBy[p.difficulty]++;
    const picks = suggestNext(candidates, mastery, solvedBy, 6);
    const next = picks[0];
    const stretch = picks.find((p) => p !== next && p.topic !== next?.topic);
    const { start, end } = localDay(tz, now);

    const rows: (typeof planItems.$inferInsert)[] = [];
    const push = (r: Omit<typeof planItems.$inferInsert, "userId" | "day" | "position">) =>
      rows.push({ ...r, userId, day, position: rows.length });

    for (const p of queue.today.slice(0, MAX_REVISIONS)) {
      push({
        kind: "revision",
        problemId: p.problemId,
        title: p.title,
        url: reviewUrl(p.url),
        detail: "Revision · re-solve it from memory",
      });
    }
    if (next) {
      push({
        kind: "next",
        problemId: next.problemId,
        title: next.title,
        url: next.url,
        detail: `Next from ${next.sheet} · ${next.reason}`,
      });
    }
    if (stretch) {
      push({
        kind: "stretch",
        problemId: stretch.problemId,
        title: stretch.title,
        url: stretch.url,
        detail: `Stretch · ${topicLabel(stretch.topic)} is your weak spot`,
      });
    }
    for (const s of shared as unknown as {
      problemId: string;
      title: string;
      from: string;
      group: string;
      url: string | null;
    }[]) {
      if (rows.some((r) => r.problemId === s.problemId)) continue;
      push({
        kind: "shared",
        problemId: s.problemId,
        title: s.title,
        url: s.url,
        detail: `From ${s.from} in ${s.group}`,
      });
    }
    for (const c of contests.filter((c) => c.startsAt >= start && c.startsAt < end).slice(0, 2)) {
      push({ kind: "contest", title: c.name, url: c.url, detail: "Contest today" });
    }
    if (rows.length) await db().insert(planItems).values(rows);
  } catch (err) {
    // Let the next visit try again rather than leaving today empty.
    await db()
      .delete(planDays)
      .where(and(eq(planDays.userId, userId), eq(planDays.day, day)));
    throw err;
  }
}

export async function getTodayPlan(
  userId: string,
  tz: string,
  cap: number,
  now: number,
): Promise<TodayPlan> {
  const day = localDate(tz, now);
  await ensureGenerated(userId, tz, cap, now, day);
  const { start } = localDay(tz, now);
  // Raw sql params must be strings: postgres-js rejects Date objects here.
  const since = new Date(start).toISOString();

  const rows = (await db().execute(sql`
    select pi.id, pi.kind, pi.title, pi.url, pi.detail, pi.problem_id as "problemId",
           p.difficulty, pi.done_at is not null as manual,
           (pi.problem_id is not null and (
              exists (select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
                      where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = pi.problem_id
                        and s.submitted_at >= ${since}::timestamptz)
              or exists (select 1 from review_logs r where r.user_id = ${userId}
                      and r.problem_id = pi.problem_id and r.at >= ${since}::timestamptz
                      and r.action in ('remembered', 'shaky', 'forgot'))
           )) as solved
    from plan_items pi left join problems p on p.id = pi.problem_id
    where pi.user_id = ${userId} and pi.day = ${day}
    order by pi.position, pi.created_at`)) as unknown as {
    id: string;
    kind: PlanKind;
    title: string;
    url: string | null;
    detail: string | null;
    problemId: string | null;
    difficulty: Difficulty | null;
    manual: boolean;
    solved: boolean;
  }[];

  const items = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    url: r.url,
    detail: r.detail,
    problemId: r.problemId,
    difficulty: r.difficulty,
    done: r.manual || r.solved,
    auto: r.solved,
  }));
  return { day, items, done: items.filter((i) => i.done).length, total: items.length };
}

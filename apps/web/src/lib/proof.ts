import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { Independence } from "@upsolve/core";
import { db, userTag } from "@/lib/db";

// Proof it stuck (FINAL-FEATURES A4): the payoff of revision, from sessions we already store.
// "First solve: 42 min, with a hint. Re-solve 7 days later: 11 min, solo."

export type SolveSitting = { at: number; activeMs: number; independence: Independence | null };

export type StuckProof = {
  first: SolveSitting;
  latest: SolveSitting;
  days: number;
  /** stuck: as independent or more, and faster or solo. slipped: needed more help. */
  verdict: "stuck" | "held" | "slipped";
};

const RANK: Record<Independence, number> = { solution: 0, hint: 1, solo: 2 };
/** A re-solve sooner than this after the first is the same sitting's practice, not recall. */
const MIN_GAP_MS = 2 * 86_400_000;
/** Shorter than this, the timer didn't really see the solve. */
const MIN_ACTIVE_MS = 30_000;

/** Compares the first timed solve with the latest re-solve at least two days later. */
export function proofItStuck(solves: SolveSitting[]): StuckProof | null {
  const timed = solves.filter((s) => s.activeMs >= MIN_ACTIVE_MS).sort((a, b) => a.at - b.at);
  const first = timed[0];
  const latest = timed.at(-1);
  if (!first || !latest || latest.at - first.at < MIN_GAP_MS) return null;
  const a = first.independence ? RANK[first.independence] : 1;
  const b = latest.independence ? RANK[latest.independence] : 1;
  const verdict =
    b < a
      ? "slipped"
      : b > a || latest.activeMs <= first.activeMs || latest.independence === "solo"
        ? "stuck"
        : "held";
  return { first, latest, days: Math.round((latest.at - first.at) / 86_400_000), verdict };
}

export type WeekProof = StuckProof & { problemId: string; title: string };

/** Problems whose latest re-solve happened since `since` and shows it stuck, best gain first. */
export async function getStuckSince(userId: string, since: number): Promise<WeekProof[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");
  const rows = (await db().execute(sql`
    select pp.problem_id as "problemId", p.title,
           (extract(epoch from coalesce(ps.ended_at, ps.started_at)) * 1000)::float8 as at,
           ps.active_ms as "activeMs", ps.independence
    from practice_sessions ps
    join platform_problems pp on pp.id = ps.platform_problem_id
    join problems p on p.id = pp.problem_id
    where ps.user_id = ${userId} and ps.outcome = 'solved'
      and pp.problem_id in (
        select pp2.problem_id from practice_sessions ps2
        join platform_problems pp2 on pp2.id = ps2.platform_problem_id
        where ps2.user_id = ${userId} and ps2.outcome = 'solved'
          and coalesce(ps2.ended_at, ps2.started_at) >= to_timestamp(${since / 1000}))`)) as unknown as {
    problemId: string;
    title: string;
    at: number;
    activeMs: number;
    independence: Independence | null;
  }[];
  const by = new Map<string, { title: string; list: SolveSitting[] }>();
  for (const r of rows) {
    const e = by.get(r.problemId) ?? { title: r.title, list: [] };
    e.list.push({ at: Number(r.at), activeMs: r.activeMs, independence: r.independence });
    by.set(r.problemId, e);
  }
  const out: WeekProof[] = [];
  for (const [problemId, { title, list }] of by) {
    const proof = proofItStuck(list);
    if (proof && proof.verdict === "stuck" && proof.latest.at >= since)
      out.push({ ...proof, problemId, title });
  }
  return out.sort(
    (x, y) => y.first.activeMs - y.latest.activeMs - (x.first.activeMs - x.latest.activeMs),
  );
}

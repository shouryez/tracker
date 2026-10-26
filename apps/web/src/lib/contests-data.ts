import "server-only";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  codeforcesProblemsByContest,
  leetcodeContestProblems,
  type Platform,
  type RawProblem,
} from "@upsolve/adapters";
import { db, userTag } from "@/lib/db";

// Contest history and upsolve lists (Phase 5). Callers pass a session-resolved user id.

/** Upsolve lists cover this many most recent contests. */
export const UPSOLVE_CONTESTS = 10;
/** LeetCode stores the contest start; a contest plus a little slack. */
const LEETCODE_CONTEST_MS = 2 * 3_600_000;

export type ContestRow = {
  platform: Platform;
  contestId: string;
  name: string;
  at: Date;
  rank: number | null;
  oldRating: number | null;
  newRating: number | null;
  solved: number | null;
  total: number | null;
};

export async function getContests(userId: string): Promise<ContestRow[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const rows = (await db().execute(sql`
    select platform, contest_id as "contestId", coalesce(contest_name, contest_id) as name, at, rank,
           old_rating as "oldRating", new_rating as "newRating", solved, total
    from contest_results where user_id = ${userId}
    order by at desc`)) as unknown as (Omit<ContestRow, "at"> & { at: unknown })[];
  return rows.map((r) => ({ ...r, at: new Date(String(r.at)) }));
}

// Codeforces' whole problem set, refreshed at most daily per server.
let cfProblems: { at: number; data: Promise<Map<string, RawProblem[]>> } | null = null;
function codeforcesProblems() {
  if (!cfProblems || Date.now() - cfProblems.at > 86_400_000) {
    const data = codeforcesProblemsByContest().catch((err) => {
      cfProblems = null; // retry next time
      throw err;
    });
    cfProblems = { at: Date.now(), data };
  }
  return cfProblems.data;
}

/** The problems of one contest. Contest problem sets never change, so this caches for days. */
export async function getContestProblems(
  platform: Platform,
  contestId: string,
): Promise<RawProblem[]> {
  "use cache";
  cacheTag(`contest:${platform}:${contestId}`);
  cacheLife("days");

  try {
    if (platform === "codeforces") return (await codeforcesProblems()).get(contestId) ?? [];
    if (platform === "leetcode") return await leetcodeContestProblems(contestId);
  } catch (err) {
    console.error(`[contests] problems for ${platform}/${contestId}`, err);
  }
  return [];
}

export type UpsolveProblem = RawProblem & {
  /** Solved during the contest, solved afterwards (upsolved), or still to do. */
  status: "contest" | "upsolved" | "todo";
  /** Submitted something without getting Accepted. */
  attempted: boolean;
  problemId: string | null;
};

export type ContestUpsolve = ContestRow & { problems: UpsolveProblem[] };

/** Problem-by-problem status for the most recent contests. */
export async function getUpsolve(
  userId: string,
  contests: ContestRow[],
): Promise<ContestUpsolve[]> {
  const recent = contests
    .filter((c) => c.platform === "codeforces" || c.platform === "leetcode")
    .slice(0, UPSOLVE_CONTESTS);
  const lists = await Promise.all(recent.map((c) => getContestProblems(c.platform, c.contestId)));

  const wanted = new Map<Platform, Set<string>>();
  recent.forEach((c, i) => {
    const set = wanted.get(c.platform) ?? new Set<string>();
    for (const p of lists[i]!) set.add(p.externalId);
    wanted.set(c.platform, set);
  });
  const status = new Map<
    string,
    { firstAc: number | null; attempted: boolean; problemId: string | null }
  >();
  for (const [platform, ids] of wanted) {
    if (ids.size === 0) continue;
    const rows = (await db().execute(sql`
      select pp.external_id as id, pp.problem_id as "problemId",
             (extract(epoch from min(s.submitted_at) filter (where s.verdict = 'AC')) * 1000)::float8 as "firstAc",
             count(s.id)::int as subs
      from platform_problems pp
      left join submissions s on s.platform_problem_id = pp.id and s.user_id = ${userId}
      where pp.platform = ${platform}
        and pp.external_id in (${sql.join(
          [...ids].map((id) => sql`${id}`),
          sql`, `,
        )})
      group by pp.id`)) as unknown as {
      id: string;
      problemId: string | null;
      firstAc: number | null;
      subs: number;
    }[];
    for (const r of rows) {
      status.set(`${platform}:${r.id}`, {
        firstAc: r.firstAc,
        attempted: r.subs > 0,
        problemId: r.problemId,
      });
    }
  }

  return recent.map((c, i) => {
    const end = c.platform === "leetcode" ? c.at.getTime() + LEETCODE_CONTEST_MS : c.at.getTime();
    // LeetCode's public sync only sees recent solves, but the contest result says how
    // many were solved: when that's all of them, every problem was solved in the contest.
    const allSolved = c.solved !== null && c.total !== null && c.solved >= c.total;
    return {
      ...c,
      problems: lists[i]!.map((p) => {
        const s = status.get(`${c.platform}:${p.externalId}`);
        return {
          ...p,
          status:
            allSolved || (s?.firstAc && s.firstAc <= end)
              ? "contest"
              : s?.firstAc
                ? "upsolved"
                : "todo",
          attempted: !!s?.attempted && !s.firstAc,
          problemId: s?.problemId ?? null,
        };
      }),
    };
  });
}

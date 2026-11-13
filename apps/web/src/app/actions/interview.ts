"use server";

import { sql } from "drizzle-orm";
import { z } from "zod";
import { topicsOf, type Difficulty } from "@upsolve/core";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLearning, getNextCandidates, getTopicTargets, masteryOf } from "@/lib/learning";
import { INTERVIEW_PRESETS, type InterviewPresetId, type InterviewProblem } from "@/lib/interview";

/**
 * Mock interview mode (FEATURES-PLAN F1). The set is drawn from problems you haven't
 * solved, preferring your sheets' order and your weakest topics; the report reads what the
 * extension recorded during the window. No schema changes: sessions land as ordinary
 * practice sessions.
 */

const Preset = z.enum(["screen", "phone", "onsite", "final"]);

/** Nearest difficulties to fall back on when the exact pool is empty. */
const NEAR: Record<Difficulty, Difficulty[]> = {
  easy: ["easy", "medium"],
  medium: ["medium", "easy", "hard"],
  hard: ["hard", "medium"],
};

export async function drawInterviewSet(
  preset: InterviewPresetId,
): Promise<{ ok: true; problems: InterviewProblem[] } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, error: "Sign in first." };
  if (!Preset.safeParse(preset).success) return { ok: false, error: "Unknown preset." };
  const [candidates, learning, targets] = await Promise.all([
    getNextCandidates(user.id),
    getLearning(user.id),
    getTopicTargets(),
  ]);
  // Your four weakest topics get first claim on the slots: that's what an interviewer finds.
  const weak = new Set(
    masteryOf(learning, targets, Date.now())
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((m) => m.topic),
  );
  const pool = candidates.filter(
    (c): c is typeof c & { difficulty: Difficulty; url: string } =>
      c.difficulty !== null && !!c.url,
  );
  const picked: InterviewProblem[] = [];
  for (const want of INTERVIEW_PRESETS[preset].mix) {
    const options = NEAR[want]
      .flatMap((d) => pool.filter((c) => c.difficulty === d))
      .filter((c) => !picked.some((p) => p.id === c.problemId));
    if (options.length === 0) continue;
    // Prefer weak-topic problems; inside each band, a random pick from the first dozen so
    // two mocks in a row don't repeat.
    const banded = options
      .map((c, i) => ({
        c,
        key:
          (topicsOf(c.tags).some((t) => weak.has(t)) ? 0 : 1) * 1000 +
          Math.min(i, 12) +
          Math.random() * 12,
      }))
      .sort((a, b) => a.key - b.key);
    const hit = banded[0]!.c;
    picked.push({ id: hit.problemId, title: hit.title, url: hit.url, difficulty: hit.difficulty });
  }
  if (picked.length < INTERVIEW_PRESETS[preset].mix.length) {
    return {
      ok: false,
      error:
        picked.length === 0
          ? "No unsolved problems to draw from. Follow a sheet first."
          : "Not enough unsolved problems at this mix. Try another round type.",
    };
  }
  return { ok: true, problems: picked };
}

export type InterviewResult = {
  problemId: string;
  solved: boolean;
  attempted: boolean;
  /** Fastest solving session in the window, or the longest attempt. */
  activeMs: number | null;
  submits: number;
  independence: "solo" | "hint" | "solution" | null;
  /** Everyone's median (5+ solvers), for the verdict line. */
  medianMs: number | null;
};

const Ids = z.array(z.uuid()).min(1).max(4);

export async function interviewReport(
  problemIds: string[],
  sinceMs: number,
): Promise<InterviewResult[] | null> {
  const user = await getCurrentUser();
  const ids = Ids.safeParse(problemIds);
  const since = z.number().int().positive().safeParse(sinceMs);
  if (isDemoUser(user) || !ids.success || !since.success) return null;
  const idList = sql.join(
    ids.data.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const [rows, medians] = await Promise.all([
    db().execute(sql`
      select pp.problem_id as "problemId", ps.outcome, ps.active_ms as "activeMs",
             ps.submits, ps.independence
      from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${user.id} and pp.problem_id in (${idList})
        and ps.started_at >= to_timestamp(${Math.floor(since.data / 1000)})`),
    db().execute(sql`
      select problem_id as "problemId",
             percentile_cont(0.5) within group (order by best)::int as "medianMs",
             count(*)::int as solvers
      from (
        select pp.problem_id, ps.user_id, min(ps.active_ms) as best
        from practice_sessions ps
        join platform_problems pp on pp.id = ps.platform_problem_id
        where pp.problem_id in (${idList}) and ps.outcome = 'solved' and ps.active_ms > 30000
        group by pp.problem_id, ps.user_id
      ) t group by problem_id`),
  ]);
  type Row = {
    problemId: string;
    outcome: string;
    activeMs: number;
    submits: number;
    independence: "solo" | "hint" | "solution" | null;
  };
  type Med = { problemId: string; medianMs: number | null; solvers: number };
  const med = new Map(
    (medians as unknown as Med[])
      .filter((m) => m.solvers >= 5 && m.medianMs)
      .map((m) => [m.problemId, m.medianMs!]),
  );
  return ids.data.map((id) => {
    const mine = (rows as unknown as Row[]).filter((r) => r.problemId === id);
    const solved = mine.filter((r) => r.outcome === "solved");
    const best = solved.length
      ? Math.min(...solved.map((r) => r.activeMs))
      : mine.length
        ? Math.max(...mine.map((r) => r.activeMs))
        : null;
    return {
      problemId: id,
      solved: solved.length > 0,
      attempted: mine.length > 0,
      activeMs: best,
      submits: mine.reduce((n, r) => n + r.submits, 0),
      independence: solved.find((r) => r.independence)?.independence ?? null,
      medianMs: med.get(id) ?? null,
    };
  });
}

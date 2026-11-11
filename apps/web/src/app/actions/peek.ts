"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { problems } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLearning } from "@/lib/learning";

export type ProblemPeek = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | null;
  /** Ladder rung 1–6, or null when it isn't on your revision ladder. */
  rung: number | null;
  dueAt: number | null;
  lastAt: number | null;
  bestMs: number | null;
  /** Where to re-solve it (review mode is added by the client). */
  url: string | null;
};

/**
 * What the hover preview and right-click menu show for a problem link (FRONTEND-PLAN B11).
 * Read-only, your own data; the learning list is cached, so this is cheap.
 */
export async function getProblemPeek(problemId: string): Promise<ProblemPeek | null> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !z.uuid().safeParse(problemId).success) return null;
  const mine = (await getLearning(user.id)).find((p) => p.problemId === problemId);
  if (mine) {
    return {
      id: problemId,
      title: mine.title,
      difficulty: mine.difficulty,
      rung: mine.state.retired ? null : Math.min(6, mine.state.step + 1),
      dueAt: mine.state.retired ? null : mine.state.dueAt,
      lastAt: mine.state.lastAt,
      bestMs: mine.state.bestMs ?? null,
      url: mine.url,
    };
  }
  const [p] = await db()
    .select({ title: problems.title, difficulty: problems.difficulty })
    .from(problems)
    .where(eq(problems.id, problemId));
  if (!p) return null;
  return {
    id: problemId,
    title: p.title,
    difficulty: p.difficulty,
    rung: null,
    dueAt: null,
    lastAt: null,
    bestMs: null,
    url: null,
  };
}

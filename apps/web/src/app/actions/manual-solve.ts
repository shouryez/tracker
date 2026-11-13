"use server";

import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { insertSubmissions, practiceSessions } from "@upsolve/db";
import type { Platform } from "@upsolve/adapters";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db, userTag } from "@/lib/db";

const Input = z.object({
  problemId: z.uuid(),
  minutes: z.number().int().min(1).max(600),
  independence: z.enum(["solo", "hint", "solution"]),
  when: z.enum(["now", "yesterday"]),
});

/**
 * Log a solve by hand (FEATURES-PLAN F5): for problems solved where the extension couldn't
 * see (a phone, a friend's laptop, a whiteboard). Writes the same two rows a tracked solve
 * makes, an Accepted submission and a solved session, so the ladder, streak and stats treat
 * it exactly the same. Both carry a "manual-" id, so they're always distinguishable.
 */
export async function logManualSolve(
  input: z.input<typeof Input>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, error: "Sign in first." };
  const v = Input.safeParse(input);
  if (!v.success) return { ok: false, error: "Check the minutes (1–600)." };
  const [pp] = (await db().execute(sql`
    select id, platform from platform_problems where problem_id = ${v.data.problemId}
    order by (platform = 'leetcode') desc, created_at limit 1`)) as unknown as {
    id: string;
    platform: Platform;
  }[];
  if (!pp) return { ok: false, error: "That problem isn't on a platform we know." };

  const end = Date.now() - (v.data.when === "yesterday" ? 86_400_000 : 0);
  const activeMs = v.data.minutes * 60_000;
  const id = `manual-${randomUUID()}`;
  const [seen] = (await db().execute(sql`
    select 1 as x from practice_sessions where user_id = ${user.id}
      and platform_problem_id = ${pp.id} and outcome = 'solved' limit 1`)) as unknown as {
    x: number;
  }[];
  await db()
    .insert(practiceSessions)
    .values({
      userId: user.id,
      clientId: id,
      platformProblemId: pp.id,
      // Solved before: this is a re-solve, so it counts as a review.
      mode: seen ? "review" : "practice",
      startedAt: new Date(end - activeMs),
      endedAt: new Date(end),
      activeMs,
      idleMs: 0,
      submits: 1,
      outcome: "solved",
      independence: v.data.independence,
      note: "Logged by hand",
      mistakeTags: [],
    });
  await insertSubmissions(db(), user.id, pp.platform, "extension", [
    {
      platformProblemId: pp.id,
      externalId: id,
      verdict: "AC",
      language: null,
      runtimeMs: null,
      memoryKb: null,
      submittedAt: new Date(end),
    },
  ]);
  updateTag(userTag(user.id));
  return { ok: true };
}

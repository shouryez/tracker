"use server";

import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { problemNotes, problems, profiles, reviewAction, reviewLogs } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db, userTag } from "@/lib/db";
import { REVIEW_CAPS } from "@/lib/profile-options";

const Id = z.uuid();
const Action = z.enum(reviewAction.enumValues);
export type ReviewActionName = z.infer<typeof Action>;

async function problemExists(problemId: string) {
  const [p] = await db()
    .select({ id: problems.id })
    .from(problems)
    .where(eq(problems.id, problemId));
  return Boolean(p);
}

/** Records a manual review ("I revised it"), or retires/restores a problem in the queue. */
export async function logReview(problemId: string, action: ReviewActionName): Promise<void> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(problemId).success || !Action.safeParse(action).success) {
    return;
  }
  if (!(await problemExists(problemId))) return;
  await db().insert(reviewLogs).values({ userId: user.id, problemId, action });
  updateTag(userTag(user.id));
}

const NOTE_MAX = 10_000;

export async function saveProblemNote(problemId: string, body: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(problemId).success || typeof body !== "string") {
    return { ok: false };
  }
  const text = body.slice(0, NOTE_MAX);
  if (text.trim() === "") {
    await db()
      .delete(problemNotes)
      .where(and(eq(problemNotes.userId, user.id), eq(problemNotes.problemId, problemId)));
  } else {
    if (!(await problemExists(problemId))) return { ok: false };
    await db()
      .insert(problemNotes)
      .values({ userId: user.id, problemId, body: text })
      .onConflictDoUpdate({
        target: [problemNotes.userId, problemNotes.problemId],
        set: { body: text, updatedAt: sql`now()` },
      });
  }
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function saveLearningSettings(values: {
  reviewCap: number;
  weeklyEmail: boolean;
}): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const parsed = z
    .object({
      reviewCap: z
        .number()
        .int()
        .refine((n) => (REVIEW_CAPS as readonly number[]).includes(n)),
      weeklyEmail: z.boolean(),
    })
    .safeParse(values);
  if (isDemoUser(user) || !parsed.success) return { ok: false };
  await db().update(profiles).set(parsed.data).where(eq(profiles.userId, user.id));
  updateTag(userTag(user.id));
  return { ok: true };
}

// DsaKaro

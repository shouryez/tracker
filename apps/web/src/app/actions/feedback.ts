"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { feedback, feedbackKind } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db } from "@/lib/db";

const Input = z.object({
  kind: z.enum(feedbackKind.enumValues),
  message: z.string().trim().min(3, "Tell us a little more").max(4000),
  page: z.string().max(300).nullable(),
});

/** Most notes one user can send per hour (a typo loop shouldn't fill the table). */
const PER_HOUR = 20;

export async function sendFeedback(
  values: z.input<typeof Input>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, error: "Sign in first." };
  const parsed = Input.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const [{ n } = { n: 0 }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(feedback)
    .where(
      and(eq(feedback.userId, user.id), gte(feedback.createdAt, sql`now() - interval '1 hour'`)),
    );
  if (n >= PER_HOUR) return { ok: false, error: "That's a lot of notes. Try again in an hour." };

  await db()
    .insert(feedback)
    .values({ userId: user.id, ...parsed.data });
  return { ok: true };
}

"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { bugDrills, bugFindings, submissionCode } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { isBugClass } from "@/lib/bug-classes";
import { db, userTag } from "@/lib/db";

const Id = z.uuid();

/** WA autopsy: the user's own correction of a finding's bug class. */
export async function correctFinding(
  submissionId: string,
  bugClass: string,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (isDemoUser(user) || !Id.safeParse(submissionId).success || !isBugClass(bugClass)) {
    return { ok: false };
  }
  await db()
    .update(bugFindings)
    .set({ userClass: bugClass })
    .where(and(eq(bugFindings.userId, user.id), eq(bugFindings.submissionId, submissionId)));
  updateTag(userTag(user.id));
  return { ok: true };
}

/** Deletes every piece of code we hold for the user, with the autopsies and drills made from it. */
export async function deleteMyCode(): Promise<{ ok: boolean; deleted: number }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, deleted: 0 };
  const [code] = await Promise.all([
    db()
      .delete(submissionCode)
      .where(eq(submissionCode.userId, user.id))
      .returning({ id: submissionCode.submissionId }),
    db().delete(bugFindings).where(eq(bugFindings.userId, user.id)),
    db().delete(bugDrills).where(eq(bugDrills.userId, user.id)),
  ]);
  updateTag(userTag(user.id));
  return { ok: true, deleted: code.length };
}

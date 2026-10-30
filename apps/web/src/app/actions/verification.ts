"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { collegeVerifications, profiles } from "@upsolve/db";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db, userTag } from "@/lib/db";
import { VERIFICATIONS_TAG } from "@/lib/verification";
import { idImageProblem, sniffImageType } from "@/lib/verification-image";

export type VerificationResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): VerificationResult => ({ ok: false, error });
const UPLOADS_PER_DAY = 5;

/** A student uploads a photo of their college ID for the college on their profile. */
export async function submitCollegeId(form: FormData): Promise<VerificationResult> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return fail("Sign in first.");
  const [profile] = await db()
    .select({ collegeId: profiles.collegeId, verifiedAt: profiles.collegeVerifiedAt })
    .from(profiles)
    .where(eq(profiles.userId, user.id));
  if (!profile?.collegeId) return fail("Add your college to your profile first.");
  if (profile.verifiedAt) return fail("Your college is already verified.");

  const file = form.get("photo");
  if (!(file instanceof File)) return fail("Choose a photo of your college ID.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const problem = idImageProblem(bytes);
  if (problem) return fail(problem);
  const note = String(form.get("note") ?? "")
    .trim()
    .slice(0, 200);

  const [recent] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(collegeVerifications)
    .where(
      and(
        eq(collegeVerifications.userId, user.id),
        gt(collegeVerifications.submittedAt, sql`now() - interval '1 day'`),
      ),
    );
  if ((recent?.n ?? 0) >= UPLOADS_PER_DAY) return fail("Too many uploads today. Try tomorrow.");

  // One pending upload per student: a new photo replaces the waiting one.
  await db()
    .delete(collegeVerifications)
    .where(
      and(eq(collegeVerifications.userId, user.id), eq(collegeVerifications.status, "pending")),
    );
  await db()
    .insert(collegeVerifications)
    .values({
      userId: user.id,
      collegeId: profile.collegeId,
      image: Buffer.from(bytes),
      imageType: sniffImageType(bytes),
      note: note || null,
    });
  updateTag(userTag(user.id));
  updateTag(VERIFICATIONS_TAG);
  return { ok: true };
}

/** Takes back a pending upload (the photo is deleted). */
export async function withdrawCollegeId(): Promise<VerificationResult> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return fail("Sign in first.");
  await db()
    .delete(collegeVerifications)
    .where(
      and(eq(collegeVerifications.userId, user.id), eq(collegeVerifications.status, "pending")),
    );
  updateTag(userTag(user.id));
  updateTag(VERIFICATIONS_TAG);
  return { ok: true };
}

/** Admin decision. Either way the photo is deleted; only the outcome is kept. */
export async function reviewCollegeId(
  id: string,
  decision: "approve" | "reject",
  reason?: string,
): Promise<VerificationResult> {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) return fail("Admins only.");
  const why = reason?.trim().slice(0, 240) ?? "";
  if (decision === "reject" && !why) return fail("Pick a reason so the student knows what to fix.");

  const [row] = await db()
    .select({
      userId: collegeVerifications.userId,
      collegeId: collegeVerifications.collegeId,
      status: collegeVerifications.status,
    })
    .from(collegeVerifications)
    .where(eq(collegeVerifications.id, id));
  if (!row) return fail("That upload is gone (the student may have withdrawn it).");
  if (row.status !== "pending") return fail("Already reviewed.");

  if (decision === "approve") {
    const [profile] = await db()
      .select({ collegeId: profiles.collegeId })
      .from(profiles)
      .where(eq(profiles.userId, row.userId));
    if (profile?.collegeId !== row.collegeId) {
      return fail("The student has changed college since uploading. Reject this one instead.");
    }
  }

  await db()
    .update(collegeVerifications)
    .set({
      status: decision === "approve" ? "approved" : "rejected",
      reason: decision === "reject" ? why : null,
      image: null,
      imageType: null,
      reviewedAt: new Date(),
      reviewedBy: user.email,
    })
    .where(eq(collegeVerifications.id, id));
  if (decision === "approve") {
    await db()
      .update(profiles)
      .set({ collegeVerifiedAt: new Date() })
      .where(and(eq(profiles.userId, row.userId), eq(profiles.collegeId, row.collegeId)));
  }
  const [owner] = await db()
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, row.userId));
  updateTag(userTag(row.userId));
  if (owner?.handle) updateTag(`profile:${owner.handle}`);
  updateTag(VERIFICATIONS_TAG);
  return { ok: true };
}

// DsaKaro

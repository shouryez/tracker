"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { collegeVerifications, colleges, profiles } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { searchCollegesByName } from "@/lib/data";
import { VERIFICATIONS_TAG } from "@/lib/verification";
import { db, userTag } from "@/lib/db";
import {
  BRANCHES,
  COMPANIES,
  CURRENT_YEARS,
  DAILY_GOALS,
  GOALS,
  HANDLE_PATTERN,
  LANGUAGES,
  gradYearOptions,
} from "@/lib/profile-options";

export async function searchColleges(query: string) {
  const q = query.trim();
  if (q.length < 2 || q.length > 80) return [];
  await getCurrentUser(); // signed-in users only
  return searchCollegesByName(q.toLowerCase());
}

const ProfileInput = z
  .object({
    name: z.string().trim().min(1, "Tell us your name").max(80),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(HANDLE_PATTERN, "3–20 characters: lowercase letters, numbers and _"),
    collegeId: z.uuid().nullable(),
    newCollegeName: z.string().trim().min(3).max(120).nullable(),
    branch: z.enum(BRANCHES, "Pick your branch"),
    gradYear: z.coerce
      .number()
      .int()
      .refine((y) => gradYearOptions().includes(y), "Pick your graduation year"),
    currentYear: z.coerce
      .number()
      .int()
      .refine((y) => CURRENT_YEARS.some((c) => c.value === y), "Pick your current year"),
    goal: z.enum(GOALS.map((g) => g.value) as [string, ...string[]], "Pick a goal"),
    targetCompanies: z.array(z.string().trim().min(1).max(40)).max(12),
    mainLanguage: z.enum(LANGUAGES, "Pick a language"),
    dailyGoalMin: z.coerce
      .number()
      .int()
      .refine((m) => (DAILY_GOALS as readonly number[]).includes(m), "Pick a daily goal"),
  })
  .refine((v) => v.collegeId || v.newCollegeName, {
    message: "Pick your college, or add it if it's missing",
    path: ["collegeId"],
  });

export type ProfileInputValues = z.input<typeof ProfileInput>;
export type SaveProfileResult = { ok: false; errors: Record<string, string> } | undefined;

export async function saveProfile(values: ProfileInputValues): Promise<SaveProfileResult> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, errors: { form: "Sign in to save your profile." } };

  const parsed = ProfileInput.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const v = parsed.data;
  // Companies come from our list or are typed in; keep them tidy either way.
  const companies = [...new Set(v.targetCompanies)].filter(
    (c) => (COMPANIES as readonly string[]).includes(c) || /^[\w .&'-]+$/.test(c),
  );

  const [taken] = await db()
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(and(eq(profiles.handle, v.handle), ne(profiles.userId, user.id)));
  if (taken) return { ok: false, errors: { handle: "That handle is taken" } };

  let collegeId = v.collegeId;
  if (!collegeId && v.newCollegeName) {
    await db().insert(colleges).values({ name: v.newCollegeName }).onConflictDoNothing();
    const [college] = await db()
      .select({ id: colleges.id })
      .from(colleges)
      .where(sql`lower(${colleges.name}) = lower(${v.newCollegeName})`);
    collegeId = college?.id ?? null;
    updateTag("colleges");
  }

  await db().insert(profiles).values({ userId: user.id }).onConflictDoNothing(); // in case the signup trigger didn't run
  const [before] = await db()
    .select({ collegeId: profiles.collegeId })
    .from(profiles)
    .where(eq(profiles.userId, user.id));
  const collegeChanged = before?.collegeId !== collegeId;
  if (collegeChanged) {
    // A new college needs a new check; a waiting photo of the old card is deleted.
    await db()
      .delete(collegeVerifications)
      .where(
        and(eq(collegeVerifications.userId, user.id), eq(collegeVerifications.status, "pending")),
      );
    updateTag(VERIFICATIONS_TAG);
  }
  await db()
    .update(profiles)
    .set({
      name: v.name,
      handle: v.handle,
      collegeId,
      branch: v.branch,
      gradYear: v.gradYear,
      currentYear: v.currentYear,
      goal: v.goal as (typeof profiles.$inferSelect)["goal"],
      targetCompanies: companies,
      mainLanguage: v.mainLanguage,
      dailyGoalMin: v.dailyGoalMin,
      ...(collegeChanged ? { collegeVerifiedAt: null } : {}),
    })
    .where(eq(profiles.userId, user.id));

  updateTag(userTag(user.id));
  updateTag(`profile:${v.handle}`);
  redirect("/onboarding/connect");
}

export async function finishOnboarding() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) redirect("/dashboard");
  await db()
    .update(profiles)
    .set({ onboardedAt: sql`coalesce(${profiles.onboardedAt}, now())` })
    .where(eq(profiles.userId, user.id));
  updateTag(userTag(user.id));
  redirect("/dashboard");
}

export async function setProfilePublic(isPublic: boolean) {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return;
  const [row] = await db()
    .update(profiles)
    .set({ isPublic })
    .where(eq(profiles.userId, user.id))
    .returning({ handle: profiles.handle });
  updateTag(userTag(user.id));
  if (row?.handle) updateTag(`profile:${row.handle}`);
}

// DsaKaro

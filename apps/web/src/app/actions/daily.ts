"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { suggestNext, topicLabel, type Difficulty } from "@upsolve/core";
import {
  focusSessions,
  groupMembers,
  nudges,
  planItems,
  problemShares,
  problems,
  profiles,
  recallAnswers,
  savedItems,
  weeklyGoals,
} from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { classifySaved } from "@/lib/daily-data";
import { db, userTag } from "@/lib/db";
import { getProfile } from "@/lib/data";
import { getLearning, getNextCandidates, getTopicTargets, masteryOf } from "@/lib/learning";
import { ON_LIST, ON_TODAY_LIST, SAME_SHEET_ITEM, getTodaySuggestions } from "@/lib/plan";
import { getStudyContents, type StudyContents } from "@/lib/study-data";
import { localDate, requestNow } from "@/lib/time";

// Writes for the daily-loop features. Every action resolves the user from the
// session and validates its input; nothing trusts ids from the client blindly.

export type DailyResult = { ok: true } | { ok: false; error: string };

const Id = z.uuid();
const fail = (error: string): DailyResult => ({ ok: false, error });

async function me() {
  const user = await getCurrentUser();
  return isDemoUser(user) ? null : user;
}

async function today(userId: string) {
  const profile = await getProfile(userId);
  return localDate(profile?.timezone ?? "Asia/Kolkata", requestNow());
}

async function inGroup(userId: string, groupId: string) {
  const [row] = await db()
    .select({ g: groupMembers.groupId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return Boolean(row);
}

// ---------------------------------------------------------------- Today plan

const TaskTitle = z.string().trim().min(1, "Write a task").max(140);

export async function addPlanTask(title: string): Promise<DailyResult> {
  const user = await me();
  if (!user) return fail("Sign in first.");
  const parsed = TaskTitle.safeParse(title);
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  const day = await today(user.id);
  await db()
    .insert(planItems)
    .values({
      userId: user.id,
      day,
      kind: "custom",
      title: parsed.data,
      position: await nextPosition(user.id, day),
    });
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function setPlanItemDone(id: string, done: boolean): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return fail("Not found.");
  const [item] = await db()
    .update(planItems)
    .set({ doneAt: done ? new Date() : null })
    .where(and(eq(planItems.id, id), eq(planItems.userId, user.id)))
    .returning({ kind: planItems.kind });
  if (!item) return fail("Not found.");
  // The same item on a sheet ticks along (the list and the sheet never disagree). Unticking
  // takes back only sheet ticks made since it was planned, never an older one.
  if (item.kind !== "contest") {
    if (done) {
      await db().execute(sql`
        insert into sheet_marks (user_id, sheet_id, item_key)
        select ${user.id}, si.sheet_id, si.item_key
        from plan_items pi join sheet_items si on ${SAME_SHEET_ITEM}
        where pi.id = ${id} and pi.user_id = ${user.id}
        on conflict do nothing`);
    } else {
      await db().execute(sql`
        delete from sheet_marks sm
        using plan_items pi, sheet_items si
        where pi.id = ${id} and pi.user_id = ${user.id} and sm.user_id = ${user.id}
          and si.sheet_id = sm.sheet_id and si.item_key = sm.item_key
          and sm.created_at >= pi.created_at and ${SAME_SHEET_ITEM}`);
    }
  }
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function removePlanItem(id: string): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return fail("Not found.");
  await db()
    .delete(planItems)
    .where(and(eq(planItems.id, id), eq(planItems.userId, user.id)));
  updateTag(userTag(user.id));
  return { ok: true };
}

/** Adds problems to today's plan (mistake drills, "add to today" on a problem page). */
export async function addProblemsToPlan(
  problemIds: string[],
  kind: "drill" | "custom" = "drill",
): Promise<DailyResult> {
  const user = await me();
  const ids = problemIds.filter((p) => Id.safeParse(p).success).slice(0, 6);
  if (!user || ids.length === 0) return fail("Nothing to add.");
  const day = await today(user.id);
  const rows = (await db().execute(sql`
    select p.id, p.title,
      (select pp.url from platform_problems pp where pp.problem_id = p.id
        order by (pp.platform = 'leetcode') desc limit 1) as url
    from problems p where p.id in ${ids}
      and not exists (select 1 from plan_items pi where pi.user_id = ${user.id}
        and ${ON_LIST(day)} and pi.problem_id = p.id)`)) as unknown as {
    id: string;
    title: string;
    url: string | null;
  }[];
  if (rows.length === 0) return fail("Already on today's plan.");
  const start = await nextPosition(user.id, day);
  await db()
    .insert(planItems)
    .values(
      rows.map((r, i) => ({
        userId: user.id,
        day,
        kind,
        problemId: r.id,
        title: r.title,
        url: r.url,
        detail: kind === "drill" ? "Drill · fix a repeated mistake" : "Added by you",
        position: start + i,
      })),
    );
  updateTag(userTag(user.id));
  return { ok: true };
}

/** Position after everything already on the day's list, so new items land at the bottom. */
async function nextPosition(userId: string, day: string) {
  const [row] = (await db().execute(sql`
    select coalesce(max(position), -1) + 1 as next from plan_items
    where user_id = ${userId} and day = ${day}`)) as unknown as { next: number }[];
  return Number(row?.next ?? 0);
}

export type AddResult = { ok: true; added: number } | { ok: false; error: string };

const SuggestionKeys = z.array(z.string().min(1).max(600)).min(1).max(20);

/**
 * Adds suggestions to today's list. The suggestions are recomputed here and only keys that
 * match one are added, so titles and links never come from the client.
 */
export async function addSuggestionsToPlan(keys: string[]): Promise<AddResult> {
  const user = await me();
  if (!user) return { ok: false, error: "Sign in first." };
  const parsed = SuggestionKeys.safeParse(keys);
  if (!parsed.success) return { ok: false, error: "Nothing to add." };
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const now = requestNow();
  const day = localDate(tz, now);
  const wanted = new Set(parsed.data);
  const picked = (await getTodaySuggestions(user.id, tz, profile?.reviewCap ?? 5, now)).filter(
    (s) => wanted.has(s.key),
  );
  if (picked.length === 0) return { ok: false, error: "Already on today's list." };
  const start = await nextPosition(user.id, day);
  await db()
    .insert(planItems)
    .values(
      picked.map((s, i) => ({
        userId: user.id,
        day,
        kind: s.kind,
        problemId: s.problemId,
        title: s.title,
        url: s.url,
        detail: s.detail,
        position: start + i,
      })),
    );
  updateTag(userTag(user.id));
  return { ok: true, added: picked.length };
}

const SheetItemKeys = z.array(z.string().min(1).max(300)).min(1).max(30);

/** Adds items from a sheet to today's list (one or many, picked on the sheet or on Today). */
export async function addSheetItemsToPlan(sheetId: string, itemKeys: string[]): Promise<AddResult> {
  const user = await me();
  if (!user || !Id.safeParse(sheetId).success) return { ok: false, error: "Sheet not found." };
  const parsed = SheetItemKeys.safeParse(itemKeys);
  if (!parsed.success) return { ok: false, error: "Pick up to 30 items." };
  const day = await today(user.id);
  const rows = (await db().execute(sql`
    select si.item_key as "itemKey", si.title, si.url, si.step, si.problem_id as "problemId",
           sh.name as sheet
    from sheet_items si join sheets sh on sh.id = si.sheet_id
    where si.sheet_id = ${sheetId} and si.item_key in ${parsed.data}
      and not ${ON_TODAY_LIST(user.id, day)}
    order by si.position`)) as unknown as {
    itemKey: string;
    title: string;
    url: string | null;
    step: string;
    problemId: string | null;
    sheet: string;
  }[];
  if (rows.length === 0) return { ok: false, error: "Already on today's list." };
  const start = await nextPosition(user.id, day);
  await db()
    .insert(planItems)
    .values(
      rows.map((r, i) => ({
        userId: user.id,
        day,
        kind: "sheet",
        problemId: r.problemId,
        title: r.title,
        url: r.url,
        detail: `${r.sheet} · ${r.step}`,
        position: start + i,
      })),
    );
  updateTag(userTag(user.id));
  return { ok: true, added: rows.length };
}

// ---------------------------------------------------------------- next problem

export type NextPick = {
  problemId: string;
  title: string;
  url: string | null;
  difficulty: Difficulty | null;
  topic: string;
  reason: string;
  sheet: string;
};

/** The single best next problem, skipping ones the user already passed on. */
export async function pickNextProblem(skip: string[] = []): Promise<NextPick | null> {
  const user = await me();
  if (!user) return null;
  const [learning, targets, candidates] = await Promise.all([
    getLearning(user.id),
    getTopicTargets(),
    getNextCandidates(user.id),
  ]);
  const solvedBy: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const p of learning) if (p.difficulty) solvedBy[p.difficulty]++;
  const skipped = new Set(skip.filter((s) => Id.safeParse(s).success));
  const picks = suggestNext(
    candidates.filter((c) => !skipped.has(c.problemId)),
    masteryOf(learning, targets, requestNow()),
    solvedBy,
    1,
  );
  const p = picks[0];
  if (!p) return null;
  return {
    problemId: p.problemId,
    title: p.title,
    url: p.url,
    difficulty: p.difficulty,
    topic: topicLabel(p.topic),
    reason: p.reason,
    sheet: p.sheet,
  };
}

// ---------------------------------------------------------------- focus (Lab mode)

const FocusMode = z.enum(["stopwatch", "pomodoro-25", "pomodoro-50"]);
const DAY_MS = 86_400_000;

export async function startFocus(
  mode: string,
  label: string | null,
): Promise<{ ok: true; id: string; startedAt: number } | { ok: false; error: string }> {
  const user = await me();
  if (!user) return { ok: false, error: "Sign in first." };
  const m = FocusMode.safeParse(mode);
  if (!m.success) return { ok: false, error: "Unknown mode." };
  // Close anything still running (counted as wall-clock time).
  await db()
    .update(focusSessions)
    .set({
      endedAt: sql`least(now(), ${focusSessions.startedAt} + interval '6 hours')`,
      focusMs: sql`least(extract(epoch from (now() - ${focusSessions.startedAt}))::int * 1000, 6 * 3600000)`,
    })
    .where(and(eq(focusSessions.userId, user.id), isNull(focusSessions.endedAt)));
  const [row] = await db()
    .insert(focusSessions)
    .values({ userId: user.id, mode: m.data, label: label?.trim().slice(0, 80) || null })
    .returning({ id: focusSessions.id, startedAt: focusSessions.startedAt });
  updateTag(userTag(user.id));
  return { ok: true, id: row!.id, startedAt: row!.startedAt.getTime() };
}

const Report = z
  .object({
    focusMs: z.number().int().min(0).max(DAY_MS),
    awayMs: z.number().int().min(0).max(DAY_MS),
    switches: z.number().int().min(0).max(100_000),
  })
  .nullable();

/**
 * Ends a focus session. With the extension's report, focus/away come from tab tracking;
 * without it, the whole wall-clock time counts as focus. `discard` deletes it instead.
 */
/** What happened in a running study session so far, for the summary shown when you stop. */
export async function getStudySummary(id: string): Promise<StudyContents | null> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return null;
  const [row] = await db()
    .select({ startedAt: focusSessions.startedAt })
    .from(focusSessions)
    .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, user.id)));
  if (!row) return null;
  return getStudyContents(user.id, row.startedAt.getTime(), Date.now());
}

export async function stopFocus(
  id: string,
  report: { focusMs: number; awayMs: number; switches: number } | null,
  discard = false,
): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return fail("Not found.");
  const r = Report.safeParse(report);
  if (!r.success) return fail("Bad report.");
  const where = and(eq(focusSessions.id, id), eq(focusSessions.userId, user.id));
  if (discard) {
    await db().delete(focusSessions).where(where);
  } else {
    const [row] = await db()
      .select({ startedAt: focusSessions.startedAt })
      .from(focusSessions)
      .where(where);
    if (!row) return fail("Not found.");
    const wall = Math.min(Date.now() - row.startedAt.getTime(), DAY_MS);
    const focusMs = r.data ? Math.min(r.data.focusMs, wall) : wall;
    await db()
      .update(focusSessions)
      .set({
        endedAt: new Date(),
        focusMs,
        awayMs: r.data ? Math.min(r.data.awayMs, wall) : 0,
        switches: r.data?.switches ?? 0,
        tracked: Boolean(r.data),
      })
      .where(where);
  }
  updateTag(userTag(user.id));
  return { ok: true };
}

// ---------------------------------------------------------------- save for later

const Url = z.url().max(2000);

export async function saveForLater(url: string, title?: string): Promise<DailyResult> {
  const user = await me();
  if (!user) return fail("Sign in first.");
  const u = Url.safeParse(url.trim());
  if (!u.success || !/^https?:/.test(u.data)) return fail("Paste a full link (https://…).");
  let t = (title ?? "").trim().slice(0, 300);
  if (!t) {
    try {
      const parsed = new URL(u.data);
      t =
        `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`.slice(
          0,
          300,
        );
    } catch {
      t = u.data;
    }
  }
  const { kind, topic } = classifySaved(u.data, t);
  await db()
    .insert(savedItems)
    .values({ userId: user.id, url: u.data, title: t, kind, topic })
    .onConflictDoNothing();
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function setSavedDone(id: string, done: boolean): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return fail("Not found.");
  await db()
    .update(savedItems)
    .set({ doneAt: done ? new Date() : null })
    .where(and(eq(savedItems.id, id), eq(savedItems.userId, user.id)));
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function setSavedTopic(id: string, topic: string | null): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return fail("Not found.");
  const t = topic && /^[a-z-]{2,30}$/.test(topic) ? topic : null;
  await db()
    .update(savedItems)
    .set({ topic: t })
    .where(and(eq(savedItems.id, id), eq(savedItems.userId, user.id)));
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function removeSaved(id: string): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(id).success) return fail("Not found.");
  await db()
    .delete(savedItems)
    .where(and(eq(savedItems.id, id), eq(savedItems.userId, user.id)));
  updateTag(userTag(user.id));
  return { ok: true };
}

// ---------------------------------------------------------------- weekly review

const Goals = z.object({
  weekStart: z.iso.date(),
  mediums: z.number().int().min(0).max(200),
  focusHours: z.number().int().min(0).max(100),
  revisions: z.number().int().min(0).max(300),
  reflection: z.string().max(2000).nullable(),
});

export async function saveWeeklyGoals(values: z.input<typeof Goals>): Promise<DailyResult> {
  const user = await me();
  if (!user) return fail("Sign in first.");
  const v = Goals.safeParse(values);
  if (!v.success) return fail("Check the numbers.");
  await db()
    .insert(weeklyGoals)
    .values({ userId: user.id, ...v.data, reflection: v.data.reflection?.trim() || null })
    .onConflictDoUpdate({
      target: [weeklyGoals.userId, weeklyGoals.weekStart],
      set: {
        mediums: v.data.mediums,
        focusHours: v.data.focusHours,
        revisions: v.data.revisions,
        reflection: v.data.reflection?.trim() || null,
      },
    });
  updateTag(userTag(user.id));
  return { ok: true };
}

// ---------------------------------------------------------------- recall quiz

export async function recordRecall(problemId: string, correct: boolean): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(problemId).success) return fail("Not found.");
  const [p] = await db()
    .select({ id: problems.id })
    .from(problems)
    .where(eq(problems.id, problemId));
  if (!p) return fail("Not found.");
  await db()
    .insert(recallAnswers)
    .values({ userId: user.id, problemId, correct: Boolean(correct) });
  return { ok: true };
}

// ---------------------------------------------------------------- share + nudge

export async function shareProblem(
  groupId: string,
  problemId: string,
  note: string | null,
): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(groupId).success || !Id.safeParse(problemId).success) {
    return fail("Not found.");
  }
  if (!(await inGroup(user.id, groupId))) return fail("You're not in that group.");
  const [p] = await db()
    .select({ id: problems.id })
    .from(problems)
    .where(eq(problems.id, problemId));
  if (!p) return fail("Not found.");
  const inserted = await db()
    .insert(problemShares)
    .values({ groupId, problemId, fromUser: user.id, note: note?.trim().slice(0, 140) || null })
    .onConflictDoNothing()
    .returning({ id: problemShares.id });
  if (inserted.length === 0) return fail("Already shared with this group.");
  const members = await db()
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  for (const m of members) updateTag(userTag(m.userId));
  return { ok: true };
}

export async function nudgeMember(groupId: string, toUser: string): Promise<DailyResult> {
  const user = await me();
  if (!user || !Id.safeParse(groupId).success || !Id.safeParse(toUser).success) {
    return fail("Not found.");
  }
  if (toUser === user.id) return fail("You can't nudge yourself.");
  if (!(await inGroup(user.id, groupId)) || !(await inGroup(toUser, groupId))) {
    return fail("You're not in the same group.");
  }
  const inserted = await db()
    .insert(nudges)
    .values({ fromUser: user.id, toUser, groupId, day: await today(user.id) })
    .onConflictDoNothing()
    .returning({ id: nudges.id });
  if (inserted.length === 0) return fail("Already nudged today.");
  updateTag(userTag(toUser));
  return { ok: true };
}

export async function markNudgesSeen(): Promise<DailyResult> {
  const user = await me();
  if (!user) return fail("Sign in first.");
  await db()
    .update(nudges)
    .set({ seenAt: new Date() })
    .where(and(eq(nudges.toUser, user.id), isNull(nudges.seenAt)));
  updateTag(userTag(user.id));
  return { ok: true };
}

// ---------------------------------------------------------------- reminders

const Reminders = z.object({
  remindersOn: z.boolean(),
  reminderHour: z.number().int().min(0).max(23).nullable(),
  contestReminders: z.boolean(),
});

export async function saveReminderSettings(
  values: z.input<typeof Reminders>,
): Promise<DailyResult> {
  const user = await me();
  if (!user) return fail("Sign in first.");
  const v = Reminders.safeParse(values);
  if (!v.success) return fail("Invalid settings.");
  await db().update(profiles).set(v.data).where(eq(profiles.userId, user.id));
  updateTag(userTag(user.id));
  return { ok: true };
}

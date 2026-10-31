"use server";

import { randomBytes } from "node:crypto";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { freezeProblem } from "@upsolve/core";
import { groupMembers, groups, profiles, streakFreezes } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db, userTag } from "@/lib/db";
import { MAX_GROUP_MEMBERS, MAX_GROUPS_PER_USER, canManage } from "@/lib/social-data";
import { localDate } from "@/lib/time";

export type SocialResult = { ok: true } | { ok: false; error: string };

const Id = z.uuid();
const Name = z.string().trim().min(2, "Give it a name (2+ characters)").max(40);
/** 10 characters from a 32-letter alphabet without look-alikes (≈50 bits). */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const Code = z.string().regex(/^[a-z2-9]{10}$/);

function newInviteCode(): string {
  return [...randomBytes(10)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function signedIn() {
  const user = await getCurrentUser();
  return isDemoUser(user) ? null : user;
}

/** Invalidates every member's cached data (their group lists and boards). */
async function touchMembers(groupId: string, extra: string[] = []) {
  const rows = await db()
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  for (const id of new Set([...rows.map((r) => r.userId), ...extra])) updateTag(userTag(id));
}

async function myRole(userId: string, groupId: string) {
  const [row] = await db()
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  return row?.role ?? null;
}

async function groupCount(userId: string) {
  const [{ n } = { n: 0 }] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  return n;
}

export async function createGroup(name: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user) return { ok: false, error: "Sign in first." };
  const parsed = Name.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  if ((await groupCount(user.id)) >= MAX_GROUPS_PER_USER) {
    return { ok: false, error: `You can be in at most ${MAX_GROUPS_PER_USER} groups.` };
  }
  const [group] = await db()
    .insert(groups)
    .values({ name: parsed.data, inviteCode: newInviteCode(), createdBy: user.id })
    .returning({ id: groups.id });
  await db().insert(groupMembers).values({ groupId: group!.id, userId: user.id, role: "owner" });
  updateTag(userTag(user.id));
  redirect(`/dashboard/groups/${group!.id}`);
}

/** Joins by invite code, then opens the group. */
export async function joinGroup(code: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user) return { ok: false, error: "Sign in first." };
  const clean = code.trim().toLowerCase().split("/").pop() ?? "";
  if (!Code.safeParse(clean).success) return { ok: false, error: "That invite code isn't valid." };

  const [group] = await db()
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.inviteCode, clean));
  if (!group) return { ok: false, error: "No group has that invite code. It may have been reset." };

  if (!(await myRole(user.id, group.id))) {
    if ((await groupCount(user.id)) >= MAX_GROUPS_PER_USER) {
      return { ok: false, error: `You can be in at most ${MAX_GROUPS_PER_USER} groups.` };
    }
    const [{ n } = { n: 0 }] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));
    if (n >= MAX_GROUP_MEMBERS) return { ok: false, error: "This group is full." };
    await db()
      .insert(groupMembers)
      .values({ groupId: group.id, userId: user.id, role: "member" })
      .onConflictDoNothing();
    await touchMembers(group.id);
  }
  redirect(`/dashboard/groups/${group.id}`);
}

/**
 * Leaves a group. The owner's role passes to the longest-serving admin, else the
 * longest-standing member; an empty group is deleted.
 */
export async function leaveGroup(groupId: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(groupId).success) return { ok: false, error: "Not allowed." };
  const role = await myRole(user.id, groupId);
  if (!role) return { ok: false, error: "You're not in this group." };

  await db().transaction(async (tx) => {
    await tx
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
    const [next] = await tx
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(sql`(${groupMembers.role} = 'admin') desc`, asc(groupMembers.joinedAt))
      .limit(1);
    if (!next) await tx.delete(groups).where(eq(groups.id, groupId));
    else if (role === "owner") {
      await tx
        .update(groupMembers)
        .set({ role: "owner" })
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, next.userId)));
    }
  });
  await touchMembers(groupId, [user.id]);
  redirect("/dashboard/groups");
}

export async function removeMember(groupId: string, memberId: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(groupId).success || !Id.safeParse(memberId).success) {
    return { ok: false, error: "Not allowed." };
  }
  if (memberId === user.id) return { ok: false, error: "Use Leave group to leave." };
  const [mine, theirs] = await Promise.all([myRole(user.id, groupId), myRole(memberId, groupId)]);
  if (!canManage(mine)) return { ok: false, error: "Only admins can remove members." };
  if (!theirs) return { ok: false, error: "They're not in this group." };
  if (theirs === "owner") return { ok: false, error: "The owner can't be removed." };
  if (theirs === "admin" && mine !== "owner") {
    return { ok: false, error: "Only the owner can remove an admin." };
  }
  await db()
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberId)));
  await touchMembers(groupId, [memberId]);
  return { ok: true };
}

export async function renameGroup(groupId: string, name: string): Promise<SocialResult> {
  const user = await signedIn();
  const parsed = Name.safeParse(name);
  if (!user || !Id.safeParse(groupId).success) return { ok: false, error: "Not allowed." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  if (!canManage(await myRole(user.id, groupId))) {
    return { ok: false, error: "Only admins can rename the group." };
  }
  await db().update(groups).set({ name: parsed.data }).where(eq(groups.id, groupId));
  await touchMembers(groupId);
  return { ok: true };
}

/** New invite code; the old link stops working. */
export async function resetInvite(groupId: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(groupId).success) return { ok: false, error: "Not allowed." };
  if (!canManage(await myRole(user.id, groupId))) {
    return { ok: false, error: "Only admins can reset the link." };
  }
  await db().update(groups).set({ inviteCode: newInviteCode() }).where(eq(groups.id, groupId));
  await touchMembers(groupId);
  return { ok: true };
}

/**
 * Makes a member an admin, or an admin a member again. Any admin can promote; only the
 * owner can dismiss another admin (an admin can always step down themselves).
 */
export async function setMemberRole(
  groupId: string,
  memberId: string,
  role: "admin" | "member",
): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(groupId).success || !Id.safeParse(memberId).success) {
    return { ok: false, error: "Not allowed." };
  }
  if (role !== "admin" && role !== "member") return { ok: false, error: "Not allowed." };
  const [mine, theirs] = await Promise.all([myRole(user.id, groupId), myRole(memberId, groupId)]);
  if (!theirs) return { ok: false, error: "They're not in this group." };
  if (theirs === "owner") return { ok: false, error: "The owner's role can't be changed." };
  const self = memberId === user.id;
  if (role === "admin" && !canManage(mine)) {
    return { ok: false, error: "Only admins can make someone an admin." };
  }
  if (role === "member" && !self && mine !== "owner") {
    return { ok: false, error: "Only the owner can dismiss an admin." };
  }
  await db()
    .update(groupMembers)
    .set({ role })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberId)));
  await touchMembers(groupId);
  return { ok: true };
}

/** Hands the group to another member; the old owner stays on as an admin. Owner only. */
export async function transferOwnership(groupId: string, memberId: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(groupId).success || !Id.safeParse(memberId).success) {
    return { ok: false, error: "Not allowed." };
  }
  if (memberId === user.id) return { ok: false, error: "You already own this group." };
  const [mine, theirs] = await Promise.all([myRole(user.id, groupId), myRole(memberId, groupId)]);
  if (mine !== "owner") return { ok: false, error: "Only the owner can hand the group over." };
  if (!theirs) return { ok: false, error: "They're not in this group." };
  await db().transaction(async (tx) => {
    await tx
      .update(groupMembers)
      .set({ role: "owner" })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberId)));
    await tx
      .update(groupMembers)
      .set({ role: "admin" })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
  });
  await touchMembers(groupId);
  return { ok: true };
}

/**
 * Deletes the group for everyone: its members, board, shared problems and nudges go with it
 * (they cascade). Owner or admin; the exact group name confirms it.
 */
export async function deleteGroup(groupId: string, confirmName: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(groupId).success) return { ok: false, error: "Not allowed." };
  if (!canManage(await myRole(user.id, groupId))) {
    return { ok: false, error: "Only admins can delete the group." };
  }
  const [group] = await db()
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId));
  if (!group) return { ok: false, error: "That group is gone." };
  if (confirmName.trim() !== group.name) {
    return { ok: false, error: "Type the group name exactly to confirm." };
  }
  const members = await db()
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  await db().delete(groups).where(eq(groups.id, groupId));
  for (const m of members) updateTag(userTag(m.userId));
  redirect("/dashboard/groups");
}

// ---------------------------------------------------------------- privacy switches

export async function setSocialPrefs(values: {
  onLeaderboards?: boolean;
  shareLive?: boolean;
}): Promise<SocialResult> {
  const user = await signedIn();
  const parsed = z
    .object({ onLeaderboards: z.boolean().optional(), shareLive: z.boolean().optional() })
    .safeParse(values);
  if (!user || !parsed.success) return { ok: false, error: "Not allowed." };
  if (parsed.data.onLeaderboards) {
    const [p] = await db()
      .select({ collegeId: profiles.collegeId })
      .from(profiles)
      .where(eq(profiles.userId, user.id));
    if (!p?.collegeId) return { ok: false, error: "Add your college to your profile first." };
  }
  await db().update(profiles).set(parsed.data).where(eq(profiles.userId, user.id));
  updateTag(userTag(user.id));
  return { ok: true };
}

// ---------------------------------------------------------------- streak freezes

export async function addStreakFreeze(start: string, end: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user) return { ok: false, error: "Sign in first." };
  const [p] = await db()
    .select({ tz: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.userId, user.id));
  const today = localDate(p?.tz ?? "Asia/Kolkata", Date.now());
  const existing = await db()
    .select({ start: streakFreezes.startDate, end: streakFreezes.endDate })
    .from(streakFreezes)
    .where(and(eq(streakFreezes.userId, user.id), gte(streakFreezes.endDate, today)));
  const problem = freezeProblem(start, end, today, existing);
  if (problem) return { ok: false, error: problem };
  await db().insert(streakFreezes).values({ userId: user.id, startDate: start, endDate: end });
  updateTag(userTag(user.id));
  return { ok: true };
}

/** Removes a freeze that hasn't started yet (a running one can't be cancelled retroactively). */
export async function removeStreakFreeze(id: string): Promise<SocialResult> {
  const user = await signedIn();
  if (!user || !Id.safeParse(id).success) return { ok: false, error: "Not allowed." };
  const [p] = await db()
    .select({ tz: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.userId, user.id));
  const today = localDate(p?.tz ?? "Asia/Kolkata", Date.now());
  const deleted = await db()
    .delete(streakFreezes)
    .where(
      and(
        eq(streakFreezes.id, id),
        eq(streakFreezes.userId, user.id),
        sql`${streakFreezes.startDate} > ${today}`,
      ),
    )
    .returning({ id: streakFreezes.id });
  if (deleted.length === 0)
    return { ok: false, error: "A freeze that already started can't be removed." };
  updateTag(userTag(user.id));
  return { ok: true };
}

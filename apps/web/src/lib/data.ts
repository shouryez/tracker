import "server-only";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { ADAPTERS, type Platform, type PlatformSnapshot } from "@upsolve/adapters";
import {
  colleges,
  contestResults,
  platformAccounts,
  platformProblems,
  profiles,
  submissions,
} from "@upsolve/db";
import { db, userTag } from "@/lib/db";
import {
  activeDays,
  currentStreak,
  heatmapLevels,
  mergeCalendars,
  sumSolved,
  topTopics,
} from "@/lib/stats";
import { STALE_AFTER_MS } from "@/lib/sync";

// All readers take an id that the caller already resolved from the session
// (lib/auth.ts). Never pass a user id that came from the client.

export type ProfileWithCollege = typeof profiles.$inferSelect & {
  college: { id: string; name: string; shortName: string | null } | null;
};

export async function getProfile(userId: string): Promise<ProfileWithCollege | null> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const [row] = await db()
    .select({ profile: profiles, college: colleges })
    .from(profiles)
    .leftJoin(colleges, eq(colleges.id, profiles.collegeId))
    .where(eq(profiles.userId, userId));
  if (!row) return null;
  const { college } = row;
  return {
    ...row.profile,
    college: college ? { id: college.id, name: college.name, shortName: college.shortName } : null,
  };
}

export type AccountView = {
  id: string;
  platform: Platform;
  handle: string;
  verified: boolean;
  verifyCode: string | null;
  verifyRequestedAt: Date | null;
  status: (typeof platformAccounts.$inferSelect)["status"];
  syncing: boolean;
  lastSyncedAt: Date | null;
  lastError: string | null;
  snapshot: PlatformSnapshot | null;
};

export async function getAccounts(userId: string): Promise<AccountView[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const rows = await db()
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.userId, userId))
    .orderBy(asc(platformAccounts.createdAt));
  return rows.map((a) => ({
    id: a.id,
    platform: a.platform,
    handle: a.handle,
    verified: a.verifiedAt !== null,
    verifyCode: a.verifyCode,
    verifyRequestedAt: a.verifyRequestedAt,
    status: a.status,
    syncing: a.syncStartedAt !== null,
    lastSyncedAt: a.lastSyncedAt,
    lastError: a.lastError,
    snapshot: a.snapshot,
  }));
}

export function needsSync(accounts: AccountView[], now = Date.now()) {
  return accounts.some(
    (a) => !a.syncing && (!a.lastSyncedAt || now - a.lastSyncedAt.getTime() > STALE_AFTER_MS),
  );
}

export type ContestSeries = { platform: Platform; points: { at: Date; rating: number }[] };

/** Builds every number the overview and public profile show, from stored snapshots. */
export function buildStats(accounts: AccountView[], today = new Date()) {
  const snapshots = accounts.flatMap((a) => (a.snapshot ? [a.snapshot] : []));
  const calendar = mergeCalendars(snapshots.map((s) => s.calendar));
  const rated = accounts
    .filter((a) => a.snapshot?.rating != null)
    .sort((a, b) => (b.snapshot!.rating ?? 0) - (a.snapshot!.rating ?? 0));
  const best = rated[0];

  return {
    solved: sumSolved(snapshots),
    streak: currentStreak(calendar, today),
    activeDays: activeDays(calendar, today),
    heatmap26: heatmapLevels(calendar, today, 26 * 7),
    heatmap52: heatmapLevels(calendar, today, 52 * 7),
    topics: topTopics(snapshots),
    bestRating: best
      ? { platform: best.platform, rating: best.snapshot!.rating!, label: best.snapshot!.rankLabel }
      : null,
  };
}

export async function getContestSeries(userId: string): Promise<ContestSeries[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const rows = await db()
    .select({
      platform: contestResults.platform,
      at: contestResults.at,
      rating: contestResults.newRating,
    })
    .from(contestResults)
    .where(eq(contestResults.userId, userId))
    .orderBy(asc(contestResults.at));
  const byPlatform = new Map<Platform, ContestSeries>();
  for (const r of rows) {
    if (r.rating == null) continue;
    const series = byPlatform.get(r.platform) ?? { platform: r.platform, points: [] };
    series.points.push({ at: r.at, rating: r.rating });
    byPlatform.set(r.platform, series);
  }
  return [...byPlatform.values()];
}

export type RecentSolve = {
  id: string;
  platform: Platform;
  title: string;
  url: string;
  difficultyRaw: string | null;
  rating: number | null;
  submittedAt: Date;
};

export async function getRecentSolves(userId: string, limit = 8): Promise<RecentSolve[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  return db()
    .select({
      id: submissions.id,
      platform: submissions.platform,
      title: platformProblems.title,
      url: platformProblems.url,
      difficultyRaw: platformProblems.difficultyRaw,
      rating: platformProblems.rating,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(platformProblems, eq(platformProblems.id, submissions.platformProblemId))
    .where(and(eq(submissions.userId, userId), eq(submissions.verdict, "AC")))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit);
}

export async function searchCollegesByName(query: string) {
  "use cache";
  cacheTag("colleges");
  cacheLife("hours");

  const q = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
  return db()
    .select({
      id: colleges.id,
      name: colleges.name,
      shortName: colleges.shortName,
      city: colleges.city,
    })
    .from(colleges)
    .where(or(ilike(colleges.name, q), ilike(colleges.shortName, q)))
    .orderBy(asc(colleges.name))
    .limit(8);
}

export type PublicProfile = {
  name: string | null;
  handle: string;
  avatarUrl: string | null;
  college: string | null;
  gradYear: number | null;
  branch: string | null;
  accounts: AccountView[];
};

/** Only returns profiles their owner made public. */
export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  "use cache";
  cacheTag(`profile:${handle.toLowerCase()}`);
  cacheLife("minutes");

  const [row] = await db()
    .select({ profile: profiles, college: colleges })
    .from(profiles)
    .leftJoin(colleges, eq(colleges.id, profiles.collegeId))
    .where(and(eq(profiles.handle, handle.toLowerCase()), eq(profiles.isPublic, true)));
  if (!row?.profile.handle) return null;

  const accounts = (await getAccounts(row.profile.userId)).map((a) => ({
    ...a,
    // Never expose verification codes publicly.
    verifyCode: null,
    verifyRequestedAt: null,
    lastError: null,
  }));
  return {
    name: row.profile.name,
    handle: row.profile.handle,
    avatarUrl: row.profile.avatarUrl,
    college: row.college?.name ?? null,
    gradYear: row.profile.gradYear,
    branch: row.profile.branch,
    accounts,
  };
}

/** Platforms that can be connected right now, in display order. */
export const CONNECTABLE = (["leetcode", "codeforces", "geeksforgeeks"] as const).filter(
  (p) => ADAPTERS[p],
);

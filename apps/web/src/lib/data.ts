import "server-only";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { ADAPTERS, type Platform, type PlatformSnapshot } from "@upsolve/adapters";
import { frozenDays } from "@upsolve/core";
import { colleges, contestResults, platformAccounts, profiles } from "@upsolve/db";
import { db, userTag } from "@/lib/db";
import {
  activeDays,
  currentStreak,
  dayKey,
  heatmapLevels,
  localCalendar,
  mergeCalendars,
  sumSolved,
  topTopics,
  type LocalActivity,
} from "@/lib/stats";
import { localDate, studyDay } from "@/lib/time";
import { getStreakFreezes } from "@/lib/social-data";
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

/**
 * Builds every number the overview and public profile show, from stored snapshots. With
 * `local`, days follow the person's own clock (timezone and day reset) instead of UTC.
 */
export function buildStats(
  accounts: AccountView[],
  now = new Date(),
  frozen: ReadonlySet<string> = new Set(),
  local?: LocalActivity,
) {
  const snapshots = accounts.flatMap((a) => (a.snapshot ? [a.snapshot] : []));
  const calendar = local
    ? localCalendar(
        accounts.flatMap((a) =>
          a.snapshot ? [{ platform: a.platform, calendar: a.snapshot.calendar }] : [],
        ),
        local,
      )
    : mergeCalendars(snapshots.map((s) => s.calendar));
  // Day arithmetic runs on UTC dates, so "today" is noon UTC of the local study date.
  const today = local ? new Date(`${local.todayKey}T12:00:00Z`) : now;
  const rated = accounts
    .filter((a) => a.snapshot?.rating != null)
    .sort((a, b) => (b.snapshot!.rating ?? 0) - (a.snapshot!.rating ?? 0));
  const best = rated[0];

  return {
    solved: sumSolved(snapshots),
    streak: currentStreak(calendar, today, frozen),
    activeDays: activeDays(calendar, today),
    heatmap26: heatmapLevels(calendar, today, 26 * 7),
    /** Submissions per day (local with `local`, else UTC) for the last 26 weeks, oldest first. */
    days182: Array.from({ length: 26 * 7 }, (_, i) => {
      const date = dayKey(new Date(today.getTime() - (26 * 7 - 1 - i) * 86_400_000));
      return { date, count: calendar[date] ?? 0 };
    }),
    heatmap52: heatmapLevels(calendar, today, 52 * 7),
    topics: topTopics(snapshots),
    bestRating: best
      ? { platform: best.platform, rating: best.snapshot!.rating!, label: best.snapshot!.rankLabel }
      : null,
  };
}

/**
 * Stored submissions per platform per local study day (timezone + day reset) for the last
 * ~400 days, for buildStats.
 */
export async function getLocalActivity(
  userId: string,
  tz: string,
  resetHour: number,
  now: number,
): Promise<LocalActivity> {
  const todayKey = localDate(tz, studyDay(tz, now, resetHour).start);
  const since = now - 400 * 86_400_000;
  const sinceKey = localDate(tz, studyDay(tz, since, resetHour).start);
  const rows = (await db().execute(sql`
    select platform::text as platform,
      to_char((submitted_at at time zone ${tz}) - make_interval(hours => ${resetHour}), 'YYYY-MM-DD') as day,
      count(*)::int as n
    from submissions
    where user_id = ${userId} and submitted_at >= ${new Date(since).toISOString()}::timestamptz
    group by 1, 2`)) as unknown as { platform: string; day: string; n: number }[];
  const byPlatform: LocalActivity["byPlatform"] = {};
  for (const r of rows) {
    if (r.day < sinceKey) continue;
    (byPlatform[r.platform] ??= {})[r.day] = r.n;
  }
  return { byPlatform, sinceKey, todayKey };
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
  /** Canonical problem, for the problem page. */
  problemId: string | null;
  platform: Platform;
  title: string;
  url: string;
  difficultyRaw: string | null;
  rating: number | null;
  submittedAt: Date;
  /** Accepted submissions on this problem (re-solves included). */
  accepted: number;
};

/** Latest solved problems, each once, newest first. */
export async function getRecentSolves(userId: string, limit = 8): Promise<RecentSolve[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const rows = (await db().execute(sql`
    select pp.id, pp.problem_id as "problemId", pp.platform, pp.title, pp.url,
           pp.difficulty_raw as "difficultyRaw", pp.rating,
           max(s.submitted_at) as "submittedAt", count(*)::int as accepted
    from submissions s
    join platform_problems pp on pp.id = s.platform_problem_id
    where s.user_id = ${userId} and s.verdict = 'AC'
    group by pp.id
    order by max(s.submitted_at) desc
    limit ${limit}`)) as unknown as (Omit<RecentSolve, "submittedAt"> & { submittedAt: unknown })[];
  return rows.map((r) => ({ ...r, submittedAt: new Date(String(r.submittedAt)) }));
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
  /** An admin verified their college ID. */
  collegeVerified: boolean;
  gradYear: number | null;
  branch: string | null;
  accounts: AccountView[];
  /** Exam-week freeze days (YYYY-MM-DD), so the public streak matches the dashboard. */
  frozenDays: string[];
  /** Server-only: used to work out badges. Never rendered. */
  userId: string;
  timezone: string;
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
    collegeVerified: Boolean(row.college && row.profile.collegeVerifiedAt),
    gradYear: row.profile.gradYear,
    branch: row.profile.branch,
    accounts,
    frozenDays: [...frozenDays(await getStreakFreezes(row.profile.userId))],
    userId: row.profile.userId,
    timezone: row.profile.timezone,
  };
}

/** Platforms that can be connected right now, in display order. */
export const CONNECTABLE = (["leetcode", "codeforces", "geeksforgeeks"] as const).filter(
  (p) => ADAPTERS[p],
);

import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { extensionTokens, platformProblems, practiceSessions, profiles } from "@upsolve/db";
import { db, userTag } from "@/lib/db";

// Readers for extension-tracked sessions. Like lib/data.ts, callers pass a user id
// they resolved from the session, never one from the client.

export type SessionRow = {
  id: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard" | null;
  startedAt: Date;
  activeMs: number;
  idleMs: number;
  submits: number;
  outcome: "open" | "solved" | "abandoned";
  independence: "solo" | "hint" | "solution" | null;
  note: string | null;
  mistakeTags: string[];
};

export async function getSessions(userId: string, limit = 10): Promise<SessionRow[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const rows = await db()
    .select({
      id: practiceSessions.id,
      title: platformProblems.title,
      url: platformProblems.url,
      difficultyRaw: platformProblems.difficultyRaw,
      startedAt: practiceSessions.startedAt,
      activeMs: practiceSessions.activeMs,
      idleMs: practiceSessions.idleMs,
      submits: practiceSessions.submits,
      outcome: practiceSessions.outcome,
      independence: practiceSessions.independence,
      note: practiceSessions.note,
      mistakeTags: practiceSessions.mistakeTags,
    })
    .from(practiceSessions)
    .innerJoin(platformProblems, eq(platformProblems.id, practiceSessions.platformProblemId))
    .where(eq(practiceSessions.userId, userId))
    .orderBy(desc(practiceSessions.startedAt))
    .limit(limit);

  return rows.map(({ difficultyRaw, ...r }) => ({
    ...r,
    difficulty:
      (["easy", "medium", "hard"] as const).find((d) => d === difficultyRaw?.toLowerCase()) ?? null,
  }));
}

export type SessionStats = {
  /** Active ms per day for the last 7 days in the user's timezone, oldest first. */
  focusByDay: { day: string; activeMs: number }[];
  focusWeekMs: number;
  /** How solved sessions were solved (only those the user answered). */
  honest: { solo: number; hint: number; solution: number };
  soloRate: number | null;
  solvedSessions: number;
  totalSessions: number;
};

export async function getSessionStats(userId: string): Promise<SessionStats> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  const [profile] = await db()
    .select({ tz: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  const tz = profile?.tz ?? "Asia/Kolkata";
  const localDay = sql<string>`to_char(${practiceSessions.startedAt} at time zone ${tz}, 'YYYY-MM-DD')`;
  const weekStart = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz}) - interval '6 days'`;

  const [days, totals] = await Promise.all([
    db()
      .select({ day: localDay, activeMs: sql<number>`sum(${practiceSessions.activeMs})::int` })
      .from(practiceSessions)
      .where(and(eq(practiceSessions.userId, userId), gte(practiceSessions.startedAt, weekStart)))
      // Group by position: the same tz param twice still counts as two different expressions.
      .groupBy(sql`1`),
    db()
      .select({
        total: sql<number>`count(*)::int`,
        solved: sql<number>`count(*) filter (where ${practiceSessions.outcome} = 'solved')::int`,
        solo: sql<number>`count(*) filter (where ${practiceSessions.independence} = 'solo')::int`,
        hint: sql<number>`count(*) filter (where ${practiceSessions.independence} = 'hint')::int`,
        solution: sql<number>`count(*) filter (where ${practiceSessions.independence} = 'solution')::int`,
      })
      .from(practiceSessions)
      .where(eq(practiceSessions.userId, userId)),
  ]);

  // Build the 7 local-day keys ending today.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const byDay = new Map(days.map((d) => [d.day, d.activeMs]));
  const focusByDay = Array.from({ length: 7 }, (_, i) => {
    const day = fmt.format(new Date(Date.now() - (6 - i) * 86_400_000));
    return { day, activeMs: byDay.get(day) ?? 0 };
  });

  const t = totals[0] ?? { total: 0, solved: 0, solo: 0, hint: 0, solution: 0 };
  const answered = t.solo + t.hint + t.solution;
  return {
    focusByDay,
    focusWeekMs: focusByDay.reduce((n, d) => n + d.activeMs, 0),
    honest: { solo: t.solo, hint: t.hint, solution: t.solution },
    soloRate: answered > 0 ? t.solo / answered : null,
    solvedSessions: t.solved,
    totalSessions: t.total,
  };
}

export type ExtensionTokenView = {
  id: string;
  label: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export async function getExtensionTokens(userId: string): Promise<ExtensionTokenView[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  return db()
    .select({
      id: extensionTokens.id,
      label: extensionTokens.label,
      createdAt: extensionTokens.createdAt,
      lastUsedAt: extensionTokens.lastUsedAt,
    })
    .from(extensionTokens)
    .where(and(eq(extensionTokens.userId, userId), isNull(extensionTokens.revokedAt)))
    .orderBy(desc(extensionTokens.createdAt));
}

export { formatDuration } from "@/lib/format";

/** The session being solved right now, as last reported by the extension. */
export type LiveSession = {
  title: string;
  url: string;
  platform: string;
  difficulty: "easy" | "medium" | "hard" | null;
  startedAt: number;
  activeMs: number;
  submits: number;
  /** When the extension last reported: on every pause and resume, and every 30 s while solving. */
  reportedAt: number;
  /** The extension's timer at that report; null from builds before it was sent. */
  status: "armed" | "active" | "paused" | "solved" | null;
};

/** Uncached on purpose: it has to be fresh. Open sessions untouched for 30 minutes don't count. */
export async function getLiveSession(userId: string): Promise<LiveSession | null> {
  const [row] = await db()
    .select({
      title: platformProblems.title,
      url: platformProblems.url,
      platform: platformProblems.platform,
      difficultyRaw: platformProblems.difficultyRaw,
      startedAt: practiceSessions.startedAt,
      activeMs: practiceSessions.activeMs,
      submits: practiceSessions.submits,
      updatedAt: practiceSessions.updatedAt,
      status: practiceSessions.liveStatus,
    })
    .from(practiceSessions)
    .innerJoin(platformProblems, eq(platformProblems.id, practiceSessions.platformProblemId))
    .where(
      and(
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.outcome, "open"),
        isNull(practiceSessions.endedAt),
        gte(practiceSessions.updatedAt, sql`now() - interval '30 minutes'`),
      ),
    )
    .orderBy(desc(practiceSessions.updatedAt))
    .limit(1);
  if (!row) return null;
  const { difficultyRaw, updatedAt, startedAt, status, ...rest } = row;
  return {
    ...rest,
    status: (["armed", "active", "paused", "solved"] as const).find((s) => s === status) ?? null,
    difficulty:
      (["easy", "medium", "hard"] as const).find((d) => d === difficultyRaw?.toLowerCase()) ?? null,
    startedAt: startedAt.getTime(),
    reportedAt: updatedAt.getTime(),
  };
}

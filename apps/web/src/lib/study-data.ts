import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// What happened during a study session (a Lab focus session): the problems you worked on,
// solves the platforms reported, videos watched in the app and sheet items you ticked.
// Callers pass a user id resolved from the session, never one from the client.

export type StudyProblem = {
  title: string;
  url: string;
  platform: string;
  difficulty: "easy" | "medium" | "hard" | null;
  /** "solved" | "open" | "abandoned", or "synced" for an Accepted only the platform reported. */
  outcome: string;
  activeMs: number;
  independence: "solo" | "hint" | "solution" | null;
  at: number;
};
export type StudyVideo = {
  title: string;
  url: string;
  sheet: string | null;
  watchedMs: number;
  at: number;
};
export type StudyTick = { title: string; sheet: string; at: number };
export type StudyContents = { problems: StudyProblem[]; videos: StudyVideo[]; ticks: StudyTick[] };

export type StudySession = {
  id: string;
  label: string | null;
  startedAt: number;
  endedAt: number;
  focusMs: number;
  awayMs: number;
  tracked: boolean;
} & StudyContents;

const difficultyOf = (raw: string | null) =>
  (["easy", "medium", "hard"] as const).find((d) => d === raw?.toLowerCase()) ?? null;

/** Everything in [from, to), oldest first. Raw sql params are ISO strings (postgres-js). */
async function contentsBetween(userId: string, from: number, to: number) {
  const f = new Date(from).toISOString();
  const t = new Date(to).toISOString();
  const [sessions, synced, videos, ticks] = await Promise.all([
    db().execute(sql`
      select pp.title, pp.url, pp.platform, pp.difficulty_raw as "difficultyRaw", ps.outcome,
             ps.active_ms as "activeMs", ps.independence, ps.platform_problem_id as "ppId",
             extract(epoch from ps.started_at) * 1000 as at
      from practice_sessions ps join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${userId} and ps.started_at < ${t}::timestamptz
        and coalesce(ps.ended_at, ps.updated_at) >= ${f}::timestamptz
      order by ps.started_at`),
    db().execute(sql`
      select distinct on (s.platform_problem_id) pp.title, pp.url, pp.platform,
             pp.difficulty_raw as "difficultyRaw", s.platform_problem_id as "ppId",
             extract(epoch from s.submitted_at) * 1000 as at
      from submissions s join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id = ${userId} and s.verdict = 'AC'
        and s.submitted_at >= ${f}::timestamptz and s.submitted_at < ${t}::timestamptz
      order by s.platform_problem_id, s.submitted_at`),
    db().execute(sql`
      select vw.title, vw.url, sh.name as sheet, vw.watched_ms as "watchedMs",
             extract(epoch from vw.started_at) * 1000 as at
      from video_watches vw left join sheets sh on sh.id = vw.sheet_id
      where vw.user_id = ${userId} and vw.started_at >= ${f}::timestamptz and vw.started_at < ${t}::timestamptz
      order by vw.started_at`),
    db().execute(sql`
      select si.title, sh.name as sheet, extract(epoch from sm.created_at) * 1000 as at
      from sheet_marks sm
      join sheet_items si on si.sheet_id = sm.sheet_id and si.item_key = sm.item_key
      join sheets sh on sh.id = sm.sheet_id
      where sm.user_id = ${userId} and sm.created_at >= ${f}::timestamptz and sm.created_at < ${t}::timestamptz
      order by sm.created_at`),
  ]);
  type Row = Record<string, unknown>;
  const timed = (sessions as unknown as Row[]).map((r) => ({
    title: String(r.title),
    url: String(r.url),
    platform: String(r.platform),
    difficulty: difficultyOf(r.difficultyRaw as string | null),
    outcome: String(r.outcome),
    activeMs: Number(r.activeMs),
    independence: (r.independence as StudyProblem["independence"]) ?? null,
    at: Number(r.at),
    ppId: String(r.ppId),
  }));
  const timedIds = new Set(timed.map((p) => p.ppId));
  const fromSync = (synced as unknown as Row[])
    .filter((r) => !timedIds.has(String(r.ppId)))
    .map((r) => ({
      title: String(r.title),
      url: String(r.url),
      platform: String(r.platform),
      difficulty: difficultyOf(r.difficultyRaw as string | null),
      outcome: "synced",
      activeMs: 0,
      independence: null,
      at: Number(r.at),
      ppId: String(r.ppId),
    }));
  return {
    problems: [...timed, ...fromSync].sort((a, b) => a.at - b.at) as (StudyProblem & {
      ppId: string;
    })[],
    videos: (videos as unknown as Row[]).map((r) => ({
      title: String(r.title),
      url: String(r.url),
      sheet: (r.sheet as string | null) ?? null,
      watchedMs: Number(r.watchedMs),
      at: Number(r.at),
    })),
    ticks: (ticks as unknown as Row[]).map((r) => ({
      title: String(r.title),
      sheet: String(r.sheet),
      at: Number(r.at),
    })),
  };
}

/** Drops the internal platform-problem id the two problem sources were matched on. */
const strip = ({ problems, videos, ticks }: Awaited<ReturnType<typeof contentsBetween>>) => ({
  problems: problems.map((p): StudyProblem => ({
    title: p.title,
    url: p.url,
    platform: p.platform,
    difficulty: p.difficulty,
    outcome: p.outcome,
    activeMs: p.activeMs,
    independence: p.independence,
    at: p.at,
  })),
  videos,
  ticks,
});

/** What happened between `from` and `to` (the open session's summary when you stop). */
export async function getStudyContents(
  userId: string,
  from: number,
  to: number,
): Promise<StudyContents> {
  return strip(await contentsBetween(userId, from, to));
}

/** Recent finished study sessions with what you did in each, newest first. Uncached. */
export async function getStudyHistory(userId: string, limit = 10): Promise<StudySession[]> {
  const rows = (await db().execute(sql`
    select id, label, focus_ms as "focusMs", away_ms as "awayMs", tracked,
           extract(epoch from started_at) * 1000 as "startedAt",
           extract(epoch from ended_at) * 1000 as "endedAt"
    from focus_sessions
    where user_id = ${userId} and ended_at is not null
    order by started_at desc limit ${limit}`)) as unknown as {
    id: string;
    label: string | null;
    focusMs: number;
    awayMs: number;
    tracked: boolean;
    startedAt: number;
    endedAt: number;
  }[];
  if (rows.length === 0) return [];
  const sessions = rows.map((r) => ({
    ...r,
    startedAt: Number(r.startedAt),
    endedAt: Number(r.endedAt),
  }));
  // One pass over the whole span, then each item goes to the session it happened in.
  const all = await contentsBetween(
    userId,
    Math.min(...sessions.map((s) => s.startedAt)),
    Math.max(...sessions.map((s) => s.endedAt)),
  );
  return sessions.map((s) => {
    const inside = (at: number) => at >= s.startedAt && at < s.endedAt;
    return {
      ...s,
      ...strip({
        problems: all.problems.filter((p) => inside(p.at)),
        videos: all.videos.filter((v) => inside(v.at)),
        ticks: all.ticks.filter((t) => inside(t.at)),
      }),
    };
  });
}

// DsaKaro

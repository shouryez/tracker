import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { consistencyScore, rankBy, type WeekActivity } from "@upsolve/core";
import { db, userTag } from "@/lib/db";

// Groups, leaderboards and study rooms (Phase 5). Every reader takes the
// viewer's session-resolved id and checks membership / opt-in itself.

/** Boards share one week: Monday 00:00 India time (the app's home timezone). */
export const BOARD_TZ = "Asia/Kolkata";
/** A session uploaded this recently counts as "solving now" (the extension uploads every minute). */
const LIVE_WINDOW_SECONDS = 150;
export const MAX_GROUPS_PER_USER = 20;
export const MAX_GROUP_MEMBERS = 50;

export type BoardMetric = "consistency" | "solved" | "rating";
export const BOARD_METRICS: { value: BoardMetric; label: string }[] = [
  { value: "consistency", label: "Consistency" },
  { value: "solved", label: "Solved this week" },
  { value: "rating", label: "Contest rating" },
];

export type BoardRow = WeekActivity & {
  userId: string;
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
  gradYear: number | null;
  rating: number | null;
  score: number;
};

/** This week's numbers for every user the `members` subquery returns (it must select `user_id`). */
async function boardRows(members: SQL, weekStart: number): Promise<BoardRow[]> {
  const since = sql`to_timestamp(${weekStart / 1000})`;
  const rows = (await db().execute(sql`
    with m as (${members}),
    act as (
      select user_id, (submitted_at at time zone ${BOARD_TZ})::date as d from submissions
      where user_id in (select user_id from m) and submitted_at >= ${since}
      union
      select user_id, (started_at at time zone ${BOARD_TZ})::date from practice_sessions
      where user_id in (select user_id from m) and started_at >= ${since}
    ),
    solved as (
      select s.user_id, count(distinct coalesce(pp.problem_id, pp.id))::int as n
      from submissions s join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id in (select user_id from m) and s.verdict = 'AC' and s.submitted_at >= ${since}
      group by 1
    ),
    resolves as (
      -- Accepted again at least a day after an earlier Accepted on the same problem.
      select s.user_id, count(distinct pp.problem_id)::int as n
      from submissions s join platform_problems pp on pp.id = s.platform_problem_id
      where s.user_id in (select user_id from m) and s.verdict = 'AC' and s.submitted_at >= ${since}
        and pp.problem_id is not null
        and exists (
          select 1 from submissions s2 join platform_problems pp2 on pp2.id = s2.platform_problem_id
          where s2.user_id = s.user_id and pp2.problem_id = pp.problem_id and s2.verdict = 'AC'
            and s2.submitted_at < s.submitted_at - interval '1 day')
      group by 1
    ),
    manual as (
      select user_id, count(*)::int as n from review_logs
      where user_id in (select user_id from m) and at >= ${since}
        and action in ('remembered', 'shaky', 'forgot')
      group by 1
    ),
    focus as (
      select user_id, sum(active_ms)::float8 as ms from practice_sessions
      where user_id in (select user_id from m) and started_at >= ${since}
      group by 1
    ),
    rating as (
      select user_id, max((snapshot->>'rating')::int) as r from platform_accounts
      where user_id in (select user_id from m) and snapshot->>'rating' is not null
      group by 1
    )
    select p.user_id as "userId", p.name, p.handle, p.avatar_url as "avatarUrl",
           p.grad_year as "gradYear",
           (select count(distinct d)::int from act where act.user_id = p.user_id) as "activeDays",
           coalesce(solved.n, 0) as solved,
           coalesce(resolves.n, 0) + coalesce(manual.n, 0) as reviews,
           coalesce(focus.ms, 0) as "focusMs",
           rating.r as rating
    from profiles p
    left join solved on solved.user_id = p.user_id
    left join resolves on resolves.user_id = p.user_id
    left join manual on manual.user_id = p.user_id
    left join focus on focus.user_id = p.user_id
    left join rating on rating.user_id = p.user_id
    where p.user_id in (select user_id from m)`)) as unknown as Omit<BoardRow, "score">[];
  return rows.map((r) => ({ ...r, score: consistencyScore(r) }));
}

export function rankBoard(rows: BoardRow[], metric: BoardMetric) {
  const value = (r: BoardRow) =>
    metric === "consistency" ? r.score : metric === "solved" ? r.solved : (r.rating ?? -1);
  const ranked = rankBy(rows, value);
  // Unrated people don't get a contest-rating rank.
  return metric === "rating" ? ranked.filter((r) => r.rating !== null) : ranked;
}

// ---------------------------------------------------------------- groups

export type GroupSummary = {
  id: string;
  name: string;
  role: "owner" | "member";
  members: number;
};

export async function getMyGroups(userId: string): Promise<GroupSummary[]> {
  "use cache";
  cacheTag(userTag(userId), "groups");
  cacheLife("minutes");

  return (await db().execute(sql`
    select g.id, g.name, gm.role,
           (select count(*)::int from group_members x where x.group_id = g.id) as members
    from group_members gm join groups g on g.id = gm.group_id
    where gm.user_id = ${userId}
    order by gm.joined_at`)) as unknown as GroupSummary[];
}

export type GroupDetail = {
  id: string;
  name: string;
  inviteCode: string;
  role: "owner" | "member";
  members: {
    userId: string;
    name: string | null;
    handle: string | null;
    role: "owner" | "member";
  }[];
};

/** The group, or null when the viewer isn't a member. */
export async function getGroup(userId: string, groupId: string): Promise<GroupDetail | null> {
  // Not cached: membership changes must show immediately and the query is small.
  const rows = (await db().execute(sql`
    select g.id, g.name, g.invite_code as "inviteCode", me.role
    from groups g join group_members me on me.group_id = g.id and me.user_id = ${userId}
    where g.id = ${groupId}`)) as unknown as Omit<GroupDetail, "members">[];
  const group = rows[0];
  if (!group) return null;
  const members = (await db().execute(sql`
    select gm.user_id as "userId", p.name, p.handle, gm.role
    from group_members gm left join profiles p on p.user_id = gm.user_id
    where gm.group_id = ${groupId}
    order by (gm.role = 'owner') desc, gm.joined_at`)) as unknown as GroupDetail["members"];
  return { ...group, members };
}

export async function getGroupBoard(groupId: string, weekStart: number): Promise<BoardRow[]> {
  return boardRows(sql`select user_id from group_members where group_id = ${groupId}`, weekStart);
}

/** Name and size for the join page (anyone with the code may see these). */
export async function getInvite(code: string) {
  const rows = (await db().execute(sql`
    select g.id, g.name, (select count(*)::int from group_members x where x.group_id = g.id) as members
    from groups g where g.invite_code = ${code}`)) as unknown as {
    id: string;
    name: string;
    members: number;
  }[];
  return rows[0] ?? null;
}

// ---------------------------------------------------------------- study room

export type RoomMember = {
  userId: string;
  name: string | null;
  handle: string | null;
  /** Live session, when the member shares it and the extension reported in the last few minutes. */
  live: {
    title: string;
    url: string;
    activeMs: number;
    /** Seconds since the extension last reported (the timer kept running meanwhile if active). */
    ageSeconds: number;
    solved: boolean;
  } | null;
  lastActiveAt: Date | null;
  solvedToday: number;
  focusTodayMs: number;
};

export async function getRoom(groupId: string, todayStart: number): Promise<RoomMember[]> {
  const today = sql`to_timestamp(${todayStart / 1000})`;
  const rows = (await db().execute(sql`
    select gm.user_id as "userId", p.name, p.handle,
           live.title, live.url, live.active_ms as "activeMs", live.outcome,
           extract(epoch from (now() - live.updated_at))::float8 as "ageSeconds",
           greatest(
             (select max(updated_at) from practice_sessions where user_id = gm.user_id),
             (select max(submitted_at) from submissions where user_id = gm.user_id)
           ) as "lastActiveAt",
           (select count(distinct s.platform_problem_id)::int from submissions s
             where s.user_id = gm.user_id and s.verdict = 'AC' and s.submitted_at >= ${today}) as "solvedToday",
           (select coalesce(sum(active_ms), 0)::float8 from practice_sessions
             where user_id = gm.user_id and started_at >= ${today}) as "focusTodayMs"
    from group_members gm
    join profiles p on p.user_id = gm.user_id
    left join lateral (
      select pp.title, pp.url, ps.active_ms, ps.outcome, ps.updated_at
      from practice_sessions ps join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = gm.user_id and p.share_live
        and ps.updated_at > now() - make_interval(secs => ${LIVE_WINDOW_SECONDS})
        and ps.outcome <> 'abandoned'
      order by ps.updated_at desc limit 1
    ) live on true
    where gm.group_id = ${groupId}`)) as unknown as (Omit<RoomMember, "live" | "lastActiveAt"> & {
    title: string | null;
    url: string | null;
    activeMs: number | null;
    outcome: string | null;
    ageSeconds: number | null;
    lastActiveAt: unknown;
  })[];

  return rows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      handle: r.handle,
      live:
        r.title && r.url
          ? {
              title: r.title,
              url: r.url,
              activeMs: r.activeMs ?? 0,
              ageSeconds: Math.max(0, Math.round(r.ageSeconds ?? 0)),
              solved: r.outcome === "solved",
            }
          : null,
      lastActiveAt: r.lastActiveAt ? new Date(String(r.lastActiveAt)) : null,
      solvedToday: r.solvedToday,
      focusTodayMs: r.focusTodayMs,
    }))
    .sort(
      (a, b) =>
        Number(!!b.live) - Number(!!a.live) ||
        (b.lastActiveAt?.getTime() ?? 0) - (a.lastActiveAt?.getTime() ?? 0),
    );
}

// ---------------------------------------------------------------- college & batch boards

export type CollegeBoards = {
  college: { id: string; name: string; shortName: string | null };
  gradYear: number | null;
  /** Opted-in students of the viewer's college. */
  collegeRows: BoardRow[];
  /** The same, limited to the viewer's graduation year. */
  batchRows: BoardRow[];
};

/** College and batch boards of opted-in students. Null if the viewer has no college. */
export async function getCollegeBoards(
  userId: string,
  weekStart: number,
): Promise<CollegeBoards | null> {
  const [me] = (await db().execute(sql`
    select p.college_id as "collegeId", p.grad_year as "gradYear", c.name, c.short_name as "shortName"
    from profiles p join colleges c on c.id = p.college_id
    where p.user_id = ${userId}`)) as unknown as {
    collegeId: string;
    gradYear: number | null;
    name: string;
    shortName: string | null;
  }[];
  if (!me) return null;
  const rows = await boardRows(
    sql`select user_id from profiles where college_id = ${me.collegeId} and on_leaderboards`,
    weekStart,
  );
  return {
    college: { id: me.collegeId, name: me.name, shortName: me.shortName },
    gradYear: me.gradYear,
    collegeRows: rows,
    batchRows: me.gradYear ? rows.filter((r) => r.gradYear === me.gradYear) : [],
  };
}

// ---------------------------------------------------------------- streak freezes

export type StreakFreeze = { id: string; start: string; end: string };

export async function getStreakFreezes(userId: string): Promise<StreakFreeze[]> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");

  return (await db().execute(sql`
    select id, start_date::text as start, end_date::text as "end"
    from streak_freezes where user_id = ${userId}
    order by start_date desc limit 50`)) as unknown as StreakFreeze[];
}

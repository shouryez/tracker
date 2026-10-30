import "server-only";
import { sql } from "drizzle-orm";
import { suggestNext, topicLabel, type Difficulty } from "@upsolve/core";
import { reviewUrl } from "@/components/learning";
import { getUpcomingContests } from "@/lib/contest-calendar";
import { db } from "@/lib/db";
import {
  getLearning,
  getNextCandidates,
  getTopicTargets,
  masteryOf,
  revisionQueue,
} from "@/lib/learning";
import { localDate, localDay } from "@/lib/time";

// The Today to-do list holds only what the user adds: suggestions sit beside it, and
// items can come from any sheet. An item counts as done when it's ticked here, when its
// problem is solved (or reviewed) after it was planned, or when the same item is ticked on
// a sheet, so the list ticks itself as the extension, syncs and sheet ticks come in.
// Unfinished items roll over: they stay on the list, with their date, until they're done
// or removed (like Microsoft To Do's overdue tasks), for up to CARRY_DAYS.

export type PlanKind =
  "revision" | "next" | "stretch" | "shared" | "contest" | "drill" | "sheet" | "custom";

export type PlanItem = {
  id: string;
  kind: PlanKind;
  title: string;
  url: string | null;
  detail: string | null;
  problemId: string | null;
  difficulty: Difficulty | null;
  done: boolean;
  /** Ticked by solving (vs. by hand or on a sheet): stays done. */
  auto: boolean;
  /** The day it was planned for; earlier than today when it rolled over unfinished. */
  day: string;
};

export type TodayPlan = { day: string; items: PlanItem[]; done: number; total: number };

/** Something worth doing today, not on the list until the user adds it. */
export type PlanSuggestion = {
  /** Stable id for adding it: "<kind>:<problem id>" or "contest:<url>". */
  key: string;
  kind: PlanKind;
  title: string;
  url: string | null;
  detail: string;
  problemId: string | null;
  difficulty: Difficulty | null;
};

/** The next unfinished items of a sheet the user follows. */
export type SheetPick = {
  sheetId: string;
  slug: string;
  sheet: string;
  itemKey: string;
  title: string;
  step: string;
  tier: string | null;
  url: string | null;
};

const MAX_REVISIONS = 4;
const MAX_NEXT = 3;
/** How long an unfinished item keeps rolling over before it drops off the list. */
export const CARRY_DAYS = 30;

/** Plan items on `day`'s list: that day's, plus earlier ones still open (rolled over). */
export const ON_LIST = (day: string) => sql`
  (pi.day = ${day} or (pi.day < ${day} and pi.day >= ${day}::date - ${CARRY_DAYS}::int and pi.done_at is null))`;

/** Sheet items that are the same thing as plan item `pi` (the problem, or else title + link). */
export const SAME_SHEET_ITEM = sql`
  ((pi.problem_id is not null and si.problem_id = pi.problem_id)
   or (pi.problem_id is null and si.title = pi.title and si.url is not distinct from pi.url))`;

export async function getTodayPlan(
  userId: string,
  tz: string,
  _cap: number,
  now: number,
): Promise<TodayPlan> {
  const day = localDate(tz, now);
  const { start } = localDay(tz, now);
  // Raw sql params must be strings: postgres-js rejects Date objects here.
  const since = new Date(start).toISOString();

  // Each item's earliest "done" signal. Solves and reviews count from the start of the day
  // it was planned for; sheet ticks from when it was added (an old tick isn't new work).
  const rows = (await db().execute(sql`
    with mine as (
      select pi.*, p.difficulty,
             (pi.day::timestamp at time zone ${tz}) as day_start
      from plan_items pi left join problems p on p.id = pi.problem_id
      where pi.user_id = ${userId} and pi.day <= ${day} and pi.day >= ${day}::date - ${CARRY_DAYS}::int
    ),
    signals as (
      select pi.*,
        case when pi.problem_id is null then null else least(
          (select min(s.submitted_at) from submissions s
             join platform_problems pp on pp.id = s.platform_problem_id
           where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = pi.problem_id
             and s.submitted_at >= pi.day_start),
          (select min(r.at) from review_logs r
           where r.user_id = ${userId} and r.problem_id = pi.problem_id and r.at >= pi.day_start
             and r.action in ('remembered', 'shaky', 'forgot'))
        ) end as solved_at,
        (select min(sm.created_at) from sheet_marks sm
           join sheet_items si on si.sheet_id = sm.sheet_id and si.item_key = sm.item_key
         where sm.user_id = ${userId} and sm.created_at >= pi.created_at
           and ${SAME_SHEET_ITEM}) as marked_at
      from mine pi
    )
    select id, kind, title, url, detail, problem_id as "problemId", difficulty,
           to_char(day, 'YYYY-MM-DD') as day,
           solved_at is not null as solved,
           least(done_at, solved_at, marked_at) is not null as done
    from signals
    -- Today's items, plus earlier ones still open or finished today.
    where day = ${day}
       or least(done_at, solved_at, marked_at) is null
       or least(done_at, solved_at, marked_at) >= ${since}::timestamptz
    order by day, position, created_at`)) as unknown as {
    id: string;
    kind: PlanKind;
    title: string;
    url: string | null;
    detail: string | null;
    problemId: string | null;
    difficulty: Difficulty | null;
    day: string;
    solved: boolean;
    done: boolean;
  }[];

  const items = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    url: r.url,
    detail: r.detail,
    problemId: r.problemId,
    difficulty: r.difficulty,
    done: r.done,
    auto: r.solved,
    day: r.day,
  }));
  return { day, items, done: items.filter((i) => i.done).length, total: items.length };
}

/**
 * Today's suggestions: due revisions, the next problems for your weakest topics, a stretch,
 * what friends shared and today's contests. Anything already on the list is left out.
 */
export async function getTodaySuggestions(
  userId: string,
  tz: string,
  cap: number,
  now: number,
): Promise<PlanSuggestion[]> {
  const day = localDate(tz, now);
  const [learning, targets, candidates, contests, shared, planned] = await Promise.all([
    getLearning(userId),
    getTopicTargets(),
    getNextCandidates(userId),
    getUpcomingContests(),
    db().execute(sql`
      select ps.problem_id as "problemId", p.title, p.difficulty, coalesce(pr.name, pr.handle, 'A friend') as "from",
             g.name as "group",
             (select pp.url from platform_problems pp where pp.problem_id = p.id
               order by (pp.platform = 'leetcode') desc limit 1) as url
      from problem_shares ps
      join group_members gm on gm.group_id = ps.group_id and gm.user_id = ${userId}
      join groups g on g.id = ps.group_id
      join problems p on p.id = ps.problem_id
      left join profiles pr on pr.user_id = ps.user_id
      where ps.user_id <> ${userId} and ps.created_at > now() - interval '3 days'
        and not exists (
          select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
          where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = ps.problem_id)
      order by ps.created_at desc limit 2`),
    db().execute(sql`
      select pi.problem_id as "problemId", pi.url from plan_items pi
      where pi.user_id = ${userId} and ${ON_LIST(day)}`),
  ]);
  const onList = planned as unknown as { problemId: string | null; url: string | null }[];
  const plannedProblems = new Set(onList.map((p) => p.problemId).filter(Boolean));
  const plannedUrls = new Set(onList.map((p) => p.url).filter(Boolean));

  const mastery = masteryOf(learning, targets, now);
  const queue = revisionQueue(learning, mastery, { tz, cap, now });
  const solvedBy: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const p of learning) if (p.difficulty) solvedBy[p.difficulty]++;
  const picks = suggestNext(candidates, mastery, solvedBy, 8);
  const next = picks.slice(0, MAX_NEXT);
  const stretch = picks.find((p) => !next.includes(p) && !next.some((n) => n.topic === p.topic));
  const { start, end } = localDay(tz, now);

  const out: PlanSuggestion[] = [];
  const push = (s: PlanSuggestion) => {
    if (s.problemId && plannedProblems.has(s.problemId)) return;
    if (!s.problemId && s.url && plannedUrls.has(s.url)) return;
    if (s.problemId && out.some((o) => o.problemId === s.problemId)) return;
    out.push(s);
  };

  for (const p of queue.today.slice(0, MAX_REVISIONS)) {
    push({
      key: `revision:${p.problemId}`,
      kind: "revision",
      problemId: p.problemId,
      title: p.title,
      url: reviewUrl(p.url),
      detail: "Revision · re-solve it from memory",
      difficulty: p.difficulty,
    });
  }
  for (const n of next) {
    push({
      key: `next:${n.problemId}`,
      kind: "next",
      problemId: n.problemId,
      title: n.title,
      url: n.url,
      detail: `Next from ${n.sheet} · ${n.reason}`,
      difficulty: n.difficulty,
    });
  }
  if (stretch) {
    push({
      key: `stretch:${stretch.problemId}`,
      kind: "stretch",
      problemId: stretch.problemId,
      title: stretch.title,
      url: stretch.url,
      detail: `Stretch · ${topicLabel(stretch.topic)} is your weak spot`,
      difficulty: stretch.difficulty,
    });
  }
  for (const s of shared as unknown as {
    problemId: string;
    title: string;
    difficulty: Difficulty | null;
    from: string;
    group: string;
    url: string | null;
  }[]) {
    push({
      key: `shared:${s.problemId}`,
      kind: "shared",
      problemId: s.problemId,
      title: s.title,
      url: s.url,
      detail: `From ${s.from} in ${s.group}`,
      difficulty: s.difficulty,
    });
  }
  for (const c of contests.filter((c) => c.startsAt >= start && c.startsAt < end).slice(0, 2)) {
    push({
      key: `contest:${c.url}`,
      kind: "contest",
      problemId: null,
      title: c.name,
      url: c.url,
      detail: "Contest today",
      difficulty: null,
    });
  }
  return out;
}

const SOLVED_OR_MARKED = (userId: string) => sql`
  exists (select 1 from submissions s join platform_problems pp on pp.id = s.platform_problem_id
          where s.user_id = ${userId} and s.verdict = 'AC' and pp.problem_id = si.problem_id)
  or exists (select 1 from sheet_marks sm where sm.user_id = ${userId}
          and sm.sheet_id = si.sheet_id and sm.item_key = si.item_key)`;

/**
 * Sheet item `si` is on the day's list: a plan item for the same thing (the problem, or else
 * title + link) planned that day or rolled over from an earlier one.
 */
export const ON_TODAY_LIST = (userId: string, day: string) => sql`
  exists (select 1 from plan_items pi where pi.user_id = ${userId} and ${ON_LIST(day)}
          and ${SAME_SHEET_ITEM})`;

/** For each sheet the user follows, its next few unfinished items not already on today's list. */
export async function getSheetPicks(
  userId: string,
  tz: string,
  now: number,
  perSheet = 3,
): Promise<SheetPick[]> {
  const day = localDate(tz, now);
  return (await db().execute(sql`
    select sh.id as "sheetId", sh.slug, sh.name as sheet,
           si.item_key as "itemKey", si.title, si.step, si.tier, si.url
    from user_sheets us
    join sheets sh on sh.id = us.sheet_id
    cross join lateral (
      select si.* from sheet_items si
      where si.sheet_id = sh.id and si.kind = 'practice'
        and not (${SOLVED_OR_MARKED(userId)})
        and not ${ON_TODAY_LIST(userId, day)}
      order by si.position
      limit ${perSheet}
    ) si
    where us.user_id = ${userId}
    order by sh.position, si.position`)) as unknown as SheetPick[];
}

/** Item keys of a sheet that are already on today's list (to mark them on the sheet page). */
export async function getSheetKeysOnToday(
  userId: string,
  sheetId: string,
  tz: string,
  now: number,
): Promise<string[]> {
  const day = localDate(tz, now);
  const rows = (await db().execute(sql`
    select si.item_key as "itemKey" from sheet_items si
    where si.sheet_id = ${sheetId} and ${ON_TODAY_LIST(userId, day)}`)) as unknown as {
    itemKey: string;
  }[];
  return rows.map((r) => r.itemKey);
}

/** The sheets the user follows, for "Add from sheet". */
export async function getFollowedSheets(userId: string): Promise<{ slug: string; name: string }[]> {
  return (await db().execute(sql`
    select sh.slug, sh.name from user_sheets us join sheets sh on sh.id = us.sheet_id
    where us.user_id = ${userId}
    order by sh.position`)) as unknown as { slug: string; name: string }[];
}

// DsaKaro

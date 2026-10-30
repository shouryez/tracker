import "server-only";
import { sql } from "drizzle-orm";
import {
  MISTAKE_LABELS,
  TOPIC_GUIDE,
  TOPICS,
  isTopicId,
  reviewsSince,
  topicLabel,
  topicsOf,
  type Difficulty,
  type TopicId,
} from "@upsolve/core";
import { db } from "@/lib/db";
import { getLearning } from "@/lib/learning";
import { localDate, localDay, localWeekStart } from "@/lib/time";

// Reads for the daily-loop features: focus timer, save-for-later, weekly review,
// recall quiz, notebook + mistake journal, shared problems and nudges.
// Every function takes a session-resolved user id.

const DAY_MS = 86_400_000;
const toMs = (v: unknown) => (v instanceof Date ? v.getTime() : Date.parse(String(v)));

// ---------------------------------------------------------------- focus

export type ActiveFocus = { id: string; startedAt: number; mode: string; label: string | null };

export async function getActiveFocus(userId: string): Promise<ActiveFocus | null> {
  const [row] = (await db().execute(sql`
    select id, started_at as "startedAt", mode, label from focus_sessions
    where user_id = ${userId} and ended_at is null and started_at > now() - interval '16 hours'
    order by started_at desc limit 1`)) as unknown as {
    id: string;
    startedAt: unknown;
    mode: string;
    label: string | null;
  }[];
  return row ? { ...row, startedAt: toMs(row.startedAt) } : null;
}

export type FocusSummary = {
  todayMs: number;
  todayAwayMs: number;
  weekMs: number;
  sessionsToday: number;
  recent: {
    id: string;
    startedAt: number;
    focusMs: number;
    awayMs: number;
    switches: number;
    tracked: boolean;
    label: string | null;
  }[];
};

export async function getFocusSummary(
  userId: string,
  tz: string,
  now: number,
): Promise<FocusSummary> {
  const { start } = localDay(tz, now);
  const week = localWeekStart(tz, now);
  const rows = (await db().execute(sql`
    select id, started_at as "startedAt", focus_ms as "focusMs", away_ms as "awayMs", switches,
           tracked, label
    from focus_sessions
    where user_id = ${userId} and ended_at is not null and started_at >= ${new Date(week).toISOString()}::timestamptz
    order by started_at desc`)) as unknown as {
    id: string;
    startedAt: unknown;
    focusMs: number;
    awayMs: number;
    switches: number;
    tracked: boolean;
    label: string | null;
  }[];
  const list = rows.map((r) => ({ ...r, startedAt: toMs(r.startedAt) }));
  const today = list.filter((r) => r.startedAt >= start);
  return {
    todayMs: today.reduce((n, r) => n + r.focusMs, 0),
    todayAwayMs: today.reduce((n, r) => n + r.awayMs, 0),
    weekMs: list.reduce((n, r) => n + r.focusMs, 0),
    sessionsToday: today.length,
    recent: list.slice(0, 8),
  };
}

/** Who in a group is in Lab mode right now, and today's focus totals. */
export async function getLabBoard(
  groupId: string,
  dayStart: number,
): Promise<{ userId: string; name: string; liveSince: number | null; todayMs: number }[]> {
  const rows = (await db().execute(sql`
    select m.user_id as "userId", coalesce(p.name, p.handle, 'Someone') as name,
      (select f.started_at from focus_sessions f where f.user_id = m.user_id and f.ended_at is null
         and f.started_at > now() - interval '16 hours' order by f.started_at desc limit 1) as "liveSince",
      coalesce((select sum(f.focus_ms) from focus_sessions f where f.user_id = m.user_id
         and f.ended_at is not null and f.started_at >= ${new Date(dayStart).toISOString()}::timestamptz), 0)::int as "todayMs"
    from group_members m left join profiles p on p.user_id = m.user_id
    where m.group_id = ${groupId} and coalesce(p.share_live, true)`)) as unknown as {
    userId: string;
    name: string;
    liveSince: unknown;
    todayMs: number;
  }[];
  return rows
    .map((r) => ({ ...r, liveSince: r.liveSince ? toMs(r.liveSince) : null }))
    .sort((a, b) => b.todayMs - a.todayMs);
}

// ---------------------------------------------------------------- save for later

export type SavedItem = {
  id: string;
  url: string;
  title: string;
  kind: "video" | "article" | "problem" | "other";
  topic: TopicId | null;
  atSeconds: number | null;
  note: string | null;
  done: boolean;
  createdAt: number;
};

export async function getSavedItems(userId: string): Promise<SavedItem[]> {
  const rows = (await db().execute(sql`
    select id, url, title, kind, topic, at_seconds as "atSeconds", note,
           done_at is not null as done, created_at as "createdAt"
    from saved_items where user_id = ${userId}
    order by done_at is not null, created_at desc limit 300`)) as unknown as (Omit<
    SavedItem,
    "createdAt"
  > & { createdAt: unknown })[];
  return rows.map((r) => ({ ...r, createdAt: toMs(r.createdAt) }));
}

/** Kind and a best-guess topic for a saved link. Pure. */
export function classifySaved(
  url: string,
  title: string,
): { kind: SavedItem["kind"]; topic: TopicId | null } {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    // keep defaults
  }
  const kind: SavedItem["kind"] =
    host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com"
      ? "video"
      : /leetcode\.com$/.test(host) && path.startsWith("/problems/")
        ? "problem"
        : /geeksforgeeks\.org$/.test(host) && path.startsWith("/problems/")
          ? "problem"
          : /codeforces\.com$|codechef\.com$|atcoder\.jp$/.test(host)
            ? "problem"
            : "article";
  const text = `${title} ${path}`.toLowerCase().replace(/[-_/]/g, " ");
  const topic =
    TOPICS.find(
      (t) =>
        text.includes(t.label.toLowerCase()) ||
        t.tags.some((tag) => text.includes(tag.replace(/-/g, " "))),
    )?.id ?? null;
  return { kind, topic };
}

/** YouTube link that starts at the saved second. */
export function savedHref(item: Pick<SavedItem, "url" | "atSeconds" | "kind">): string {
  if (item.kind !== "video" || !item.atSeconds) return item.url;
  try {
    const u = new URL(item.url);
    u.searchParams.set("t", `${item.atSeconds}s`);
    return u.toString();
  } catch {
    return item.url;
  }
}

// ---------------------------------------------------------------- weekly review

export type WeekReview = {
  weekStart: string;
  goals: { mediums: number; focusHours: number; revisions: number; reflection: string | null };
  saved: boolean;
  progress: { mediums: number; focusMs: number; revisions: number; solved: number };
  days: { date: string; solved: number }[];
  bestDay: { date: string; solved: number } | null;
  hardest: { title: string; difficulty: Difficulty | null } | null;
  lastWeek: { mediums: number; revisions: number; solved: number };
};

export async function getWeekReview(userId: string, tz: string, now: number): Promise<WeekReview> {
  const weekStartMs = localWeekStart(tz, now);
  const weekStart = localDate(tz, weekStartMs + 12 * 3_600_000);
  const [learning, goalRows, focusRows, practiceRows] = await Promise.all([
    getLearning(userId),
    db().execute(sql`
      select mediums, focus_hours as "focusHours", revisions, reflection
      from weekly_goals where user_id = ${userId} and week_start = ${weekStart}`),
    db().execute(sql`
      select coalesce(sum(focus_ms), 0)::int as ms from focus_sessions
      where user_id = ${userId} and ended_at is not null and started_at >= ${new Date(weekStartMs).toISOString()}::timestamptz`),
    db().execute(sql`
      select coalesce(sum(active_ms), 0)::int as ms from practice_sessions
      where user_id = ${userId} and started_at >= ${new Date(weekStartMs).toISOString()}::timestamptz`),
  ]);
  const goal = (goalRows as unknown as WeekReview["goals"][])[0];
  const firstThisWeek = learning.filter((p) => p.state.firstSolvedAt >= weekStartMs);
  const firstLastWeek = learning.filter(
    (p) => p.state.firstSolvedAt >= weekStartMs - 7 * DAY_MS && p.state.firstSolvedAt < weekStartMs,
  );
  const states = learning.map((p) => p.state);
  const days = Array.from({ length: 7 }, (_, i) => {
    const s = weekStartMs + i * DAY_MS;
    return {
      date: localDate(tz, s + 12 * 3_600_000),
      solved: firstThisWeek.filter(
        (p) => p.state.firstSolvedAt >= s && p.state.firstSolvedAt < s + DAY_MS,
      ).length,
    };
  });
  const bestDay = days.reduce<WeekReview["bestDay"]>(
    (b, d) => (d.solved > (b?.solved ?? 0) ? d : b),
    null,
  );
  const rank = { hard: 3, medium: 2, easy: 1 } as const;
  const hardest = [...firstThisWeek].sort(
    (a, b) => (b.difficulty ? rank[b.difficulty] : 0) - (a.difficulty ? rank[a.difficulty] : 0),
  )[0];
  const focusMs = Math.max(
    (focusRows as unknown as { ms: number }[])[0]?.ms ?? 0,
    (practiceRows as unknown as { ms: number }[])[0]?.ms ?? 0,
  );
  return {
    weekStart,
    goals: goal ?? { mediums: 10, focusHours: 6, revisions: 15, reflection: null },
    saved: Boolean(goal),
    progress: {
      mediums: firstThisWeek.filter((p) => p.difficulty === "medium").length,
      focusMs,
      revisions: reviewsSince(states, weekStartMs),
      solved: firstThisWeek.length,
    },
    days,
    bestDay: bestDay && bestDay.solved > 0 ? bestDay : null,
    hardest: hardest ? { title: hardest.title, difficulty: hardest.difficulty } : null,
    lastWeek: {
      mediums: firstLastWeek.filter((p) => p.difficulty === "medium").length,
      revisions: reviewsSince(states, weekStartMs - 7 * DAY_MS) - reviewsSince(states, weekStartMs),
      solved: firstLastWeek.length,
    },
  };
}

// ---------------------------------------------------------------- recall quiz

export type RecallCard = {
  problemId: string;
  title: string;
  difficulty: Difficulty | null;
  answer: TopicId;
  options: { id: TopicId; label: string }[];
  reveal: { idea: string; takeaway: string | null; note: string | null };
};

/** Seeded shuffle so the deck is stable within a day. */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let x = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const j = x % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export async function getRecallDeck(
  userId: string,
  day: string,
  round: number,
  size = 5,
): Promise<RecallCard[]> {
  const learning = (await getLearning(userId)).filter((p) => topicsOf(p.topics).length > 0);
  if (learning.length < 2) return [];
  const [takeaways, notes] = await Promise.all([
    db().execute(sql`
      select distinct on (pp.problem_id) pp.problem_id as "problemId", ps.takeaway, ps.pattern
      from practice_sessions ps join platform_problems pp on pp.id = ps.platform_problem_id
      where ps.user_id = ${userId} and (ps.takeaway is not null or ps.pattern is not null)
      order by pp.problem_id, ps.started_at desc`),
    db().execute(
      sql`select problem_id as "problemId", body from problem_notes where user_id = ${userId}`,
    ),
  ]);
  const takeBy = new Map(
    (
      takeaways as unknown as {
        problemId: string;
        takeaway: string | null;
        pattern: string | null;
      }[]
    ).map((r) => [r.problemId, r]),
  );
  const noteBy = new Map(
    (notes as unknown as { problemId: string; body: string }[]).map((r) => [r.problemId, r.body]),
  );
  const seed = Number(day.replace(/-/g, "")) + round * 7919;
  // Due or recently-forgotten problems first, then the rest.
  const sorted = [...learning].sort((a, b) => a.state.dueAt - b.state.dueAt);
  const pool = shuffle(sorted.slice(0, 40), seed).slice(0, size);
  const allTopics = TOPICS.map((t) => t.id);

  return pool.map((p, i) => {
    const mine = topicsOf(p.topics);
    const chosen = takeBy.get(p.problemId)?.pattern;
    const answer: TopicId =
      chosen && isTopicId(chosen) && mine.includes(chosen) ? chosen : mine[0]!;
    const distractors = shuffle(
      allTopics.filter((t) => !mine.includes(t)),
      seed + i,
    ).slice(0, 3);
    const options = shuffle([answer, ...distractors], seed + i * 31).map((id) => ({
      id,
      label: topicLabel(id),
    }));
    const note = noteBy.get(p.problemId);
    return {
      problemId: p.problemId,
      title: p.title,
      difficulty: p.difficulty,
      answer,
      options,
      reveal: {
        idea: TOPIC_GUIDE[answer].idea,
        takeaway: takeBy.get(p.problemId)?.takeaway ?? null,
        note: note ? note.slice(0, 280) : null,
      },
    };
  });
}

export async function getRecallStats(
  userId: string,
): Promise<{ answered: number; correct: number; streakDays: number }> {
  const [row] = (await db().execute(sql`
    select count(*)::int as answered, count(*) filter (where correct)::int as correct,
           count(distinct date_trunc('day', at))::int as "streakDays"
    from recall_answers where user_id = ${userId} and at > now() - interval '7 days'`)) as unknown as {
    answered: number;
    correct: number;
    streakDays: number;
  }[];
  return row ?? { answered: 0, correct: 0, streakDays: 0 };
}

// ---------------------------------------------------------------- notebook + mistakes

export type NotebookEntry = {
  problemId: string;
  title: string;
  difficulty: Difficulty | null;
  topic: TopicId | null;
  takeaway: string | null;
  note: string | null;
  mistakes: string[];
  lastAt: number;
};

export type MistakePattern = {
  topic: TopicId | null;
  tag: string;
  label: string;
  count: number;
  sessions: number;
  problems: { id: string; title: string; difficulty: Difficulty | null }[];
};

export async function getNotebook(userId: string): Promise<{
  entries: NotebookEntry[];
  mistakes: MistakePattern[];
  verdicts: { topic: string; wa: number; tle: number; total: number }[];
}> {
  const [sessionRows, noteRows, verdictRows] = await Promise.all([
    db().execute(sql`
      select pp.problem_id as "problemId", p.title, p.difficulty, p.topics, ps.pattern, ps.takeaway,
             ps.note, ps.mistake_tags as "mistakeTags", ps.started_at as at
      from practice_sessions ps
      join platform_problems pp on pp.id = ps.platform_problem_id
      join problems p on p.id = pp.problem_id
      where ps.user_id = ${userId}
      order by ps.started_at desc limit 2000`),
    db().execute(sql`
      select n.problem_id as "problemId", p.title, p.difficulty, p.topics, n.body, n.updated_at as at
      from problem_notes n join problems p on p.id = n.problem_id where n.user_id = ${userId}`),
    db().execute(sql`
      select p.topics, s.verdict, count(*)::int as n
      from submissions s join platform_problems pp on pp.id = s.platform_problem_id
      join problems p on p.id = pp.problem_id
      where s.user_id = ${userId} and s.submitted_at > now() - interval '120 days'
      group by p.topics, s.verdict`),
  ]);

  type S = {
    problemId: string;
    title: string;
    difficulty: Difficulty | null;
    topics: string[];
    pattern: string | null;
    takeaway: string | null;
    note: string | null;
    mistakeTags: string[];
    at: unknown;
  };
  const sessions = sessionRows as unknown as S[];
  const byProblem = new Map<string, NotebookEntry>();
  for (const s of sessions) {
    const topic = s.pattern && isTopicId(s.pattern) ? s.pattern : (topicsOf(s.topics)[0] ?? null);
    const e = byProblem.get(s.problemId) ?? {
      problemId: s.problemId,
      title: s.title,
      difficulty: s.difficulty,
      topic,
      takeaway: null,
      note: null,
      mistakes: [],
      lastAt: toMs(s.at),
    };
    e.takeaway ??= s.takeaway;
    e.note ??= s.note;
    if (s.pattern && isTopicId(s.pattern)) e.topic ??= s.pattern;
    for (const m of s.mistakeTags) if (!e.mistakes.includes(m)) e.mistakes.push(m);
    byProblem.set(s.problemId, e);
  }
  for (const n of noteRows as unknown as {
    problemId: string;
    title: string;
    difficulty: Difficulty | null;
    topics: string[];
    body: string;
    at: unknown;
  }[]) {
    const e = byProblem.get(n.problemId) ?? {
      problemId: n.problemId,
      title: n.title,
      difficulty: n.difficulty,
      topic: topicsOf(n.topics)[0] ?? null,
      takeaway: null,
      note: null,
      mistakes: [],
      lastAt: toMs(n.at),
    };
    e.note = n.body;
    byProblem.set(n.problemId, e);
  }
  const entries = [...byProblem.values()]
    .filter((e) => e.takeaway || e.note || e.mistakes.length)
    .sort((a, b) => b.lastAt - a.lastAt);

  // Mistake journal: (topic, tag) pairs, with how many sessions in that topic.
  const sessionsPerTopic = new Map<string, number>();
  const pairs = new Map<string, MistakePattern>();
  for (const s of sessions) {
    const topics = topicsOf(s.topics);
    const topic = topics[0] ?? null;
    sessionsPerTopic.set(topic ?? "", (sessionsPerTopic.get(topic ?? "") ?? 0) + 1);
    for (const tag of s.mistakeTags) {
      const key = `${topic}:${tag}`;
      const m = pairs.get(key) ?? {
        topic,
        tag,
        label: MISTAKE_LABELS[tag] ?? tag,
        count: 0,
        sessions: 0,
        problems: [],
      };
      m.count++;
      if (!m.problems.some((p) => p.id === s.problemId) && m.problems.length < 6) {
        m.problems.push({ id: s.problemId, title: s.title, difficulty: s.difficulty });
      }
      pairs.set(key, m);
    }
  }
  const mistakes = [...pairs.values()]
    .map((m) => ({ ...m, sessions: sessionsPerTopic.get(m.topic ?? "") ?? m.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const vt = new Map<string, { wa: number; tle: number; total: number }>();
  for (const r of verdictRows as unknown as { topics: string[]; verdict: string; n: number }[]) {
    const topic = topicsOf(r.topics)[0];
    if (!topic) continue;
    const v = vt.get(topic) ?? { wa: 0, tle: 0, total: 0 };
    v.total += r.n;
    if (r.verdict === "WA") v.wa += r.n;
    if (r.verdict === "TLE") v.tle += r.n;
    vt.set(topic, v);
  }
  const verdicts = [...vt.entries()]
    .map(([topic, v]) => ({ topic: topicLabel(topic as TopicId), ...v }))
    .filter((v) => v.total >= 5 && v.wa + v.tle > 0)
    .sort((a, b) => (b.wa + b.tle) / b.total - (a.wa + a.tle) / a.total)
    .slice(0, 6);

  return { entries, mistakes, verdicts };
}

// ---------------------------------------------------------------- shares + nudges

export type GroupShare = {
  id: string;
  problemId: string;
  title: string;
  difficulty: Difficulty | null;
  url: string | null;
  from: string;
  note: string | null;
  at: number;
  members: {
    userId: string;
    name: string;
    solved: boolean;
    bestMs: number | null;
    attempts: number;
  }[];
};

export async function getGroupShares(groupId: string): Promise<GroupShare[]> {
  const shares = (await db().execute(sql`
    select ps.id, ps.problem_id as "problemId", p.title, p.difficulty, ps.note, ps.created_at as at,
           coalesce(pr.name, pr.handle, 'Someone') as "from",
           (select pp.url from platform_problems pp where pp.problem_id = p.id
             order by (pp.platform = 'leetcode') desc limit 1) as url
    from problem_shares ps join problems p on p.id = ps.problem_id
    left join profiles pr on pr.user_id = ps.user_id
    where ps.group_id = ${groupId}
    order by ps.created_at desc limit 8`)) as unknown as (Omit<GroupShare, "members" | "at"> & {
    at: unknown;
  })[];
  if (shares.length === 0) return [];
  const ids = shares.map((s) => s.problemId);
  const status = (await db().execute(sql`
    select m.user_id as "userId", coalesce(pr.name, pr.handle, 'Someone') as name, pp.problem_id as "problemId",
           bool_or(s.verdict = 'AC') as solved, count(s.id)::int as attempts,
           (select so.best_active_ms from solves so where so.user_id = m.user_id
              and so.problem_id = pp.problem_id) as "bestMs"
    from group_members m
    left join profiles pr on pr.user_id = m.user_id
    join submissions s on s.user_id = m.user_id
    join platform_problems pp on pp.id = s.platform_problem_id
    where m.group_id = ${groupId} and pp.problem_id in ${ids}
    group by m.user_id, pr.name, pr.handle, pp.problem_id`)) as unknown as {
    userId: string;
    name: string;
    problemId: string;
    solved: boolean;
    attempts: number;
    bestMs: number | null;
  }[];
  return shares.map((s) => ({
    ...s,
    at: toMs(s.at),
    members: status
      .filter((r) => r.problemId === s.problemId)
      .map(({ userId, name, solved, bestMs, attempts }) => ({
        userId,
        name,
        solved,
        bestMs,
        attempts,
      }))
      .sort(
        (a, b) => Number(b.solved) - Number(a.solved) || (a.bestMs ?? 1e12) - (b.bestMs ?? 1e12),
      ),
  }));
}

export type Nudge = { id: string; from: string; group: string; groupId: string; at: number };

export async function getUnseenNudges(userId: string): Promise<Nudge[]> {
  const rows = (await db().execute(sql`
    select n.id, coalesce(p.name, p.handle, 'A friend') as "from", g.name as "group",
           g.id as "groupId", n.created_at as at
    from nudges n join groups g on g.id = n.group_id
    left join profiles p on p.user_id = n.user_id
    where n.to_user = ${userId} and n.seen_at is null and n.created_at > now() - interval '2 days'
    order by n.created_at desc limit 5`)) as unknown as (Omit<Nudge, "at"> & { at: unknown })[];
  return rows.map((r) => ({ ...r, at: toMs(r.at) }));
}

/** Members of a group the viewer already nudged today (so the button can show "Nudged"). */
export async function getNudgedToday(
  userId: string,
  groupId: string,
  day: string,
): Promise<string[]> {
  const rows = (await db().execute(sql`
    select to_user as "toUser" from nudges
    where user_id = ${userId} and group_id = ${groupId} and day = ${day}`)) as unknown as {
    toUser: string;
  }[];
  return rows.map((r) => r.toUser);
}

// ---------------------------------------------------------------- reminders

/** The local hour the user most often gets Accepted (last 60 days); 20:00 if unknown. */
export async function bestHour(userId: string, tz: string): Promise<number> {
  const [row] = (await db().execute(sql`
    select extract(hour from submitted_at at time zone ${tz})::int as hour
    from submissions where user_id = ${userId} and verdict = 'AC'
      and submitted_at > now() - interval '60 days'
    group by 1 order by count(*) desc limit 1`)) as unknown as { hour: number }[];
  return row?.hour ?? 20;
}

// DsaKaro

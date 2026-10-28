import "server-only";
import { cacheLife, cacheTag } from "next/cache";

// Upcoming contests across LeetCode, Codeforces, CodeChef and AtCoder, from each
// site's public listing. Cached for an hour; a source that fails is just skipped.

export type UpcomingContest = {
  id: string;
  platform: "leetcode" | "codeforces" | "codechef" | "atcoder";
  name: string;
  startsAt: number;
  durationMin: number;
  url: string;
};

const TIMEOUT_MS = 6000;

async function getJson<T>(url: string, init: RequestInit = {}): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function codeforces(): Promise<UpcomingContest[]> {
  const data = await getJson<{
    status: string;
    result: {
      id: number;
      name: string;
      phase: string;
      startTimeSeconds?: number;
      durationSeconds: number;
    }[];
  }>("https://codeforces.com/api/contest.list?gym=false");
  if (data?.status !== "OK") return [];
  return data.result
    .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds)
    .map((c) => ({
      id: `codeforces:${c.id}`,
      platform: "codeforces" as const,
      name: c.name,
      startsAt: c.startTimeSeconds! * 1000,
      durationMin: Math.round(c.durationSeconds / 60),
      url: `https://codeforces.com/contests/${c.id}`,
    }));
}

async function leetcode(): Promise<UpcomingContest[]> {
  const data = await getJson<{
    data?: {
      upcomingContests?: {
        title: string;
        titleSlug: string;
        startTime: number;
        duration: number;
      }[];
    };
  }>("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/contest/" },
    body: JSON.stringify({
      query: "query { upcomingContests { title titleSlug startTime duration } }",
    }),
  });
  return (data?.data?.upcomingContests ?? []).map((c) => ({
    id: `leetcode:${c.titleSlug}`,
    platform: "leetcode" as const,
    name: c.title,
    startsAt: c.startTime * 1000,
    durationMin: Math.round(c.duration / 60),
    url: `https://leetcode.com/contest/${c.titleSlug}`,
  }));
}

async function codechef(): Promise<UpcomingContest[]> {
  const data = await getJson<{
    future_contests?: {
      contest_code: string;
      contest_name: string;
      contest_start_date_iso: string;
      contest_duration: string;
    }[];
  }>(
    "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
  );
  return (data?.future_contests ?? []).map((c) => ({
    id: `codechef:${c.contest_code}`,
    platform: "codechef" as const,
    name: c.contest_name,
    startsAt: Date.parse(c.contest_start_date_iso),
    durationMin: Number(c.contest_duration) || 120,
    url: `https://www.codechef.com/${c.contest_code}`,
  }));
}

/** AtCoder has no JSON API; read the "Upcoming Contests" table on the contests page. */
async function atcoder(): Promise<UpcomingContest[]> {
  let html: string;
  try {
    const res = await fetch("https://atcoder.jp/contests/?lang=en", {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }
  const section = html.split('id="contest-table-upcoming"')[1]?.split("</table>")[0] ?? "";
  const out: UpcomingContest[] = [];
  const row = /<tr>([\s\S]*?)<\/tr>/g;
  for (const m of section.matchAll(row)) {
    const cells = m[1]!;
    const time = /<time[^>]*>([^<]+)<\/time>/.exec(cells)?.[1];
    const link = /href="\/contests\/([a-z0-9_-]+)">([^<]+)<\/a>/.exec(cells);
    const dur = /<td class="text-center">(\d{1,2}):(\d{2})<\/td>/.exec(cells);
    if (!time || !link) continue;
    // "2026-11-01 21:00:00+0900"
    const startsAt = Date.parse(time.replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
    if (!Number.isFinite(startsAt)) continue;
    out.push({
      id: `atcoder:${link[1]}`,
      platform: "atcoder",
      name: link[2]!.trim(),
      startsAt,
      durationMin: dur ? Number(dur[1]) * 60 + Number(dur[2]) : 100,
      url: `https://atcoder.jp/contests/${link[1]}`,
    });
  }
  return out;
}

/** Contests starting in the next 14 days, soonest first. */
export async function getUpcomingContests(): Promise<UpcomingContest[]> {
  "use cache";
  cacheTag("contest-calendar");
  cacheLife("hours");

  const all = (await Promise.all([leetcode(), codeforces(), codechef(), atcoder()])).flat();
  const now = Date.now();
  return all
    .filter((c) => c.startsAt > now - 3 * 3_600_000 && c.startsAt < now + 14 * 86_400_000)
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, 40);
}

/** "Add to Google Calendar" link for a contest. */
export function googleCalendarUrl(c: UpcomingContest): string {
  const fmt = (t: number) =>
    new Date(t)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: c.name,
    dates: `${fmt(c.startsAt)}/${fmt(c.startsAt + c.durationMin * 60_000)}`,
    details: c.url,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

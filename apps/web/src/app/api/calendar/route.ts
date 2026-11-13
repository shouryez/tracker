import { getUpcomingContests } from "@/lib/contest-calendar";
import { buildIcs, verifyCalendar } from "@/lib/calendar-feed";
import { getAccounts, getProfile } from "@/lib/data";
import { getLearning } from "@/lib/learning";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The ICS feed behind "Subscribe in your calendar" (FEATURES-PLAN F4). Calendar apps fetch it
 * without cookies, so the link carries a server signature instead of a session. It only
 * shows revision counts per day and public contest times.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "";
  const s = url.searchParams.get("s") ?? "";
  if (!UUID.test(u) || !verifyCalendar(u, s)) return new Response("Not found", { status: 404 });

  const [profile, learning, accounts, contests] = await Promise.all([
    getProfile(u),
    getLearning(u),
    getAccounts(u),
    getUpcomingContests().catch(() => []),
  ]);
  // Contests on the platforms you use (all four if none are linked yet).
  const mine = new Set<string>(accounts.map((a) => a.platform));
  const shown = mine.size ? contests.filter((c) => mine.has(c.platform)) : contests;
  const now = Date.now();
  const ics = buildIcs({
    tz: profile?.timezone ?? "Asia/Kolkata",
    now,
    dueAts: learning.filter((p) => !p.state.retired).map((p) => p.state.dueAt),
    contests: shown,
    origin: url.origin,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="dsakaro.ics"',
      "Cache-Control": "private, max-age=1800",
    },
  });
}

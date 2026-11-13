import { CalendarDays } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle } from "@upsolve/ui";
import { PracticeCalendar, type CalDay } from "@/components/practice-calendar";
import { getUpcomingContests } from "@/lib/contest-calendar";
import { getAccounts } from "@/lib/data";
import { getLearning, reviewHistory } from "@/lib/learning";
import { localDate } from "@/lib/time";

const DAY = 86_400_000;
const empty = (): CalDay => ({
  solved: [],
  solvedCount: 0,
  revised: 0,
  due: [],
  dueCount: 0,
  contests: [],
});

/** Practice calendar on Insights (FEATURES-PLAN F3): five months back, one ahead. */
export async function CalendarCard({
  userId,
  tz,
  now,
}: {
  userId: string;
  tz: string;
  now: number;
}) {
  const [learning, accounts, contests] = await Promise.all([
    getLearning(userId),
    getAccounts(userId),
    getUpcomingContests().catch(() => []),
  ]);
  const today = localDate(tz, now);
  const [ty, tm] = today.split("-").map(Number) as [number, number];
  const minMonth = (() => {
    const d = new Date(Date.UTC(ty, tm - 1 - 5, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();
  const maxMonth = (() => {
    const d = new Date(Date.UTC(ty, tm, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();
  const days: Record<string, CalDay> = {};
  const at = (d: string) => (days[d] ??= empty());
  const inRange = (d: string) => d.slice(0, 7) >= minMonth && d.slice(0, 7) <= maxMonth;

  for (const p of learning) {
    const first = localDate(tz, p.state.firstSolvedAt);
    if (inRange(first)) {
      const c = at(first);
      c.solvedCount++;
      if (c.solved.length < 6) c.solved.push(p.title);
    }
    if (!p.state.retired) {
      const due = p.state.dueAt <= now ? today : localDate(tz, p.state.dueAt);
      if (inRange(due) && due >= today) {
        const c = at(due);
        c.dueCount++;
        if (c.due.length < 6) c.due.push(p.title);
      }
    }
  }
  for (const h of reviewHistory(learning, 2000)) {
    const d = localDate(tz, h.at);
    if (inRange(d)) at(d).revised++;
  }
  const mine = new Set<string>(accounts.map((a) => a.platform));
  for (const c of contests) {
    if (mine.size && !mine.has(c.platform)) continue;
    if (c.startsAt > now + 45 * DAY) continue;
    const d = localDate(tz, c.startsAt);
    if (!inRange(d)) continue;
    at(d).contests.push({
      name: c.name,
      time: new Date(c.startsAt).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
      }),
    });
  }

  return (
    <Card id="calendar" className="col-span-12 scroll-mt-24">
      <CardHeader>
        <CardTitle icon={<CalendarDays size={15} />} tint="var(--amber)">
          Practice calendar
        </CardTitle>
        <CardSub>what you did · what&apos;s coming</CardSub>
      </CardHeader>
      <PracticeCalendar days={days} today={today} minMonth={minMonth} maxMonth={maxMonth} />
    </Card>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { History, Puzzle, Timer } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  EmptyState,
  SkeletonCard,
  Tag,
  buttonClasses,
} from "@upsolve/ui";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { HonestSplit, SessionItem } from "@/components/sessions";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { LabTimer } from "@/components/daily/lab-timer";
import { RecentStudySessions } from "@/components/daily/recent-study-sessions";
import { AddOfflineSession } from "@/components/daily/session-edit";
import { NowSolving } from "@/components/daily/now-solving";
import { getActiveFocus, getFocusSummary } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { getStudyHistory } from "@/lib/study-data";
import { requestNow, studyDay } from "@/lib/time";
import { KpiStrip, WeekHours, type WeekHoursDay } from "@/components/dashboard/lamplight";
import { StartStudyButton } from "@/components/daily/study-bar";
import { formatDuration, getSessionStats, getSessions } from "@/lib/sessions-data";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={3} className="col-span-12 h-[220px] lg:col-span-7" />
            <SkeletonCard lines={3} className="col-span-12 h-[220px] lg:col-span-5" />
            <SkeletonCard lines={8} className="col-span-12 h-[420px]" />
          </div>
        }
      >
        <SessionsContent />
      </Suspense>
    </div>
  );
}

async function SessionsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your sessions.</p>;

  const [stats, sessions, profile, active, studies] = await Promise.all([
    getSessionStats(user.id),
    getSessions(user.id, 100),
    getProfile(user.id),
    getActiveFocus(user.id),
    getStudyHistory(user.id, 80, requestNow() - 7 * 86_400_000),
  ]);
  const focus = await getFocusSummary(
    user.id,
    profile?.timezone ?? "Asia/Kolkata",
    requestNow(),
    profile?.dayResetHour ?? 0,
  );
  const { solo, hint, solution } = stats.honest;

  const tz = profile?.timezone ?? "Asia/Kolkata";
  const resetHour = profile?.dayResetHour ?? 0;
  const nowMs = requestNow();
  const weekHours = Array.from({ length: 7 }, (_, i): WeekHoursDay => {
    const { start, end } = studyDay(tz, nowMs - (6 - i) * 86_400_000, resetHour);
    const inDay = studies.filter((s) => s.startedAt >= start && s.startedAt < end);
    return {
      label:
        i === 6
          ? "Today"
          : new Date(start + 12 * 3_600_000).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              timeZone: tz,
            }),
      today: i === 6,
      dayStart: start,
      totalMs: inDay.reduce((n, s) => n + s.focusMs, 0),
      sessions: inDay.map((s) => ({ start: s.startedAt, end: s.endedAt, focusMs: s.focusMs })),
      solves: inDay.flatMap((s) =>
        s.problems.filter((p) => p.outcome === "solved" || p.outcome === "synced").map((p) => p.at),
      ),
    };
  });

  const lab = (
    <Card id="lab" glow="var(--signal-mark)" className="scroll-mt-24">
      <CardHeader>
        <CardTitle icon={<Timer size={14} />} tint="var(--signal-mark)">
          Study session
        </CardTitle>
        <CardSub>
          {formatDuration(focus.todayMs)} today · {formatDuration(focus.weekMs)} this week
        </CardSub>
      </CardHeader>
      <LabTimer active={active} buddy={profile?.avatar ?? null} />
      {focus.recent.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {focus.recent.slice(0, 6).map((f) => (
            <li
              key={f.id}
              className="surface-inset rounded-[12px] px-3 py-2 text-12"
              title={
                f.tracked
                  ? `${formatDuration(f.awayMs)} away · ${f.switches} switches`
                  : "Wall-clock time"
              }
            >
              <span className="tnum font-[600] text-ink">{formatDuration(f.focusMs)}</span>
              <span className="text-ink-3">
                {" "}
                · {f.label ?? (f.tracked ? "tracked" : "timer")} ·{" "}
                {new Date(f.startedAt).toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: profile?.timezone ?? "Asia/Kolkata",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const history = (
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={<History size={14} />} tint="var(--violet)">
          Recent study sessions
        </CardTitle>
        <CardSub>what you did in each</CardSub>
      </CardHeader>
      <RecentStudySessions
        sessions={studies}
        now={requestNow()}
        timeZone={profile?.timezone ?? "Asia/Kolkata"}
      />
    </Card>
  );

  const header = (
    <PageHeader
      eyebrow="Sessions · timed by the extension"
      glow={PAGE_GLOW.sessions}
      title="Sessions"
      subtitle="Only study tabs count. The clock pauses on anything else and breaks are kept separate."
      actions={
        <>
          <AddOfflineSession timeZone={profile?.timezone ?? "Asia/Kolkata"} now={requestNow()} />
          {active ? (
            <span className="text-13 text-ink-2">
              A session is running · it&apos;s in the sidebar
            </span>
          ) : (
            <StartStudyButton label={null} active={null} />
          )}
        </>
      }
    />
  );

  if (stats.totalSessions === 0) {
    return (
      <>
        {header}
        <NowSolving />
        {lab}
        {history}
        <Card tier="hero" className="overflow-hidden">
          <EmptyState
            icon={<Puzzle size={18} />}
            title={
              <>
                Install the extension to time <em>every attempt.</em>
              </>
            }
            action={
              <Link href="/extension/connect" className={buttonClasses({ variant: "signal" })}>
                Set up the extension <ButtonArrow />
              </Link>
            }
          >
            Open any LeetCode or GFG problem with it connected: the timer starts on its own and
            catches every verdict. No code is uploaded.
          </EmptyState>
        </Card>
      </>
    );
  }

  // Group by local day (display only).
  const groups: { label: string; items: typeof sessions }[] = [];
  for (const s of sessions) {
    const label = s.startedAt.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      timeZone: profile?.timezone ?? "Asia/Kolkata",
    });
    const g = groups.at(-1);
    if (g?.label === label) g.items.push(s);
    else groups.push({ label, items: [s] });
  }

  // This week's study sessions (the extension's study timer), for the numbers and the list.
  const week = studies;
  const weekFocus = week.reduce((n, x) => n + x.focusMs, 0);
  const weekAway = week.reduce((n, x) => n + x.awayMs, 0);
  const solvedDuring = week.reduce(
    (n, x) => n + x.problems.filter((p) => p.outcome === "solved" || p.outcome === "synced").length,
    0,
  );
  const longest = week.reduce((m, x) => (x.focusMs > m.focusMs ? x : m), week[0] ?? null);
  const solvingMs = week.reduce((n, x) => n + x.problems.reduce((k, p) => k + p.activeMs, 0), 0);
  const videoMs = week.reduce((n, x) => n + x.videos.reduce((k, v) => k + v.watchedMs, 0), 0);
  const otherMs = Math.max(0, weekFocus - solvingMs - videoMs);
  const split = [
    { label: "Solving", ms: Math.min(solvingMs, weekFocus), color: "var(--amber)" },
    {
      label: "Study videos",
      ms: Math.min(videoMs, Math.max(0, weekFocus - solvingMs)),
      color: "var(--sky)",
    },
    { label: "Reading and other", ms: otherMs, color: "var(--mint)" },
  ];
  const C = 2 * Math.PI * 46;
  let turn = -90;

  return (
    <>
      {header}
      <NowSolving />
      <KpiStrip
        items={[
          {
            label: "Focus",
            value: hoursOrMin(weekFocus).v,
            unit: hoursOrMin(weekFocus).u,
            note: "last 7 days",
          },
          {
            label: "Sessions",
            value: week.length,
            note: `${week.filter((x) => x.tracked).length} tracked by the extension`,
          },
          {
            label: "Solved during",
            value: solvedDuring,
            note: solvedDuring
              ? `${Math.round(weekFocus / solvedDuring / 60_000)} min each`
              : "nothing yet",
          },
          {
            label: "Longest",
            value: longest ? hoursOrMin(longest.focusMs).v : "—",
            unit: longest ? hoursOrMin(longest.focusMs).u : undefined,
            note: longest
              ? new Date(longest.startedAt).toLocaleDateString("en-GB", {
                  weekday: "long",
                  timeZone: tz,
                })
              : "no sessions",
          },
          {
            label: "Auto-paused",
            value: hoursOrMin(weekAway).v,
            unit: hoursOrMin(weekAway).u,
            note: "non-study tabs",
          },
        ]}
      />

      <Card className="p-[22px]">
        <CardHeader>
          <CardTitle>Your week, hour by hour</CardTitle>
          <CardSub>study day starts {String(resetHour).padStart(2, "0")}:00</CardSub>
        </CardHeader>
        <WeekHours days={weekHours} resetHour={resetHour} />
      </Card>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardSub>newest first</CardSub>
          </CardHeader>
          {week.length === 0 ? (
            <p className="text-13 text-ink-2">Start a session and it shows up here.</p>
          ) : (
            <ul className="flex flex-col">
              {week.map((x) => {
                const span = Math.max(1, x.endedAt - x.startedAt);
                const what =
                  x.label ??
                  ([...x.problems.map((p) => p.title), ...x.videos.map((v) => v.title)]
                    .slice(0, 3)
                    .join(" · ") ||
                    "Study session");
                return (
                  <li
                    key={x.id}
                    className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-line py-3 first:border-t-0"
                  >
                    <span className="flex flex-col">
                      <span className="text-13 font-[550]">
                        {new Date(x.startedAt).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          timeZone: tz,
                        })}
                      </span>
                      <span className="font-mono text-[11.5px] text-ink-3">
                        {new Date(x.startedAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: tz,
                        })}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className="truncate text-[13.5px]">{what}</span>
                      <span className="flex h-[5px] gap-0.5">
                        <i
                          className="rounded-[2px] bg-[var(--amber)]"
                          style={{ flex: `${x.focusMs} 1 0` }}
                        />
                        {x.awayMs > 0 && (
                          <i
                            className="rounded-[2px] bg-line-3"
                            style={{ flex: `${x.awayMs} 1 0` }}
                          />
                        )}
                        {span - x.focusMs - x.awayMs > 60_000 && (
                          <i
                            className="rounded-[2px] bg-mint"
                            style={{ flex: `${span - x.focusMs - x.awayMs} 1 0` }}
                          />
                        )}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-mono text-14 font-[550]">
                        {formatDuration(x.focusMs)}
                      </span>
                      <span className="text-12 text-ink-3">{x.tracked ? "tracked" : "timer"}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Where the time went</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-5">
              <svg
                viewBox="0 0 120 120"
                width="120"
                height="120"
                role="img"
                aria-label={split.map((x) => `${x.label} ${formatDuration(x.ms)}`).join(", ")}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="var(--surface-4)"
                  strokeWidth="14"
                />
                {split.map((x) => {
                  const frac = weekFocus ? x.ms / weekFocus : 0;
                  const el = (
                    <circle
                      key={x.label}
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke={x.color}
                      strokeWidth="14"
                      strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
                      transform={`rotate(${turn} 60 60)`}
                    />
                  );
                  turn += frac * 360;
                  return el;
                })}
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="600"
                  fill="var(--ink)"
                >
                  {hoursOrMin(weekFocus).v}
                  {hoursOrMin(weekFocus).u}
                </text>
                <text
                  x="60"
                  y="74"
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--ink-3)"
                  fontFamily="var(--font-mono)"
                >
                  this week
                </text>
              </svg>
              <ul className="flex flex-col gap-2.5 text-13">
                {split.map((x) => (
                  <li key={x.label} className="flex items-center gap-2">
                    <i className="size-2 rounded-[2px]" style={{ background: x.color }} />
                    {x.label}
                    <span className="ml-1 font-mono text-ink-3">{formatDuration(x.ms)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          {lab}
          <Card tier="inset">
            <CardHeader>
              <CardTitle>Counted as study</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-1.5">
              {[
                "leetcode.com",
                "geeksforgeeks.org",
                "codeforces.com",
                "takeuforward.org",
                "neetcode.io",
                "Striver on YouTube",
                "study channels",
              ].map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
            <p className="mt-3 text-12 text-ink-3">
              Anything else pauses the clock after 30 seconds. Turn this off in Settings →
              Extension.
            </p>
          </Card>
        </aside>
      </div>

      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Problems you timed</CardTitle>
            <CardSub>latest {sessions.length}</CardSub>
          </CardHeader>
          <div className="mb-4">
            <p className="mb-2 label-mono">How you solved</p>
            <HonestSplit solo={solo} hint={hint} solution={solution} />
          </div>
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <section key={g.label}>
                <p className="mb-1 label-mono">
                  {g.label} · {formatDuration(g.items.reduce((n, x) => n + x.activeMs, 0))}
                </p>
                <ul>
                  {g.items.map((x) => (
                    <SessionItem key={x.id} s={x} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function hoursOrMin(ms: number): { v: string | number; u: string } {
  return ms >= 3_600_000
    ? { v: (ms / 3_600_000).toFixed(1), u: "h" }
    : { v: Math.round(ms / 60_000), u: "min" };
}

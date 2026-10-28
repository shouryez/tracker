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
  buttonClasses,
} from "@upsolve/ui";
import { FocusWeek } from "@/components/charts/insights";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { HonestSplit, SessionItem } from "@/components/sessions";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { LabTimer } from "@/components/daily/lab-timer";
import { NowSolving } from "@/components/daily/now-solving";
import { getActiveFocus, getFocusSummary } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { requestNow } from "@/lib/time";
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

  const [stats, sessions, profile, active] = await Promise.all([
    getSessionStats(user.id),
    getSessions(user.id, 100),
    getProfile(user.id),
    getActiveFocus(user.id),
  ]);
  const focus = await getFocusSummary(user.id, profile?.timezone ?? "Asia/Kolkata", requestNow());
  const { solo, hint, solution } = stats.honest;
  const goalMin = profile?.dailyGoalMin ?? 60;

  const lab = (
    <Card id="lab" glow="var(--signal-mark)" className="scroll-mt-24">
      <CardHeader>
        <CardTitle icon={<Timer size={14} />} tint="var(--signal-mark)">
          Lab mode · focus timer
        </CardTitle>
        <CardSub>
          {formatDuration(focus.todayMs)} today · {formatDuration(focus.weekMs)} this week
        </CardSub>
      </CardHeader>
      <LabTimer active={active} />
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

  const header = (
    <PageHeader
      eyebrow="Sessions · timed by the extension"
      glow={PAGE_GLOW.sessions}
      title={
        <>
          Sessions, <em>every attempt timed.</em>
        </>
      }
      subtitle={
        stats.totalSessions > 0 ? (
          <>
            <span>{formatDuration(stats.focusWeekMs)} this week</span>
            <Dot />
            <span>{stats.totalSessions} sessions</span>
            <Dot />
            <span>{stats.solvedSessions} solved</span>
          </>
        ) : undefined
      }
    />
  );

  if (stats.totalSessions === 0) {
    return (
      <>
        {header}
        <NowSolving />
        {lab}
        <Card tier="hero" className="overflow-hidden">
          <EmptyState
            className="[&_p]:text-white/75 [&>p:first-of-type]:text-white"
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

  const avgMs = sessions.length
    ? sessions.reduce((n, s) => n + s.activeMs, 0) / sessions.length
    : 0;

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

  return (
    <>
      {header}
      <NowSolving />
      <div className="stagger-in grid grid-cols-12 gap-3.5">
        <Card tier="hero" beam className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-white" icon={<Timer size={14} />}>
              Focus this week
            </CardTitle>
            <span className="num text-30">{formatDuration(stats.focusWeekMs)}</span>
          </CardHeader>
          <FocusWeek days={stats.focusByDay} goalMin={goalMin} inverse />
        </Card>

        <div className="col-span-12 grid grid-cols-3 gap-3.5 lg:col-span-5">
          <Mini label="Sessions" value={stats.totalSessions} />
          <Mini label="Solved" value={stats.solvedSessions} tone="var(--success)" />
          <Card className="flex flex-col justify-between gap-3">
            <p className="label-mono">Avg session</p>
            <p className="num text-24">{formatDuration(avgMs)}</p>
          </Card>
          <Card className="col-span-3">
            <p className="mb-3 label-mono">How you solved</p>
            <HonestSplit solo={solo} hint={hint} solution={solution} />
          </Card>
        </div>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle icon={<History size={14} />} tint="var(--violet)">
              Latest {sessions.length}
            </CardTitle>
            <CardSub>newest first</CardSub>
          </CardHeader>
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <section key={g.label}>
                <p className="glass sticky top-[64px] z-10 -mx-2 mb-1 rounded-[10px] px-2 py-1.5 label-mono">
                  {g.label} · {formatDuration(g.items.reduce((n, s) => n + s.activeMs, 0))}
                </p>
                <ul>
                  {g.items.map((s) => (
                    <SessionItem key={s.id} s={s} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card className="flex flex-col justify-between gap-3">
      <p className="label-mono">{label}</p>
      <p className="num text-30" style={tone ? { color: tone } : undefined}>
        <NumberTicker value={value} />
      </p>
    </Card>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpenCheck, CalendarCheck2, ListTodo, Target, Timer, Zap } from "lucide-react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  ProgressRing,
  SkeletonCard,
  buttonClasses,
} from "@upsolve/ui";
import { NextProblemButton } from "@/components/daily/next-problem";
import { TodayPlanList } from "@/components/daily/today-plan";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getActiveFocus, getFocusSummary, getWeekReview } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { formatDuration } from "@/lib/format";
import { getTodayPlan } from "@/lib/plan";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={8} className="col-span-12 h-[480px] xl:col-span-8" />
            <SkeletonCard lines={4} className="col-span-12 h-[300px] xl:col-span-4" />
          </div>
        }
      >
        <TodayContent />
      </Suspense>
    </div>
  );
}

async function TodayContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to plan your day.</p>;
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const now = requestNow();
  const [plan, focus, active, week] = await Promise.all([
    getTodayPlan(user.id, tz, profile?.reviewCap ?? 5, now),
    getFocusSummary(user.id, tz, now),
    getActiveFocus(user.id),
    getWeekReview(user.id, tz, now),
  ]);
  const goalMin = profile?.dailyGoalMin ?? 60;
  const left = plan.total - plan.done;

  return (
    <>
      <PageHeader
        eyebrow={new Date(now).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: tz,
        })}
        glow={PAGE_GLOW.revision}
        title={
          left === 0 && plan.total > 0 ? (
            <>
              Today, <em>all done.</em>
            </>
          ) : (
            <>
              Today, <em>{left} to go.</em>
            </>
          )
        }
        subtitle={
          <>
            <span>{plan.done} done</span>
            <Dot />
            <span>{formatDuration(focus.todayMs)} focused</span>
            <Dot />
            <span>goal {goalMin}m</span>
          </>
        }
        actions={
          <>
            <NextProblemButton />
            <Link
              href="/dashboard/sessions#lab"
              className={buttonClasses({ variant: "signal", size: "sm" })}
            >
              <Timer size={14} aria-hidden="true" /> {active ? "Back to Lab" : "Start focus"}
              <ButtonArrow />
            </Link>
          </>
        }
      />

      <div className="stagger-in grid grid-cols-12 gap-3.5">
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle icon={<ListTodo size={14} />} tint="var(--signal-mark)">
              Today&apos;s plan
            </CardTitle>
            <CardSub>suggested + your own</CardSub>
          </CardHeader>
          <TodayPlanList plan={plan} />
        </Card>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          <Card glow="var(--signal-mark)">
            <CardHeader>
              <CardTitle icon={<Timer size={14} />} tint="var(--signal-mark)">
                Focus today
              </CardTitle>
              <CardSub>{focus.sessionsToday} sessions</CardSub>
            </CardHeader>
            <div className="flex items-center gap-4">
              <ProgressRing
                total={goalMin * 60_000}
                size={96}
                stroke={9}
                segments={[
                  {
                    label: "Focus",
                    value: Math.min(focus.todayMs, goalMin * 60_000),
                    color: "var(--signal-mark)",
                  },
                ]}
                aria-label={`${formatDuration(focus.todayMs)} of ${goalMin} minutes`}
              >
                <span className="num text-17">{Math.round(focus.todayMs / 60_000)}</span>
                <span className="text-[10px] text-ink-3">of {goalMin}m</span>
              </ProgressRing>
              <div className="text-13 text-ink-2">
                {active ? (
                  <p className="font-[600] text-success">In Lab right now</p>
                ) : (
                  <p>Start a focus block when you sit down to solve.</p>
                )}
                {focus.todayAwayMs > 0 && (
                  <p className="mt-1 text-12 text-ink-3">
                    {formatDuration(focus.todayAwayMs)} away
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<Target size={14} />} tint="var(--violet)">
                This week&apos;s targets
              </CardTitle>
              <Link href="/dashboard/review" className="text-12 text-ink-3 hover:text-ink">
                {week.saved ? "edit" : "set them"}
              </Link>
            </CardHeader>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Mediums", week.progress.mediums, week.goals.mediums, "var(--medium)"],
                [
                  "Focus h",
                  Math.round((week.progress.focusMs / 3_600_000) * 10) / 10,
                  week.goals.focusHours,
                  "var(--signal-mark)",
                ],
                ["Revisions", week.progress.revisions, week.goals.revisions, "var(--violet)"],
              ].map(([label, value, goal, color]) => (
                <div key={label as string} className="flex flex-col items-center gap-1.5">
                  <ProgressRing
                    total={Math.max(1, goal as number)}
                    size={68}
                    stroke={7}
                    segments={[
                      {
                        label: label as string,
                        value: Math.min(value as number, goal as number),
                        color: color as string,
                      },
                    ]}
                  >
                    <span className="num text-15">{value as number}</span>
                  </ProgressRing>
                  <span className="text-11 text-ink-3">
                    {label as string} / {goal as number}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card tier="inset">
            <p className="mb-3 label-mono">Quick tools</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["/dashboard/recall", "2-min recall", Zap],
                ["/dashboard/notebook", "Notebook", BookOpenCheck],
                ["/dashboard/later", "Saved for later", CalendarCheck2],
                ["/dashboard/review", "Weekly review", Target],
              ].map(([href, label, Icon]) => {
                const I = Icon as typeof Zap;
                return (
                  <Link
                    key={href as string}
                    href={href as string}
                    className="flex items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-3 py-2.5 text-13 font-[550] transition-colors hover:border-line-2 hover:bg-surface-3"
                  >
                    <I size={14} aria-hidden="true" className="text-ink-3" />
                    {label as string}
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  SkeletonCard,
  buttonClasses,
} from "@upsolve/ui";
import { AddFromSheet } from "@/components/daily/add-from-sheet";
import { NextProblemButton } from "@/components/daily/next-problem";
import { PlanSuggestions, SheetPicks } from "@/components/daily/plan-suggestions";
import { SessionStarter } from "@/components/daily/session-starter";
import { StartStudyButton } from "@/components/daily/study-bar";
import { TodayPlanList } from "@/components/daily/today-plan";
import { Rekha } from "@/components/dashboard/lamplight";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getActiveFocus, getFocusSummary } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { getFollowedSheets, getSheetPicks, getTodayPlan, getTodaySuggestions } from "@/lib/plan";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={8} className="col-span-12 h-[480px] xl:col-span-7" />
            <SkeletonCard lines={6} className="col-span-12 h-[480px] xl:col-span-5" />
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
  const cap = profile?.reviewCap ?? 5;
  const [plan, suggestions, picks, focus, active, followed] = await Promise.all([
    getTodayPlan(user.id, tz, cap, now),
    getTodaySuggestions(user.id, tz, cap, now),
    getSheetPicks(user.id, tz, now),
    getFocusSummary(user.id, tz, now, profile?.dayResetHour ?? 0),
    getActiveFocus(user.id),
    getFollowedSheets(user.id),
  ]);
  const goalMin = profile?.dailyGoalMin ?? 60;
  const goalMs = goalMin * 60_000;
  const left = plan.total - plan.done;
  const resetHour = profile?.dayResetHour ?? 0;
  const why = (["sheet", "next", "stretch", "revision", "drill", "contest", "shared"] as const)
    .map((k) => ({ k, n: plan.items.filter((i) => i.kind === k).length }))
    .filter((x) => x.n > 0);
  const WHY: Record<string, [string, string]> = {
    sheet: ["var(--signal)", "from the sheets you follow"],
    next: ["var(--signal)", "next up for your level"],
    stretch: ["var(--sky)", "a stretch problem"],
    revision: ["var(--amber)", "due for revision"],
    drill: ["var(--rose)", "for your weakest topic"],
    contest: ["var(--sky)", "from a contest"],
    shared: ["var(--ink-3)", "shared by a friend"],
  };
  const current = plan.items.find((i) => !i.done);
  const C1 = 2 * Math.PI * 82;
  const C2 = 2 * Math.PI * 64;
  const focusFrac = Math.min(1, focus.todayMs / Math.max(1, goalMs));
  const planFrac = plan.total ? plan.done / plan.total : 0;
  const fmt = (ms: number) => {
    const m = Math.round(ms / 60_000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
  };

  return (
    <>
      <PageHeader
        eyebrow={`Today · ${new Date(now).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
          timeZone: tz,
        })} · resets at ${String(resetHour).padStart(2, "0")}:00`}
        glow={PAGE_GLOW.revision}
        title={
          <>
            Today{" "}
            <em>{plan.total === 0 ? "· nothing planned" : `${plan.done} of ${plan.total} done`}</em>
          </>
        }
        subtitle="Picked from your place in the sheets you follow, your weakest topic and what's due for revision."
        actions={
          <>
            <NextProblemButton />
            {active ? (
              <Link
                href="/dashboard/sessions"
                className={buttonClasses({ variant: "signal", size: "sm" })}
              >
                Session running <ButtonArrow />
              </Link>
            ) : (
              <StartStudyButton label={current?.title ?? null} active={null} />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_560px] p-[22px]">
          <CardHeader>
            <CardTitle>Queue</CardTitle>
            <span className="flex items-center gap-3">
              <CardSub className="font-mono">{left > 0 ? `${left} left` : "all done"}</CardSub>
              <AddFromSheet sheets={followed} />
            </span>
          </CardHeader>
          <Rekha value={planFrac} className="mb-3" />
          <TodayPlanList plan={plan} hideSummary />
        </Card>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Card className="lamp flex flex-col items-center p-[22px] text-center">
            <svg
              viewBox="0 0 200 200"
              width="188"
              height="188"
              role="img"
              aria-label={`Daily goal: ${fmt(focus.todayMs)} of ${fmt(goalMs)} focus, ${plan.done} of ${plan.total} done`}
            >
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke="var(--surface-4)"
                strokeWidth="12"
              />
              <circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke="var(--amber)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(focusFrac * C1).toFixed(1)} ${C1.toFixed(1)}`}
                transform="rotate(-90 100 100)"
              />
              <circle
                cx="100"
                cy="100"
                r="64"
                fill="none"
                stroke="var(--surface-4)"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r="64"
                fill="none"
                stroke="var(--signal)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(planFrac * C2).toFixed(1)} ${C2.toFixed(1)}`}
                transform="rotate(-90 100 100)"
              />
              <text
                x="100"
                y="98"
                textAnchor="middle"
                fontSize="28"
                fontWeight="600"
                fill="var(--ink)"
                letterSpacing="-1"
              >
                {fmt(focus.todayMs)}
              </text>
              <text
                x="100"
                y="118"
                textAnchor="middle"
                fontSize="11"
                fill="var(--ink-3)"
                fontFamily="var(--font-mono)"
              >
                goal {fmt(goalMs)} · {plan.done}/{plan.total} done
              </text>
            </svg>
            <div className="mt-2 flex justify-center gap-4 text-12 text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[var(--amber)]" /> Focus
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-signal" /> Today&apos;s list
              </span>
            </div>
          </Card>

          <Card className="p-[22px]">
            <CardHeader>
              <CardTitle>Next session</CardTitle>
            </CardHeader>
            {active ? (
              <p className="text-13 text-ink-2">
                A session is running. It&apos;s docked in the sidebar; open it from there.
              </p>
            ) : (
              <SessionStarter
                label={current?.title ?? null}
                cta="Start session"
              />
            )}
          </Card>

          {why.length > 0 && (
            <Card tier="inset" className="p-[18px]">
              <CardHeader>
                <CardTitle>Why these {plan.total}</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-2 text-13 text-ink-2">
                {why.map(({ k, n }) => (
                  <li key={k} className="flex items-center gap-2.5">
                    <i
                      className="size-2 shrink-0 rounded-[2px]"
                      style={{ background: WHY[k]![0] }}
                    />
                    {n} {WHY[k]![1]}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/settings#learning"
                className="mt-3 block text-12 text-ink-2 hover:text-ink"
              >
                Change daily goal and mix →
              </Link>
            </Card>
          )}

          <Card className="p-[18px]">
            <CardHeader>
              <CardTitle>Add more</CardTitle>
              <CardSub>tap + to add</CardSub>
            </CardHeader>
            <PlanSuggestions suggestions={suggestions} />
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 label-mono">From your sheets</p>
              <SheetPicks picks={picks} />
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

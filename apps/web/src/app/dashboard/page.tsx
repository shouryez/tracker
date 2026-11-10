import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Flame, ListChecks, Plus, RotateCcw, Timer, UsersRound } from "lucide-react";
import { frozenDays } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  Pill,
  Skeleton,
  SkeletonCard,
  buttonClasses,
} from "@upsolve/ui";
import { AddFromSheet } from "@/components/daily/add-from-sheet";
import { NextProblemButton } from "@/components/daily/next-problem";
import { NudgeBanner } from "@/components/daily/nudge-banner";
import { NowSolving } from "@/components/daily/now-solving";
import { PlanSuggestions, SheetPicks } from "@/components/daily/plan-suggestions";
import { StartStudyButton } from "@/components/daily/study-bar";
import { TodayPlanList } from "@/components/daily/today-plan";
import { StreakCelebration } from "@/components/dashboard/celebrate";
import { FocusOrb } from "@/components/orbit/focus-orb";
import { PageHeader } from "@/components/page-header";
import { StudyBuddy } from "@/components/study-buddy";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { buddyLevel } from "@/lib/buddies";
import { buildStats, getAccounts, getLocalActivity, getProfile, needsSync } from "@/lib/data";
import { getActiveFocus, getFocusSummary, getStudyHall, getUnseenNudges } from "@/lib/daily-data";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getFollowedSheets, getSheetPicks, getTodayPlan, getTodaySuggestions } from "@/lib/plan";
import { getSessionStats } from "@/lib/sessions-data";
import { getMyGroups, getStreakFreezes } from "@/lib/social-data";
import { requestNow } from "@/lib/time";
import { AutoSync } from "./_components/auto-sync";

export const metadata: Metadata = { title: "Today" };

export default function TodayHome() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today />
    </Suspense>
  );
}

function greeting(tz: string, now: number) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(
      now,
    ),
  );
  return hour < 5
    ? "Burning the midnight oil"
    : hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";
}

const fmt = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
};

async function Today() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to plan your day.</p>;
  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) redirect("/onboarding");
  const now = requestNow();
  const tz = profile.timezone;
  const cap = profile.reviewCap;

  const [accounts, learning, targets, freezes, sessionStats, groups] = await Promise.all([
    getAccounts(user.id),
    getLearning(user.id),
    getTopicTargets(),
    getStreakFreezes(user.id),
    getSessionStats(user.id),
    getMyGroups(user.id),
  ]);
  const [plan, suggestions, picks, focus, active, followed, nudges, localActivity] =
    await Promise.all([
      getTodayPlan(user.id, tz, cap, now),
      getTodaySuggestions(user.id, tz, cap, now),
      getSheetPicks(user.id, tz, now),
      getFocusSummary(user.id, tz, now, profile.dayResetHour),
      getActiveFocus(user.id),
      getFollowedSheets(user.id),
      getUnseenNudges(user.id),
      getLocalActivity(user.id, tz, profile.dayResetHour, now),
    ]);
  const queue = revisionQueue(learning, masteryOf(learning, targets, now), { tz, cap, now });
  const stats = buildStats(accounts, new Date(now), frozenDays(freezes), localActivity);
  const firstGroup = groups[0];
  const hallMembers = firstGroup ? await getStudyHall(firstGroup.id) : [];

  const goalMs = profile.dailyGoalMin * 60_000;
  const left = plan.total - plan.done;
  const current = plan.items.find((i) => !i.done);
  const firstName = profile.name?.split(" ")[0] ?? "there";
  const pastGoal = focus.todayMs >= goalMs;
  const headline =
    plan.total === 0
      ? "Nothing planned yet."
      : left === 0
        ? "Today's list is done."
        : `${left} ${left === 1 ? "problem" : "problems"} left on today's list.`;
  const sub = [
    queue.today.length
      ? `${queue.today.length} ${queue.today.length === 1 ? "revision" : "revisions"} due`
      : null,
    pastGoal
      ? `${Math.round((focus.todayMs - goalMs) / 60_000)} min past your daily goal`
      : `${Math.ceil((goalMs - focus.todayMs) / 60_000)} min to your daily goal`,
  ]
    .filter(Boolean)
    .join(" · ");

  const days = stats.days182;
  const last7 = days.slice(-7);
  const week = sessionStats.focusByDay.map((d) => d.activeMs);
  const weekMax = Math.max(goalMs, ...week, 1);
  const weekFocus = sessionStats.focusWeekMs;
  const rungs = [0, 1, 2, 3, 4, 5].map(
    (i) =>
      learning.filter((p) => !p.state.retired && Math.min(5, Math.max(0, p.state.step)) === i)
        .length,
  );
  const hall = firstGroup
    ? hallMembers
        .map((m) => {
          const liveMs = m.live ? (m.live.pausedAt ?? now) - m.live.startedAt - m.live.pausedMs : 0;
          const state = !m.live ? "idle" : m.live.pausedAt ? "paused" : "studying";
          return {
            userId: m.userId,
            name: m.userId === user.id ? "You" : m.name,
            avatar: m.avatar,
            level: buddyLevel(state, liveMs),
            state,
            todayMs: m.doneMs + Math.max(0, liveMs),
          };
        })
        .sort(
          (a, b) =>
            Number(b.state === "studying") - Number(a.state === "studying") ||
            b.todayMs - a.todayMs,
        )
    : [];
  const studying = hall.filter((m) => m.state === "studying").length;

  return (
    <div className="flex flex-col gap-6">
      <StreakCelebration streak={stats.streak} />
      <PageHeader
        eyebrow={`${new Date(now).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz })} · study day ends ${String(profile.dayResetHour).padStart(2, "0")}:00`}
        title={`${greeting(tz, now)}, ${firstName}`}
        actions={
          <>
            <AutoSync stale={needsSync(accounts)} />
            <NextProblemButton />
          </>
        }
      />
      <NudgeBanner nudges={nudges} />
      {accounts.length === 0 && (
        <Card className="flex flex-wrap items-center gap-4">
          <div className="min-w-[min(100%,260px)] flex-1">
            <p className="text-[17px] font-[600] tracking-[-0.02em]">
              Connect LeetCode, Codeforces or GFG to fill this page.
            </p>
            <p className="mt-1 text-13 text-ink-3">
              It takes a few seconds and only needs your username.
            </p>
          </div>
          <Link href="/onboarding/connect" className={buttonClasses({ variant: "signal" })}>
            Connect a platform <ButtonArrow />
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Hero: the focus orb beside what's left today */}
        <Card
          tier="hero"
          className="col-span-12 flex flex-col items-center gap-8 overflow-hidden p-6 md:flex-row md:p-8"
        >
          <FocusOrb
            size={300}
            orb={196}
            progress={focus.todayMs / Math.max(1, goalMs)}
            rings={[124, 140]}
            dots={[4, 3]}
            center={fmt(focus.todayMs)}
            caption={`of ${fmt(goalMs)} goal`}
            label={`${fmt(focus.todayMs)} focused today of a ${fmt(goalMs)} goal`}
            className="max-sm:scale-90"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <span className="inline-flex h-8 items-center gap-2.5 self-start rounded-full px-3.5 text-13 text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)]">
              {active ? (
                <>
                  <span className="live-dot" /> Session running
                </>
              ) : current ? (
                <>
                  Next up:{" "}
                  <b className="max-w-[260px] truncate font-[600] text-ink">{current.title}</b>
                </>
              ) : (
                "Ready when you are"
              )}
            </span>
            <div>
              <p className="font-display text-[clamp(28px,3vw,40px)] leading-[1.06] text-balance">
                {headline}
              </p>
              <p className="mt-2 text-[15px] text-ink-2">{sub}.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { k: "Today's list", v: plan.total ? `${plan.done}/${plan.total}` : "0" },
                { k: "Due to revise", v: String(queue.today.length) },
                { k: "Focus today", v: fmt(focus.todayMs) },
                { k: "Streak", v: `${stats.streak}d` },
              ].map((x) => (
                <div
                  key={x.k}
                  className="rounded-[14px] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-3 shadow-[inset_0_0_0_1px_var(--line)]"
                >
                  <p className="font-display text-[22px] leading-none tabular-nums">{x.v}</p>
                  <p className="mt-1.5 text-12 text-ink-3">{x.k}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {active ? (
                <Link href="/dashboard/sessions" className={buttonClasses({ variant: "signal" })}>
                  Open the running session <ButtonArrow />
                </Link>
              ) : (
                <StartStudyButton label={current?.title ?? null} active={null} />
              )}
              {queue.today.length > 0 && (
                <Link
                  href="/dashboard/revision"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  <RotateCcw size={15} aria-hidden="true" /> Revise {queue.today.length}
                </Link>
              )}
            </div>
          </div>
        </Card>

        <NowSolving className="col-span-12" />

        {/* The queue, with the day's revision, friends and suggestions beside it */}
        <Card className="col-span-12 flex flex-col xl:col-span-8">
          <CardHeader>
            <CardTitle icon={<ListChecks />}>Today&apos;s list</CardTitle>
            <span className="flex items-center gap-2">
              <CardSub>{left > 0 ? `${left} left` : plan.total ? "All done" : "Empty"}</CardSub>
              <AddFromSheet sheets={followed} />
            </span>
          </CardHeader>
          <div className="mb-4 flex h-2.5 gap-1">
            {plan.items.length ? (
              plan.items.map((i) => (
                <i
                  key={i.id}
                  className="flex-1 rounded-full"
                  style={{
                    background: i.done
                      ? "var(--signal)"
                      : i.id === current?.id
                        ? "var(--ember-gloss)"
                        : "color-mix(in srgb, var(--ink) 8%, transparent)",
                  }}
                />
              ))
            ) : (
              <i className="flex-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
            )}
          </div>
          <TodayPlanList plan={plan} hideSummary />
        </Card>

        <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle icon={<RotateCcw />}>Due for revision</CardTitle>
              <Pill tone={queue.today.length ? "ember" : "mint"}>
                {queue.today.length ? `${queue.today.length} due` : "All clear"}
              </Pill>
            </CardHeader>
            {queue.today.length ? (
              <ul className="flex flex-col">
                {queue.today.slice(0, 3).map((p) => (
                  <li
                    key={p.problemId}
                    className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
                  >
                    <Link href={`/dashboard/problems/${p.problemId}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-[600] hover:underline">
                        {p.title}
                      </span>
                      <span className="block truncate text-12 text-ink-3">
                        {p.topics.slice(0, 2).join(" · ") || "Revision"}
                      </span>
                    </Link>
                    <Pill>Day {[1, 3, 7, 16, 35, 90][Math.min(5, Math.max(0, p.state.step))]}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-13 text-ink-3">
                Nothing due. {rungs.reduce((a, b) => a + b, 0)} problems are on the ladder.
              </p>
            )}
            <Link
              href="/dashboard/revision"
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: "mt-4 self-start",
              })}
            >
              Open revision <ButtonArrow />
            </Link>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle icon={<UsersRound />}>
                {firstGroup ? firstGroup.name : "Study together"}
              </CardTitle>
              {firstGroup && (
                <Pill tone={studying ? "mint" : "neutral"}>
                  {studying ? `${studying} live` : "Quiet"}
                </Pill>
              )}
            </CardHeader>
            {firstGroup ? (
              <ul className="flex flex-col">
                {hall.slice(0, 3).map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0"
                  >
                    <StudyBuddy buddy={m.avatar} level={m.level} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-[600]">{m.name}</span>
                      <span className="block truncate text-12 text-ink-3">
                        {m.state === "studying"
                          ? "Studying now"
                          : m.state === "paused"
                            ? "On a break"
                            : "Not studying"}
                      </span>
                    </span>
                    <span className="tnum font-mono text-13 text-ink-2">{fmt(m.todayMs)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-13 text-ink-2">
                Make a group with friends: everyone&apos;s honest timer, live, and a weekly board.
              </p>
            )}
            <Link
              href={firstGroup ? `/dashboard/groups/${firstGroup.id}` : "/dashboard/groups"}
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: "mt-4 self-start",
              })}
            >
              {firstGroup ? "Open study hall" : "Start a group"} <ButtonArrow />
            </Link>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle icon={<Plus />}>Add to today</CardTitle>
              <CardSub>Tap + to add</CardSub>
            </CardHeader>
            <PlanSuggestions suggestions={suggestions} />
            {picks.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-12 font-[600] text-ink-3">From your sheets</p>
                <SheetPicks picks={picks} />
              </div>
            )}
          </Card>
        </div>

        {/* Three stats with one anatomy: icon + label, a pill, one big value, one small visual */}
        <Card className="col-span-12 flex flex-col gap-4 md:col-span-4">
          <CardHeader className="mb-0">
            <CardTitle icon={<CheckCircle2 />}>Solved</CardTitle>
            <Pill tone="mint">{last7.reduce((n, d) => n + d.count, 0)} this week</Pill>
          </CardHeader>
          <p className="num font-display text-[52px]">
            {stats.solved.total}
            <small className="ml-2 font-sans text-[15px] font-[500] tracking-normal text-ink-3">
              problems
            </small>
          </p>
          <div className="flex h-2.5 gap-1">
            {(["easy", "medium", "hard"] as const).map((d) =>
              stats.solved[d] ? (
                <i
                  key={d}
                  className="rounded-full"
                  style={{ flex: stats.solved[d], background: `var(--${d})` }}
                />
              ) : null,
            )}
            {stats.solved.total === 0 && (
              <i className="flex-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-13 text-ink-3">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px]" style={{ background: `var(--${d})` }} />
                {stats.solved[d]} {d[0]!.toUpperCase() + d.slice(1)}
              </span>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 flex flex-col gap-4 md:col-span-4">
          <CardHeader className="mb-0">
            <CardTitle icon={<Flame />}>Streak</CardTitle>
            <Pill>{stats.activeDays} active days</Pill>
          </CardHeader>
          <p className="num font-display text-[52px]">
            {stats.streak}
            <small className="ml-2 font-sans text-[15px] font-[500] tracking-normal text-ink-3">
              {stats.streak === 1 ? "day" : "days"}
            </small>
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {last7.map((d, i) => (
                <i
                  key={d.date}
                  className="h-8 flex-1 rounded-[9px]"
                  style={
                    d.count > 0
                      ? {
                          background: "var(--signal)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)",
                        }
                      : i === 6
                        ? {
                            boxShadow:
                              "inset 0 0 0 1.5px color-mix(in srgb, var(--primary) 80%, transparent)",
                          }
                        : { background: "color-mix(in srgb, var(--ink) 7%, transparent)" }
                  }
                />
              ))}
            </div>
            <div className="flex gap-2">
              {last7.map((d) => (
                <span key={d.date} className="flex-1 text-center font-mono text-11 text-ink-3">
                  {new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", {
                    weekday: "narrow",
                    timeZone: "UTC",
                  })}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="col-span-12 flex flex-col gap-4 md:col-span-4">
          <CardHeader className="mb-0">
            <CardTitle icon={<Timer />}>Focus this week</CardTitle>
            <Pill tone={weekFocus >= goalMs * 7 ? "mint" : "neutral"}>
              {weekFocus >= goalMs * 7 ? "Goal met" : `Goal ${fmt(goalMs * 7)}`}
            </Pill>
          </CardHeader>
          <p className="num font-display text-[52px]">{fmt(weekFocus)}</p>
          <div className="flex flex-col gap-2">
            <div className="relative flex h-14 items-end gap-2">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 border-t-[1.5px] border-dashed border-line-3"
                style={{ bottom: `${(goalMs / weekMax) * 100}%` }}
              />
              {week.map((ms, i) => (
                <i
                  key={i}
                  className="flex-1 rounded-[6px_6px_3px_3px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--signal)_100%,white_20%),color-mix(in_srgb,var(--signal)_75%,black))]"
                  style={{ height: `${Math.max(4, (ms / weekMax) * 100)}%`, opacity: ms ? 1 : 0.3 }}
                />
              ))}
            </div>
            <p className="text-12 text-ink-3">
              Honest time only: the timer pauses when you switch tabs.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-11 w-96" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <SkeletonCard lines={3} className="col-span-12 h-[360px]" />
        <SkeletonCard lines={8} className="col-span-12 h-[520px] xl:col-span-8" />
        <SkeletonCard lines={6} className="col-span-12 h-[520px] xl:col-span-4" />
      </div>
    </div>
  );
}

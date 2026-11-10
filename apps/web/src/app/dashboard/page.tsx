import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Flame, Share2 } from "lucide-react";
import { ratingToDifficulty } from "@upsolve/adapters";
import { frozenDays } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Skeleton,
  SkeletonCard,
  VerdictChip,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { CardLink } from "@/components/card-link";
import { NudgeBanner } from "@/components/daily/nudge-banner";
import { NowSolving } from "@/components/daily/now-solving";
import { TodayPlanList } from "@/components/daily/today-plan";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { StreakCelebration } from "@/components/dashboard/celebrate";
import { DayDial, KpiStrip, Rekha, WeekStrip } from "@/components/dashboard/lamplight";
import { NumberTicker } from "@/components/fx/number-ticker";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { PLATFORM_LABEL } from "@/components/platform-meta";
import { formatEta } from "@/components/progress";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import {
  buildStats,
  getAccounts,
  getProfile,
  getRecentSolves,
  needsSync,
  type RecentSolve,
  getLocalActivity,
} from "@/lib/data";
import { formatDuration } from "@/lib/format";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getSheetDetail, getSheetSummaries } from "@/lib/sheets-data";
import { getExtensionTokens, getSessionStats } from "@/lib/sessions-data";
import { getMyGroups, getStreakFreezes } from "@/lib/social-data";
import { getActiveFocus, getFocusSummary, getStudyHall, getUnseenNudges } from "@/lib/daily-data";
import { StartStudyButton } from "@/components/daily/study-bar";
import { buddyLevel } from "@/lib/buddies";
import { StudyBuddy } from "@/components/study-buddy";
import { getTodayPlan } from "@/lib/plan";
import { localDate, requestNow, studyDay } from "@/lib/time";
import { AutoSync } from "./_components/auto-sync";

export const metadata: Metadata = { title: "Overview" };

const DAY_MS = 86_400_000;

export default function DashboardPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
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

async function Overview() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <DemoNotice />;

  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) redirect("/onboarding");

  const [accounts, recent, sessionStats, tokens, learning, targets, sheets, freezes] =
    await Promise.all([
      getAccounts(user.id),
      getRecentSolves(user.id),
      getSessionStats(user.id),
      getExtensionTokens(user.id),
      getLearning(user.id),
      getTopicTargets(),
      getSheetSummaries(user.id),
      getStreakFreezes(user.id),
    ]);
  const now = requestNow();
  const [plan, nudges, localActivity, focusSummary] = await Promise.all([
    getTodayPlan(user.id, profile.timezone, profile.reviewCap, now),
    getUnseenNudges(user.id),
    getLocalActivity(user.id, profile.timezone, profile.dayResetHour, now),
    getFocusSummary(user.id, profile.timezone, now, profile.dayResetHour),
  ]);
  const active = await getActiveFocus(user.id);
  const mastery = masteryOf(learning, targets, now);
  const queue = revisionQueue(learning, mastery, {
    tz: profile.timezone,
    cap: profile.reviewCap,
    now,
  });
  const followed = sheets.filter((s) => s.following);
  const hasExtension = tokens.length > 0;
  const stats = buildStats(accounts, new Date(now), frozenDays(freezes), localActivity);
  const todayLocal = localDate(profile.timezone, now);
  const activeFreeze = freezes.find((f) => f.start <= todayLocal && f.end >= todayLocal);
  const firstName = profile.name?.split(" ")[0] ?? "there";
  const goalMs = profile.dailyGoalMin * 60_000;
  const left = plan.total - plan.done;
  const facts = [
    queue.today.length
      ? `${queue.today.length} revision${queue.today.length === 1 ? "" : "s"} due`
      : null,
    plan.total
      ? left
        ? `${left} problem${left === 1 ? "" : "s"} left on today's list`
        : "today's list done"
      : null,
    focusSummary.todayMs >= goalMs
      ? `you're ${Math.round((focusSummary.todayMs - goalMs) / 60_000)} minutes past your daily goal`
      : `${Math.ceil((goalMs - focusSummary.todayMs) / 60_000)} minutes to your daily goal`,
  ].filter(Boolean) as string[];
  const headline =
    facts.length > 1
      ? `${facts.slice(0, -1).join(", ")}, and ${facts.at(-1)}.`
      : `${facts[0]![0]!.toUpperCase()}${facts[0]!.slice(1)}.`;

  // New problems solved this week vs the week before (first solve dates).
  const thisWeek = learning.filter((p) => p.state.firstSolvedAt > now - 7 * DAY_MS).length;
  const lastWeek = learning.filter(
    (p) => p.state.firstSolvedAt > now - 14 * DAY_MS && p.state.firstSolvedAt <= now - 7 * DAY_MS,
  ).length;
  const days = stats.days182;
  const spark30 = days.slice(-30).map((d) => d.count);
  // The study day (timezone + day reset) for the clock face.
  const day = studyDay(profile.timezone, now, profile.dayResetHour);
  const todaySessions = focusSummary.recent
    .filter((r) => r.startedAt >= day.start)
    .map((r) => ({ start: r.startedAt, ms: r.focusMs + r.awayMs }));
  const todaySolves = recent
    .map((r) => new Date(r.submittedAt).getTime())
    .filter((t) => t >= day.start && t < day.end);
  // Last 7 study days: focus from the extension's sessions, accepted from the heatmap.
  const last7 = days.slice(-7).map((d, i) => ({
    label: new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "narrow",
      timeZone: "UTC",
    }),
    focusMs: sessionStats.focusByDay[i]?.activeMs ?? 0,
    solved: d.count,
    today: i === 6,
  }));
  const week7Ms = last7.reduce((n, d) => n + d.focusMs, 0);
  const activeDays30 = spark30.filter((n) => n > 0).length;
  // Topics by solved, with the weakest (lowest mastery among those you've started).
  const topTopics = [...mastery]
    .filter((m) => m.solved > 0)
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 6);
  const weakest =
    topTopics.length > 1 ? topTopics.reduce((x, y) => (y.score < x.score ? y : x)) : null;
  // Cards on each rung of the ladder (1, 3, 7, 16, 35, 90 days).
  const rungs = [0, 1, 2, 3, 4, 5].map(
    (i) =>
      learning.filter((p) => !p.state.retired && Math.min(5, Math.max(0, p.state.step)) === i)
        .length,
  );
  const base30 = stats.solved.total - spark30.reduce((n, v) => n + v, 0);
  const cumulative30 = spark30.map(
    (_, i) => base30 + spark30.slice(0, i + 1).reduce((n, v) => n + v, 0),
  );
  const goalWeekMs = profile.dailyGoalMin * 7 * 60_000;
  const focusPct = Math.min(
    100,
    Math.round((sessionStats.focusWeekMs / Math.max(1, goalWeekMs)) * 100),
  );
  const nextReview = queue.today[0];
  const mainSheet = followed[0];
  const [sheetDetail, groups] = await Promise.all([
    mainSheet ? getSheetDetail(user.id, mainSheet.slug) : Promise.resolve(null),
    getMyGroups(user.id),
  ]);
  const sheetSteps: { step: string; done: number; total: number }[] = [];
  for (const it of sheetDetail?.items ?? []) {
    if (it.kind !== "practice") continue;
    let st = sheetSteps.find((x) => x.step === it.step);
    if (!st) sheetSteps.push((st = { step: it.step, done: 0, total: 0 }));
    st.total++;
    if (it.status) st.done++;
  }
  // The step you're on: the furthest one you've ticked anything in.
  const currentStep = Math.max(
    0,
    sheetSteps.reduce((at, st, i) => (st.done > 0 ? i : at), 0),
  );
  const firstGroup = groups[0];
  const hallMembers = firstGroup ? await getStudyHall(firstGroup.id) : [];
  const hall = firstGroup
    ? (() => {
        const members = hallMembers
          .map((m) => {
            const liveMs = m.live
              ? (m.live.pausedAt ?? now) - m.live.startedAt - m.live.pausedMs
              : 0;
            const state = !m.live ? "idle" : m.live.pausedAt ? "paused" : "studying";
            return {
              userId: m.userId,
              name: m.name,
              avatar: m.avatar,
              level: buddyLevel(state, liveMs),
              status:
                state === "studying"
                  ? "Studying now"
                  : state === "paused"
                    ? "On a break"
                    : "Not studying",
              todayMs: m.doneMs + Math.max(0, liveMs),
              state,
            };
          })
          .sort(
            (a, b) =>
              Number(b.state === "studying") - Number(a.state === "studying") ||
              b.todayMs - a.todayMs,
          )
          .map((m) => ({
            ...m,
            today: `${Math.floor(m.todayMs / 3_600_000)}:${String(Math.floor((m.todayMs % 3_600_000) / 60_000)).padStart(2, "0")}`,
          }));
        return {
          id: firstGroup.id,
          name: firstGroup.name,
          members,
          studying: members.filter((m) => m.state === "studying").length,
        };
      })()
    : null;
  const focus = sessionStats.focusWeekMs;
  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      <StreakCelebration streak={stats.streak} />
      <PageHeader
        eyebrow={`${new Date(now).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
          timeZone: profile.timezone,
        })} · study day ends ${String(profile.dayResetHour).padStart(2, "0")}:00`}
        glow={PAGE_GLOW.overview}
        title={
          <>
            {greeting(profile.timezone, now)}, {firstName}
          </>
        }
        subtitle={<span>{headline}</span>}
        actions={
          <>
            <AutoSync stale={needsSync(accounts)} />
            <a
              href="/api/share-card?download=1"
              title="Download a 1200×630 card with your heatmap and numbers, for LinkedIn or WhatsApp"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              <Share2 size={14} aria-hidden="true" /> Share card
            </a>
            {active ? (
              <Link
                href="/dashboard/sessions"
                className={buttonClasses({ variant: "signal", size: "sm" })}
              >
                Session running <ButtonArrow />
              </Link>
            ) : (
              <StartStudyButton label={null} active={null} />
            )}
          </>
        }
      />

      <NudgeBanner nudges={nudges} />
      {accounts.length === 0 && <ConnectPrompt />}

      <div className="stagger-in grid grid-cols-12 gap-3.5">
        {/* Tonight · the study day as a clock beside today's list */}
        <Card className="lamp col-span-12 grid items-center gap-6 p-[22px] sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] xl:col-span-7">
          <DayDial
            dayStart={day.start}
            now={now}
            resetHour={profile.dayResetHour}
            sessions={todaySessions}
            solves={todaySolves}
            focusMs={focusSummary.todayMs}
            goalMs={profile.dailyGoalMin * 60_000}
            solvedToday={todaySolves.length}
            className="mx-auto w-full max-w-[240px]"
          />
          <div className="flex min-w-0 flex-col gap-3">
            <CardHeader className="mb-0">
              <CardTitle>Today&apos;s list</CardTitle>
              <span className="flex items-center gap-2">
                <CardSub className="font-mono">
                  {plan.done} of {plan.total}
                </CardSub>
                <CardLink href="/dashboard/today" label="Open today's plan" />
              </span>
            </CardHeader>
            <Rekha value={plan.total ? plan.done / plan.total : 0} />
            <TodayPlanList plan={plan} compact />
          </div>
        </Card>

        <Card className="col-span-12 flex flex-col gap-3.5 p-[22px] xl:col-span-5">
          <CardHeader className="mb-0">
            <CardTitle>Last 7 days</CardTitle>
            <span className="flex items-center gap-3 text-12 text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-[2px] bg-[var(--amber)]" /> focus
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-signal" /> accepted
              </span>
            </span>
          </CardHeader>
          <WeekStrip days={last7} goalMs={profile.dailyGoalMin * 60_000} />
          <div className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-3.5">
            <div>
              <p className="text-12 text-ink-3">Streak</p>
              <p className="num mt-1 flex items-center gap-1.5 text-24">
                <Flame
                  size={18}
                  aria-hidden="true"
                  className={stats.streak > 0 ? "text-[var(--amber)]" : "text-ink-4"}
                />
                {stats.streak}
                <small className="text-[.5em] font-[500] text-ink-3">
                  {stats.streak === 1 ? "day" : "days"}
                </small>
              </p>
            </div>
            <div>
              <p className="text-12 text-ink-3">Focus</p>
              <p className="num mt-1 text-24">
                {week7Ms >= 3_600_000
                  ? (week7Ms / 3_600_000).toFixed(1)
                  : Math.round(week7Ms / 60_000)}
                <small className="ml-0.5 text-[.5em] font-[500] text-ink-3">
                  {week7Ms >= 3_600_000 ? "h" : "min"}
                </small>
              </p>
            </div>
            <div>
              <p className="text-12 text-ink-3">Accepted</p>
              <p className="num mt-1 text-24">{last7.reduce((n, d) => n + d.solved, 0)}</p>
            </div>
          </div>
        </Card>

        <NowSolving className="col-span-12" />

        <KpiStrip
          className="col-span-12"
          items={[
            {
              label: "Solved",
              value: <NumberTicker value={stats.solved.total} />,
              note: `${stats.solved.easy} easy · ${stats.solved.medium} med · ${stats.solved.hard} hard`,
              spark: cumulative30,
              href: "/dashboard/analytics",
            },
            {
              label: "Active days",
              value: activeDays30,
              unit: "/30",
              note:
                thisWeek > 0
                  ? `+${thisWeek} new this week`
                  : lastWeek > 0
                    ? `${lastWeek} new last week`
                    : "last 30 days",
              tone: thisWeek > lastWeek ? "up" : undefined,
              spark: spark30,
            },
            {
              label: "Streak",
              value: stats.streak,
              unit: stats.streak === 1 ? "day" : "days",
              note: activeFreeze
                ? `frozen until ${fmtDay(activeFreeze.end)}`
                : `${stats.activeDays} active days this year`,
              href: "/dashboard/settings#streak",
            },
            {
              label: "To revise",
              value: queue.today.length,
              unit: "today",
              note:
                queue.backlog > 0
                  ? `${queue.backlog} more waiting`
                  : `${queue.reviewedWeek} reviewed this week`,
              href: "/dashboard/revision",
            },
            {
              label: "Focus this week",
              value:
                focus >= 3_600_000 ? (focus / 3_600_000).toFixed(1) : Math.round(focus / 60_000),
              unit: focus >= 3_600_000 ? "h" : "min",
              note: hasExtension
                ? `${focusPct}% of ${formatDuration(goalWeekMs)} goal`
                : "install the extension",
              spark: sessionStats.focusByDay.map((d) => d.activeMs),
              sparkColor: "var(--amber)",
              href: "/dashboard/sessions",
            },
          ]}
        />

        {/* Activity beside what you've solved */}
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardSub>26 weeks · by your study day</CardSub>
          </CardHeader>
          <ActivityHeatmap days={days} />
        </Card>

        <Card className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          <CardHeader className="mb-0">
            <CardTitle>Solved</CardTitle>
            <CardSub className="font-mono">{stats.solved.total}</CardSub>
          </CardHeader>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-4">
            {(["easy", "medium", "hard"] as const).map((d) =>
              stats.solved[d] ? (
                <span
                  key={d}
                  style={{
                    width: `${(stats.solved[d] / Math.max(1, stats.solved.total)) * 100}%`,
                    background: `var(--${d})`,
                  }}
                />
              ) : null,
            )}
          </div>
          <ul className="flex flex-col">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <li
                key={d}
                className="grid grid-cols-[72px_minmax(0,1fr)_28px] items-center gap-3 border-t border-line py-2.5 first:border-t-0"
              >
                <DifficultyTag difficulty={d} />
                <span className="h-1 overflow-hidden rounded-full bg-surface-4">
                  <span
                    className="block h-full origin-left animate-[grow-x_800ms_var(--ease-out)_backwards] rounded-full"
                    style={{
                      width: `${(stats.solved[d] / Math.max(1, stats.solved.easy, stats.solved.medium, stats.solved.hard)) * 100}%`,
                      background: `var(--${d})`,
                    }}
                  />
                </span>
                <span
                  className={cn(
                    "tnum text-right font-mono text-13",
                    !stats.solved[d] && "text-ink-3",
                  )}
                >
                  {stats.solved[d]}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-12 text-ink-3">
            <span className="truncate">
              {accounts.length
                ? accounts
                    .map((a) => `${PLATFORM_LABEL[a.platform]} ${a.snapshot?.solved.total ?? 0}`)
                    .join(" · ")
                : "Connect a platform to start"}
            </span>
            <Link href="/dashboard/analytics" className="shrink-0 text-ink-2 hover:text-ink">
              Analytics →
            </Link>
          </div>
        </Card>

        {/* Topics · the ladder · your main sheet, step by step */}
        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>Topics</CardTitle>
            <CardSub>solved</CardSub>
          </CardHeader>
          {topTopics.length === 0 ? (
            <p className="text-13 text-ink-3">Solve a few problems and your topics show up here.</p>
          ) : (
            <ul className="flex flex-col">
              {topTopics.map((t) => (
                <li
                  key={t.topic}
                  className="grid grid-cols-[110px_minmax(0,1fr)_24px] items-center gap-3 border-t border-line py-2 first:border-t-0"
                >
                  <span
                    className={cn(
                      "truncate text-[13.5px]",
                      t.topic === weakest?.topic && "text-bad",
                    )}
                  >
                    {t.label}
                  </span>
                  <span className="h-1 overflow-hidden rounded-full bg-surface-4">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(t.solved / Math.max(1, topTopics[0]!.solved)) * 100}%`,
                        background: t.topic === weakest?.topic ? "var(--rose)" : "var(--signal)",
                      }}
                    />
                  </span>
                  <span className="tnum text-right font-mono text-12">{t.solved}</span>
                </li>
              ))}
            </ul>
          )}
          {weakest && (
            <p className="mt-3 text-12 text-ink-3">
              Weakest for your level: <span className="text-bad">{weakest.label}</span>.{" "}
              <Link href="/dashboard/today" className="text-ink-2 hover:text-ink">
                Picks on Today →
              </Link>
            </p>
          )}
        </Card>

        <Card className="col-span-12 flex flex-col md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle>Revision ladder</CardTitle>
            <CardSub className="font-mono">
              {learning.filter((p) => !p.state.retired).length} cards
            </CardSub>
          </CardHeader>
          <div className="grid h-[150px] grid-cols-6 items-end gap-1.5">
            {rungs.map((n, i) => (
              <div key={i} className="flex h-full flex-col justify-end gap-1.5">
                <span className="tnum text-center font-mono text-12 text-ink-2">{n}</span>
                <span
                  className="origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] rounded-[6px_6px_3px_3px] bg-[linear-gradient(180deg,var(--amber),color-mix(in_srgb,var(--amber)_35%,transparent))]"
                  style={{
                    height: n ? `${20 + (n / Math.max(1, ...rungs)) * 90}px` : "4px",
                    opacity: n ? 1 - i * 0.08 : 0.4,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
                <span className="text-center font-mono text-[10.5px] text-ink-3">
                  {[1, 3, 7, 16, 35, 90][i]}d
                </span>
              </div>
            ))}
          </div>
          {nextReview ? (
            <div className="mt-auto flex flex-wrap items-center gap-3 rounded-[12px] bg-primary-soft px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-13">{nextReview.title} is due</span>
              <Link
                href="/dashboard/revision"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Revise
              </Link>
            </div>
          ) : (
            <p className="mt-auto pt-3 text-12 text-ink-3">Nothing due today.</p>
          )}
        </Card>

        <Card className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          <CardHeader className="mb-0">
            <CardTitle>{mainSheet ? mainSheet.name.replace(/'s\b/, "") : "Your sheet"}</CardTitle>
            {mainSheet && (
              <CardSub className="font-mono">
                {mainSheet.done} / {mainSheet.total}
              </CardSub>
            )}
          </CardHeader>
          {mainSheet ? (
            <>
              <Rekha value={mainSheet.done / Math.max(1, mainSheet.total)} />
              <ul className="grid grid-cols-6 gap-1.5">
                {sheetSteps.map((st, i) => (
                  <li
                    key={st.step}
                    title={`${st.step}: ${st.done} of ${st.total}`}
                    className="relative h-[34px] overflow-hidden rounded-[7px] bg-surface-3"
                    style={{
                      boxShadow: `inset 0 0 0 1px ${i === currentStep ? "var(--signal)" : "var(--line)"}`,
                    }}
                  >
                    <span
                      className="absolute inset-x-0 bottom-0 bg-signal-soft"
                      style={{
                        height: `${(st.done / Math.max(1, st.total)) * 100}%`,
                        borderTop: st.done ? "1px solid var(--signal)" : undefined,
                      }}
                    />
                    <span className="absolute top-1 left-1.5 font-mono text-[10px] text-ink-3">
                      {i + 1}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex justify-between gap-2 text-12 text-ink-3">
                <span className="truncate">
                  {sheetSteps[currentStep]
                    ? `Now on step ${currentStep + 1} · ${sheetSteps[currentStep]!.step.replace(/^Step\s*\d+\s*[:·.-]?\s*/i, "")}`
                    : "All steps done"}
                </span>
                {mainSheet.eta && (
                  <span className="shrink-0">at this pace: {formatEta(mainSheet.eta)}</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-3">
              <p className="text-13 text-ink-2">Follow a sheet and its steps fill in here.</p>
              <Link
                href="/dashboard/sheets"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Pick a sheet <ButtonArrow />
              </Link>
            </div>
          )}
        </Card>

        {/* Recent submissions · your group, live */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle>Recent submissions</CardTitle>
            <CardSub>
              {accounts[0]?.lastSyncedAt ? (
                <>
                  synced <TimeAgo date={accounts[0].lastSyncedAt} />
                </>
              ) : (
                "accepted"
              )}
            </CardSub>
          </CardHeader>
          {recent.length === 0 ? (
            <p className="text-13 text-ink-3">
              Your accepted problems show up here. Start with a sheet.
            </p>
          ) : (
            <ol className="flex flex-col">
              {recent.slice(0, 6).map((r, i) => (
                <RecentRow key={r.id} solve={r} index={i} timeZone={profile.timezone} />
              ))}
            </ol>
          )}
        </Card>

        <Card className="col-span-12 flex flex-col xl:col-span-5">
          <CardHeader>
            <CardTitle>{hall ? `${hall.name} · live` : "Study together"}</CardTitle>
            {hall && hall.studying > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-0.5 text-12 font-[600] text-signal-text">
                <span className="size-1.5 rounded-full bg-signal" /> {hall.studying} studying
              </span>
            )}
          </CardHeader>
          {hall ? (
            <>
              <ul className="flex flex-col">
                {hall.members.slice(0, 5).map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0"
                  >
                    <StudyBuddy buddy={m.avatar} level={m.level} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-[550]">
                        {m.userId === user.id ? "You" : m.name}
                      </span>
                      <span className="block truncate text-12 text-ink-3">{m.status}</span>
                    </span>
                    <span className="text-right">
                      <span className="tnum block font-mono text-14 font-[550]">{m.today}</span>
                      <span className="text-11 text-ink-3">today</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/dashboard/groups/${hall.id}`}
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                  className: "mt-auto self-start",
                })}
              >
                Open study hall
              </Link>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-3">
              <p className="text-13 text-ink-2">
                Make a group with friends: everyone&apos;s timer, live, and a weekly leaderboard.
              </p>
              <Link
                href="/dashboard/groups"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Start a group <ButtonArrow />
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecentRow({
  solve,
  index,
  timeZone,
}: {
  solve: RecentSolve;
  index: number;
  timeZone: string;
}) {
  const difficulty =
    solve.platform === "codeforces"
      ? ratingToDifficulty(solve.rating ?? undefined)
      : (solve.difficultyRaw?.toLowerCase() as "easy" | "medium" | "hard" | undefined);
  const at = new Date(solve.submittedAt);
  const sameDay =
    at.toLocaleDateString("en-CA", { timeZone }) ===
    new Date(requestNow()).toLocaleDateString("en-CA", { timeZone });
  const when = sameDay
    ? at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone })
    : at.toLocaleDateString("en-GB", { weekday: "short", timeZone });
  const title = (
    <span className="block truncate text-[13.5px] font-[550] hover:underline">{solve.title}</span>
  );
  return (
    <li
      className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2.5 first:border-t-0"
      style={{ animation: `rise-in 420ms var(--ease-out) ${index * 45}ms backwards` }}
    >
      <span className="font-mono text-12 text-ink-3">{when}</span>
      <span className="min-w-0">
        {solve.problemId ? (
          <Link href={`/dashboard/problems/${solve.problemId}`}>{title}</Link>
        ) : (
          <a href={solve.url} target="_blank" rel="noreferrer">
            {title}
          </a>
        )}
        <span className="block truncate text-12 text-ink-3">
          {PLATFORM_LABEL[solve.platform]}
          {difficulty ? ` · ${difficulty[0]!.toUpperCase()}${difficulty.slice(1)}` : ""}
          {solve.accepted > 1 ? ` · solved ${solve.accepted}×` : ""}
        </span>
      </span>
      <VerdictChip verdict="AC" />
    </li>
  );
}

function ConnectPrompt() {
  return (
    <Card tier="hero" className="flex flex-wrap items-center gap-4">
      <div className="min-w-[min(100%,260px)] flex-1">
        <p className="text-18 font-[600] tracking-[-0.02em]">
          Your dashboard is <em className="font-display font-normal">empty.</em> Connect LeetCode,
          Codeforces or GFG.
        </p>
        <p className="text-13 text-white/70">
          It takes a few seconds, and only needs your username.
        </p>
      </div>
      <Link href="/onboarding/connect" className={buttonClasses({ variant: "signal" })}>
        Connect a platform <ButtonArrow />
      </Link>
    </Card>
  );
}

function DemoNotice() {
  return (
    <p className="rounded-md border border-dashed border-line-2 bg-surface p-3.5 font-mono text-xs leading-relaxed text-ink-2">
      Demo mode: Supabase isn&apos;t configured. Fill in{" "}
      <code className="text-ink">apps/web/.env.local</code> (see README) to sign in and see your
      data.
    </p>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        <SkeletonCard lines={1} className="col-span-12 h-[68px] md:col-span-6 xl:col-span-5" />
        <SkeletonCard lines={1} className="col-span-12 h-[68px] md:col-span-6 xl:col-span-7" />
        <SkeletonCard lines={3} className="col-span-12 h-[230px] xl:col-span-6" />
        <div className="col-span-12 grid gap-3.5 sm:grid-cols-3 xl:col-span-6">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i} lines={1} className="h-[150px] xl:h-[230px]" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonCard
            key={i}
            lines={5}
            className="col-span-12 h-[320px] md:col-span-6 xl:col-span-4"
          />
        ))}
      </div>
    </div>
  );
}

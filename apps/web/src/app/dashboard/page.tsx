import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  Brain,
  Flame,
  Gauge,
  Grid3x3,
  History,
  ListChecks,
  Play,
  Plug,
  Puzzle,
  RotateCcw,
  Share2,
  Sparkles,
  Timer,
} from "lucide-react";
import { ratingToDifficulty } from "@upsolve/adapters";
import { frozenDays, suggestNext, topicLabel, type Difficulty } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  CounterChip,
  DifficultyTag,
  EmptyState,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  StrengthLadder,
  Tag,
  VerifiedChip,
  buttonClasses,
} from "@upsolve/ui";
import { CardLink } from "@/components/card-link";
import { NextProblemButton } from "@/components/daily/next-problem";
import { NudgeBanner } from "@/components/daily/nudge-banner";
import { NowSolving } from "@/components/daily/now-solving";
import { TodayPlanList } from "@/components/daily/today-plan";
import { SolvedSplit, Sparkline } from "@/components/charts";
import { FocusWeek, TopicRadar } from "@/components/charts/insights";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { StreakCelebration } from "@/components/dashboard/celebrate";
import { HalfGauge } from "@/components/dashboard/widgets";
import { DayDial, KpiStrip, Rekha, WeekStrip } from "@/components/dashboard/lamplight";
import { NumberTicker } from "@/components/fx/number-ticker";
import { dueLabel, MasteryBars, reviewUrl } from "@/components/learning";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL, PLATFORM_STROKE } from "@/components/platform-meta";
import { formatEta, SegmentedProgress } from "@/components/progress";
import { PlatformMark, platformMarkId } from "@/components/site-icons";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import {
  buildStats,
  getAccounts,
  getContestSeries,
  getProfile,
  getRecentSolves,
  needsSync,
  type RecentSolve,
  getLocalActivity,
} from "@/lib/data";
import { formatDuration } from "@/lib/format";
import {
  getLearning,
  getNextCandidates,
  getTopicTargets,
  masteryOf,
  revisionQueue,
} from "@/lib/learning";
import { getSheetSummaries } from "@/lib/sheets-data";
import { getExtensionTokens, getSessionStats, getSessions } from "@/lib/sessions-data";
import { getStreakFreezes } from "@/lib/social-data";
import { getFocusSummary, getUnseenNudges } from "@/lib/daily-data";
import { getTodayPlan } from "@/lib/plan";
import { localDate, localDay, requestNow, studyDay } from "@/lib/time";
import { AutoSync } from "./_components/auto-sync";

export const metadata: Metadata = { title: "Overview" };

const DAY_MS = 86_400_000;
const icon = (Icon: typeof Flame, className?: string) => (
  <Icon size={14} strokeWidth={2} className={className} />
);

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

  const [
    accounts,
    contestSeries,
    recent,
    sessionStats,
    sessions,
    tokens,
    learning,
    targets,
    candidates,
    sheets,
    freezes,
  ] = await Promise.all([
    getAccounts(user.id),
    getContestSeries(user.id),
    getRecentSolves(user.id),
    getSessionStats(user.id),
    getSessions(user.id, 3),
    getExtensionTokens(user.id),
    getLearning(user.id),
    getTopicTargets(),
    getNextCandidates(user.id),
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
  const mastery = masteryOf(learning, targets, now);
  const queue = revisionQueue(learning, mastery, {
    tz: profile.timezone,
    cap: profile.reviewCap,
    now,
  });
  const { end: endOfToday } = localDay(profile.timezone, now);
  const solvedBy: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const p of learning) if (p.difficulty) solvedBy[p.difficulty]++;
  const nextUp = suggestNext(candidates, mastery, solvedBy, 4);
  // The topics you've solved most in, strongest first (radar wants up to 8).
  const masteryTop = mastery
    .filter((m) => m.solved > 0)
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 8)
    .sort((a, b) => b.score - a.score);
  const followed = sheets.filter((s) => s.following);
  const hasExtension = tokens.length > 0;
  const answered =
    sessionStats.honest.solo + sessionStats.honest.hint + sessionStats.honest.solution;
  const stats = buildStats(accounts, new Date(now), frozenDays(freezes), localActivity);
  const todayLocal = localDate(profile.timezone, now);
  const activeFreeze = freezes.find((f) => f.start <= todayLocal && f.end >= todayLocal);
  const firstName = profile.name?.split(" ")[0] ?? "there";

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
  const activeDays30 = spark30.filter((n) => n > 0).length;
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
  const focus = sessionStats.focusWeekMs;
  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const overdueDays = nextReview ? Math.floor((now - nextReview.state.dueAt) / DAY_MS) : 0;

  return (
    <div className="flex flex-col gap-6">
      <StreakCelebration streak={stats.streak} />
      <PageHeader
        eyebrow="Overview"
        glow={PAGE_GLOW.overview}
        title={
          <>
            {greeting(profile.timezone, now)}, <em>{firstName}.</em>
          </>
        }
        subtitle={
          <>
            <span className="inline-flex items-center gap-1.5">
              <Flame
                size={14}
                aria-hidden="true"
                className={stats.streak > 0 ? "text-ember" : "text-ink-4"}
              />
              {stats.streak > 0 ? `${stats.streak}-day streak` : "Start a streak today"}
            </span>
            {queue.today.length > 0 && (
              <>
                <Dot />
                <span>{queue.today.length} to revise</span>
              </>
            )}
            {profile.college && (
              <>
                <Dot />
                <span>{profile.college.shortName ?? profile.college.name}</span>
              </>
            )}
          </>
        }
        actions={
          <>
            <AutoSync stale={needsSync(accounts)} />
            <NextProblemButton />
            <a
              href="/api/share-card?download=1"
              title="Download a 1200×630 card with your heatmap and numbers, for LinkedIn or WhatsApp"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <Share2 size={14} aria-hidden="true" /> Share card
            </a>
            {nextReview ? (
              <Link
                href="/dashboard/revision"
                className={buttonClasses({ variant: "signal", size: "sm" })}
              >
                <RotateCcw size={14} aria-hidden="true" /> Revise now <ButtonArrow />
              </Link>
            ) : mainSheet ? (
              <Link
                href={`/dashboard/sheets/${mainSheet.slug}`}
                className={buttonClasses({ variant: "signal", size: "sm" })}
              >
                Continue {mainSheet.name.replace(/'s.*$/, "")} <ButtonArrow />
              </Link>
            ) : null}
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
          <WeekStrip days={last7} />
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
                {(last7.reduce((n, d) => n + d.focusMs, 0) / 3_600_000).toFixed(1)}
                <small className="ml-0.5 text-[.5em] font-[500] text-ink-3">h</small>
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
              value: (focus / 3_600_000).toFixed(1),
              unit: "h",
              note: hasExtension
                ? `${focusPct}% of ${formatDuration(goalWeekMs)} goal`
                : "install the extension",
              spark: sessionStats.focusByDay.map((d) => d.activeMs),
              sparkColor: "var(--amber)",
              href: "/dashboard/sessions",
            },
          ]}
        />

        {/* What to do next: the next revision and picks from your sheets */}
        <Card
          spotlight
          glow={nextReview ? (overdueDays > 0 ? "var(--overdue)" : "var(--violet)") : undefined}
          className="col-span-12 flex flex-col md:col-span-6"
        >
          <CardHeader>
            <CardTitle icon={icon(RotateCcw)} tint="var(--violet)">
              Next revision
            </CardTitle>
            <CardLink href="/dashboard/revision" label="Open revision" />
          </CardHeader>
          {nextReview ? (
            <div className="flex flex-1 flex-col">
              <div className="surface-inset flex flex-1 flex-col rounded-[16px] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {nextReview.difficulty && <DifficultyTag difficulty={nextReview.difficulty} />}
                  <StatusBadge
                    status={overdueDays > 0 ? "overdue" : "revise"}
                    label={dueLabel(nextReview.state.dueAt, now, endOfToday)}
                    pulse={overdueDays > 7}
                  />
                </div>
                <Link
                  href={`/dashboard/problems/${nextReview.problemId}`}
                  className="text-20 leading-tight font-[600] tracking-[-0.02em] hover:underline"
                >
                  {nextReview.title}
                </Link>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <StrengthLadder
                    stage={nextReview.state.step + 1}
                    overdue={overdueDays > 0}
                    dueLabel={dueLabel(nextReview.state.dueAt, now, endOfToday)}
                  />
                  {queue.today.length > 1 && (
                    <span className="text-12 text-ink-3">+{queue.today.length - 1} more today</span>
                  )}
                </div>
              </div>
              <a
                href={reviewUrl(nextReview.url)}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "secondary", className: "mt-3.5 w-full" })}
              >
                <Play size={14} aria-hidden="true" /> Re-solve now <ButtonArrow />
              </a>
            </div>
          ) : (
            <EmptyState
              className="flex-1 py-4"
              mascot={learning.length === 0 ? "sleepy" : "accepted"}
              title={
                learning.length === 0 ? (
                  <>
                    Nothing to revise <em>yet.</em>
                  </>
                ) : (
                  <>
                    All caught <em>up.</em>
                  </>
                )
              }
            >
              {learning.length === 0
                ? "Solved problems are scheduled here: 1 → 3 → 7 → 16 → 35 → 90 days."
                : `${queue.upcoming[0] ?? 0} due tomorrow.`}
            </EmptyState>
          )}
        </Card>

        <Card spotlight className="col-span-12 flex flex-col md:col-span-6">
          <CardHeader>
            <CardTitle icon={icon(Sparkles)} tint="var(--signal-mark)">
              Solve next
            </CardTitle>
            <CardSub>
              {nextUp[0] ? `focus: ${topicLabel(nextUp[0].topic)}` : "from your sheets"}
            </CardSub>
          </CardHeader>
          {nextUp.length === 0 ? (
            <EmptyState
              className="py-4"
              icon={<Sparkles size={18} />}
              title={
                <>
                  Suggestions come <em>next.</em>
                </>
              }
            >
              Follow a sheet and solve a few problems; picks target your weakest topic.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {nextUp.map((p) => (
                <li key={p.problemId}>
                  <Link
                    href={`/dashboard/problems/${p.problemId}`}
                    className="surface-inset group/next flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:border-line-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-[600] group-hover/next:underline">
                        {p.title}
                      </span>
                      <span className="block truncate text-11 text-ink-3">
                        {topicLabel(p.topic)} · {p.reason}
                      </span>
                    </span>
                    {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
                    <ButtonArrow />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Activity, 26 weeks */}
        <Card className="col-span-12">
          <CardHeader>
            <CardTitle icon={icon(Grid3x3)} tint="var(--primary)">
              Activity
            </CardTitle>
            <CardSub>last 26 weeks · all platforms</CardSub>
          </CardHeader>
          <ActivityHeatmap days={days} />
        </Card>

        {/* Row 4 · mastery (radar beside its bars) + sheets */}
        <Card spotlight className="col-span-12 flex flex-col xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(Brain)} tint="var(--easy)">
              Topic mastery
            </CardTitle>
            <CardLink href="/dashboard/analytics#mastery" label="All topics" />
          </CardHeader>
          <div className="@container flex flex-1 items-center">
            <div className="grid w-full items-center gap-5 @lg:grid-cols-[220px_minmax(0,1fr)] @lg:gap-7">
              <div className="mx-auto">
                <TopicRadar topics={masteryTop} size={220} />
              </div>
              <MasteryBars topics={masteryTop.slice(0, 5)} showInputs={false} />
            </div>
          </div>
        </Card>

        <Card spotlight className="col-span-12 flex flex-col xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(mainSheet ? Gauge : ListChecks)} tint="var(--violet)">
              {mainSheet ? "Your sheets" : "By difficulty"}
            </CardTitle>
            <Link
              href="/dashboard/sheets"
              className={buttonClasses({ variant: "ghost", size: "sm", className: "h-8 px-3" })}
            >
              All sheets
            </Link>
          </CardHeader>
          {mainSheet ? (
            <>
              <Link href={`/dashboard/sheets/${mainSheet.slug}`} className="group/sheet">
                <HalfGauge
                  done={mainSheet.done}
                  total={mainSheet.total}
                  label={`of ${mainSheet.name}${mainSheet.eta ? ` · done by ${formatEta(mainSheet.eta)}` : ""}`}
                />
              </Link>
              {followed.length > 1 && (
                <ul className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                  {followed.slice(1).map((s) => (
                    <li key={s.id}>
                      <Link href={`/dashboard/sheets/${s.slug}`} className="group/s block">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-13">
                          <span className="truncate font-[550] group-hover/s:underline">
                            {s.name}
                          </span>
                          <span className="tnum shrink-0 font-mono text-11 text-ink-3">
                            {s.done}/{s.total}
                          </span>
                        </div>
                        <SegmentedProgress done={s.done} total={s.total} segments={24} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col justify-center">
              <span className="num mb-4 block text-[40px]">
                <NumberTicker value={stats.solved.total} />
                <small className="ml-1 text-[.5em] font-[500] text-ink-3">solved</small>
              </span>
              <SolvedSplit solved={stats.solved} />
              <Link
                href="/dashboard/sheets"
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                  className: "mt-5 self-start",
                })}
              >
                Pick a sheet <ButtonArrow />
              </Link>
            </div>
          )}
        </Card>

        {/* Row 5 · recent solves + focus this week */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(History)} tint="var(--success)">
              Recent solves
            </CardTitle>
            <CardSub>accepted</CardSub>
          </CardHeader>
          {recent.length === 0 ? (
            <EmptyState
              icon={<History size={18} />}
              title={
                <>
                  No solves <em>yet.</em>
                </>
              }
            >
              Your accepted problems show up here. Start with a sheet.
            </EmptyState>
          ) : (
            <ol className="relative ml-2 border-l border-line-2">
              {recent.slice(0, 6).map((r, i) => (
                <RecentRow key={r.id} solve={r} index={i} />
              ))}
            </ol>
          )}
        </Card>

        <Card className="col-span-12 flex flex-col xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(Timer)} tint="var(--signal-mark)">
              Focus this week
            </CardTitle>
            <CardLink href="/dashboard/sessions" label="All sessions" />
          </CardHeader>
          {hasExtension ? (
            <>
              <FocusWeek days={sessionStats.focusByDay} goalMin={profile.dailyGoalMin} />
              <div className="mt-4 flex flex-wrap gap-2 text-12">
                <Tag>{sessionStats.totalSessions} sessions</Tag>
                {answered > 0 && (
                  <Tag tone="success">{Math.round((sessionStats.soloRate ?? 0) * 100)}% solo</Tag>
                )}
                <Tag>goal {profile.dailyGoalMin}m/day</Tag>
              </div>
              {sessions.length > 0 && (
                <ul className="mt-4 border-t border-line pt-3">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 py-1.5 text-13"
                    >
                      <span className="truncate text-ink-2">{s.title}</span>
                      <span className="tnum shrink-0 font-mono text-11 text-ink-3">
                        {formatDuration(s.activeMs)} · <TimeAgo date={s.startedAt} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <EmptyState
              className="flex-1"
              icon={<Puzzle size={18} />}
              title={
                <>
                  Time every problem, <em>automatically.</em>
                </>
              }
              action={
                <Link
                  href="/extension/connect"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  <Puzzle size={14} aria-hidden="true" /> Set up the extension
                </Link>
              }
            >
              The extension times LeetCode and GFG problems and catches every verdict.
            </EmptyState>
          )}
        </Card>

        {/* Row 6 · platforms */}
        <Card className="col-span-12">
          <CardHeader>
            <CardTitle icon={icon(Plug)} tint="var(--info)">
              Platforms
            </CardTitle>
            <CardLink href="/dashboard/settings" label="Manage platforms" />
          </CardHeader>
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Plug size={18} />}
              title={
                <>
                  No platforms <em>yet.</em>
                </>
              }
              action={
                <Link
                  href="/onboarding/connect"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Connect a platform <ButtonArrow />
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {accounts.map((a) => {
                const series = contestSeries.find((s) => s.platform === a.platform);
                const url = PLATFORM_PROFILE_URL[a.platform]?.(a.handle);
                const mark = platformMarkId(a.platform);
                return (
                  <div
                    key={a.id}
                    className="surface-inset group flex flex-col gap-3 rounded-[16px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-14 font-[600]">
                          {mark && <PlatformMark site={mark} size={16} />}
                          {PLATFORM_LABEL[a.platform]}
                          {a.verified && <VerifiedChip />}
                        </p>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-12 text-ink-3 hover:text-ink hover:underline"
                        >
                          {a.handle}
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="num text-24">{a.snapshot?.rating ?? "—"}</p>
                        <p className="text-11 text-ink-3">{a.snapshot?.rankLabel ?? "unrated"}</p>
                      </div>
                    </div>
                    {series && series.points.length > 1 && (
                      <Sparkline
                        values={series.points.slice(-24).map((p) => p.rating)}
                        stroke={PLATFORM_STROKE[a.platform]}
                        width={280}
                        height={36}
                        className="w-full"
                      />
                    )}
                    {a.snapshot && <SolvedSplit solved={a.snapshot.solved} />}
                    <p className="text-11 text-ink-3">
                      {a.lastSyncedAt ? (
                        <>
                          Synced <TimeAgo date={a.lastSyncedAt} />
                        </>
                      ) : a.lastError ? (
                        <span className="text-bad">{a.lastError}</span>
                      ) : (
                        "Waiting for first sync"
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecentRow({ solve, index }: { solve: RecentSolve; index: number }) {
  const difficulty =
    solve.platform === "codeforces"
      ? ratingToDifficulty(solve.rating ?? undefined)
      : (solve.difficultyRaw?.toLowerCase() as "easy" | "medium" | "hard" | undefined);
  const mark = platformMarkId(solve.platform);
  const title = (
    <span className="block truncate bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat text-[13.5px] font-medium transition-[background-size] duration-[var(--dur-base)] group-hover/row:bg-[length:100%_1px]">
      {solve.title}
    </span>
  );
  return (
    <li
      className="group/row relative flex items-center gap-3 rounded-r-[12px] py-2.5 pr-2 pl-5 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2/70"
      style={{ animation: `rise-in 420ms var(--ease-out) ${index * 45}ms backwards` }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-[5px] size-[9px] -translate-y-1/2 rounded-full border-2 border-surface bg-success shadow-[0_0_8px_var(--success)]"
      />
      {mark && (
        <PlatformMark
          site={mark}
          size={15}
          className="text-ink-3 group-hover/row:text-[var(--brand)]"
        />
      )}
      <span className="min-w-0 flex-1">
        {solve.problemId ? (
          <Link href={`/dashboard/problems/${solve.problemId}`}>{title}</Link>
        ) : (
          <a href={solve.url} target="_blank" rel="noreferrer">
            {title}
          </a>
        )}
        <span className="tnum text-11 text-ink-3">
          {PLATFORM_LABEL[solve.platform]}
          {solve.rating ? ` · ${solve.rating}` : ""} · <TimeAgo date={solve.submittedAt} />
        </span>
      </span>
      {solve.accepted > 1 && <CounterChip n={solve.accepted} />}
      <StatusBadge status="solved" className="hidden sm:inline-flex" />
      {difficulty ? <DifficultyTag difficulty={difficulty} /> : <Tag mono>unrated</Tag>}
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

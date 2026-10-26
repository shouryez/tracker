import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  BadgeCheck,
  Brain,
  CalendarDays,
  CircleCheck,
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
  DifficultyTag,
  EmptyState,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { CardLink } from "@/components/card-link";
import { SolvedSplit, Sparkline } from "@/components/charts";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { StreakCelebration } from "@/components/dashboard/celebrate";
import { CountUp } from "@/components/dashboard/count-up";
import { HalfGauge, KpiCard, WeekCapsules } from "@/components/dashboard/widgets";
import { dueLabel, MasteryBars, reviewUrl, StepLadder } from "@/components/learning";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL, PLATFORM_STROKE } from "@/components/platform-meta";
import { formatEta, SegmentedProgress } from "@/components/progress";
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
} from "@/lib/data";
import { formatDuration } from "@/lib/format";
import {
  getLearning,
  getNextCandidates,
  getTopicTargets,
  masteryOf,
  revisionQueue,
} from "@/lib/learning";
import { GOALS } from "@/lib/profile-options";
import { getSheetSummaries } from "@/lib/sheets-data";
import { getExtensionTokens, getSessionStats, getSessions } from "@/lib/sessions-data";
import { getStreakFreezes } from "@/lib/social-data";
import { localDate, localDay, requestNow } from "@/lib/time";
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
  // The six topics you've solved most in, strongest first.
  const masteryShown = mastery
    .filter((m) => m.solved > 0)
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 6)
    .sort((a, b) => b.score - a.score);
  const followed = sheets.filter((s) => s.following);
  const hasExtension = tokens.length > 0;
  const answered =
    sessionStats.honest.solo + sessionStats.honest.hint + sessionStats.honest.solution;
  const stats = buildStats(accounts, new Date(now), frozenDays(freezes));
  const todayLocal = localDate(profile.timezone, now);
  const activeFreeze = freezes.find((f) => f.start <= todayLocal && f.end >= todayLocal);
  const firstName = profile.name?.split(" ")[0] ?? "there";
  const goal = GOALS.find((g) => g.value === profile.goal);

  // New problems solved this week vs the week before (first solve dates).
  const thisWeek = learning.filter((p) => p.state.firstSolvedAt > now - 7 * DAY_MS).length;
  const lastWeek = learning.filter(
    (p) => p.state.firstSolvedAt > now - 14 * DAY_MS && p.state.firstSolvedAt <= now - 7 * DAY_MS,
  ).length;
  const days = stats.days182;
  const spark14 = days.slice(-14).map((d) => d.count);
  // Mon–Sun of the current (UTC) week, matching the heatmap's UTC days.
  const todayUtc = new Date(now);
  const sinceMonday = (todayUtc.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, i) => {
    const offset = i - sinceMonday; // 0 = today
    const date = new Date(now + offset * DAY_MS).toISOString().slice(0, 10);
    return {
      label: ["M", "T", "W", "T", "F", "S", "S"][i]!,
      count: days.find((d) => d.date === date)?.count ?? 0,
      future: offset > 0,
    };
  });
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const goalWeekMs = profile.dailyGoalMin * 7 * 60_000;
  const focusPct = Math.min(
    100,
    Math.round((sessionStats.focusWeekMs / Math.max(1, goalWeekMs)) * 100),
  );
  const nextReview = queue.today[0];
  const mainSheet = followed[0];
  const focus = sessionStats.focusWeekMs;
  const clock = `${String(Math.floor(focus / 3_600_000)).padStart(2, "0")}:${String(Math.floor((focus % 3_600_000) / 60_000)).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-5">
      <StreakCelebration streak={stats.streak} />
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.05] font-[550] tracking-[-0.04em]">
            {greeting(profile.timezone, now)}, {firstName}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {stats.streak > 0 ? (
              <>
                <Flame size={14} className="-mt-0.5 mr-1 inline text-ember" aria-hidden="true" />
                {stats.streak}-day streak
              </>
            ) : (
              "Start a streak today"
            )}
            {queue.today.length > 0 && ` · ${queue.today.length} to revise`}
            {goal ? ` · ${goal.label}` : ""}
            {profile.college ? ` · ${profile.college.shortName ?? profile.college.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <AutoSync stale={needsSync(accounts)} />
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
        </div>
      </div>

      {accounts.length === 0 && <ConnectPrompt />}

      <div className="grid grid-cols-12 gap-3.5">
        {/* KPI row */}
        <KpiCard
          feature
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Solved"
          icon={icon(CircleCheck)}
          value={stats.solved.total}
          unit="problems"
          href="/dashboard/analytics"
          spark={spark14}
          foot={
            thisWeek > 0
              ? `↑ ${thisWeek} new this week${lastWeek ? ` · ${lastWeek} the week before` : ""}`
              : accounts
                  .filter((a) => a.snapshot)
                  .map((a) => `${PLATFORM_LABEL[a.platform]} ${a.snapshot!.solved.total}`)
                  .join(" · ") || "Connect a platform to start"
          }
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Streak"
          icon={icon(Flame, "text-ember")}
          value={stats.streak}
          unit={stats.streak === 1 ? "day" : "days"}
          href="/dashboard/settings#streak"
          foot={
            activeFreeze
              ? `Frozen until ${new Date(`${activeFreeze.end}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} · exam week`
              : `${stats.activeDays} active days this year`
          }
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="To revise"
          icon={icon(RotateCcw)}
          value={queue.today.length}
          unit="today"
          href="/dashboard/revision"
          foot={
            queue.backlog > 0
              ? `${queue.backlog} more waiting · ${queue.reviewedWeek} reviewed this week`
              : `${queue.reviewedWeek} reviewed this week`
          }
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Focus"
          icon={icon(Timer)}
          value={focus / 3_600_000}
          decimals={1}
          unit="h this week"
          href="/dashboard/sessions"
          foot={
            hasExtension
              ? `${focusPct}% of your ${formatDuration(goalWeekMs)} weekly goal`
              : "Install the extension to track time"
          }
        >
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <span
              className="block h-full origin-left animate-[grow-x_var(--dur-slower)_var(--ease-out)_both] rounded-full bg-primary"
              style={{ width: `${focusPct}%` }}
            />
          </span>
        </KpiCard>

        {/* This week · next review · sheets */}
        <Card spotlight className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(CalendarDays)}>This week</CardTitle>
            <CardSub>
              {weekTotal} submission{weekTotal === 1 ? "" : "s"} · UTC days
            </CardSub>
          </CardHeader>
          <WeekCapsules days={week} todayIndex={sinceMonday} />
        </Card>

        <Card spotlight className="col-span-12 flex flex-col sm:col-span-6 xl:col-span-3">
          <CardHeader>
            <CardTitle icon={icon(RotateCcw)}>Next revision</CardTitle>
            <CardLink href="/dashboard/revision" label="Open revision" />
          </CardHeader>
          {nextReview ? (
            <div className="flex flex-1 flex-col">
              <Link
                href={`/dashboard/problems/${nextReview.problemId}`}
                className="text-[20px] leading-tight font-[550] tracking-[-0.02em] text-primary hover:underline"
              >
                {nextReview.title}
              </Link>
              <span className="mt-2 flex items-center gap-2 font-mono text-[11.5px] text-ink-3">
                <StepLadder step={nextReview.state.step} />
                {dueLabel(nextReview.state.dueAt, now, endOfToday)}
              </span>
              {nextReview.difficulty && (
                <span className="mt-3 mb-5">
                  <DifficultyTag difficulty={nextReview.difficulty} />
                </span>
              )}
              <a
                href={reviewUrl(nextReview.url)}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "indigo", className: "mt-auto w-full" })}
              >
                <Play size={14} aria-hidden="true" /> Re-solve now
              </a>
            </div>
          ) : (
            <EmptyState
              className="flex-1 py-4"
              icon={<RotateCcw size={18} />}
              title={learning.length === 0 ? "Nothing to revise yet" : "All caught up"}
            >
              {learning.length === 0
                ? "Solved problems are scheduled here: 1 → 3 → 7 → 16 → 35 → 90 days."
                : `${queue.upcoming[0] ?? 0} due tomorrow.`}
            </EmptyState>
          )}
        </Card>

        <Card spotlight className="col-span-12 sm:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(ListChecks)}>Your sheets</CardTitle>
            <Link
              href="/dashboard/sheets"
              className={buttonClasses({
                variant: "outline",
                size: "sm",
                className: "h-[30px] px-3 text-[12.5px]",
              })}
            >
              All sheets
            </Link>
          </CardHeader>
          {followed.length === 0 ? (
            <EmptyState
              className="py-4"
              icon={<ListChecks size={18} />}
              title="Follow a sheet"
              action={
                <Link
                  href="/dashboard/sheets"
                  className={buttonClasses({ variant: "signal", size: "sm" })}
                >
                  Pick your sheets <ButtonArrow />
                </Link>
              }
            >
              Striver A2Z, NeetCode 150 and more, ticked automatically as you solve.
            </EmptyState>
          ) : (
            <ul>
              {followed.map((s) => (
                <li key={s.id} className="border-t border-dashed border-line-2 first:border-t-0">
                  <Link
                    href={`/dashboard/sheets/${s.slug}`}
                    className="group/sheet block py-3 first:pt-0"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2 text-[13.5px]">
                      <span className="truncate font-[550] group-hover/sheet:underline">
                        {s.name}
                      </span>
                      <span className="shrink-0 font-mono text-[11.5px] text-ink-3">
                        {s.done}/{s.total}
                        {s.eta ? ` · ${formatEta(s.eta)}` : ""}
                      </span>
                    </div>
                    <SegmentedProgress done={s.done} total={s.total} segments={24} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Activity · progress gauge */}
        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle icon={icon(Grid3x3)}>Activity</CardTitle>
            <CardSub>{stats.activeDays} active days · last 26 weeks · all platforms</CardSub>
          </CardHeader>
          <ActivityHeatmap days={days} />
        </Card>

        <Card spotlight className="col-span-12 flex flex-col xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Gauge)}>
              {mainSheet ? "Sheet progress" : "By difficulty"}
            </CardTitle>
            {mainSheet && (
              <CardLink
                href={`/dashboard/sheets/${mainSheet.slug}`}
                label={`Open ${mainSheet.name}`}
              />
            )}
          </CardHeader>
          {mainSheet && (
            <HalfGauge
              done={mainSheet.done}
              total={mainSheet.total}
              label={`of ${mainSheet.name}`}
            />
          )}
          <div className={cn(mainSheet ? "mt-4" : "flex flex-1 flex-col justify-center")}>
            {!mainSheet && (
              <span className="num mb-4 block text-[40px]">
                <CountUp value={stats.solved.total} />
                <small className="ml-1 text-[.42em] font-normal text-ink-3">solved</small>
              </span>
            )}
            <SolvedSplit solved={stats.solved} />
          </div>
        </Card>

        {/* Mastery · next up · focus timer */}
        <Card spotlight className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Brain)}>Topic mastery</CardTitle>
            <CardLink href="/dashboard/analytics#mastery" label="All topics" />
          </CardHeader>
          <MasteryBars topics={masteryShown} showInputs={false} />
        </Card>

        <Card spotlight className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Sparkles)}>Solve next</CardTitle>
            <CardSub>
              {nextUp[0] ? `focus: ${topicLabel(nextUp[0].topic)}` : "from your sheets"}
            </CardSub>
          </CardHeader>
          {nextUp.length === 0 ? (
            <EmptyState
              className="py-4"
              icon={<Sparkles size={18} />}
              title="Suggestions come next"
            >
              Follow a sheet and solve a few problems; picks target your weakest topic.
            </EmptyState>
          ) : (
            <ul>
              {nextUp.map((p) => (
                <li
                  key={p.problemId}
                  className="border-t border-dashed border-line-2 first:border-t-0"
                >
                  <Link
                    href={`/dashboard/problems/${p.problemId}`}
                    className="group/next flex items-center gap-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium group-hover/next:underline">
                        {p.title}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-ink-3">
                        {p.reason}
                      </span>
                    </span>
                    {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Dark timer card (Donezo "Time Tracker") */}
        <div className="relative col-span-12 flex flex-col overflow-hidden rounded-lg bg-[linear-gradient(160deg,#17173a,#0c0c16_55%,#101022)] p-[18px] text-white shadow-lg xl:col-span-4">
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:repeating-radial-gradient(circle_at_110%_120%,transparent_0_14px,rgba(110,123,255,.12)_14px_15px)]"
          />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 text-[14px] font-[550]">
              <Timer size={15} aria-hidden="true" /> Focus this week
            </span>
            <CardLink href="/dashboard/sessions" label="All sessions" tone="inverse" />
          </div>
          {hasExtension ? (
            <>
              <span className="relative mt-5 font-mono text-[46px] leading-none tracking-[-0.05em] tabular-nums">
                {clock}
                <small className="ml-2 font-sans text-[13px] tracking-normal text-white/55">
                  h : m
                </small>
              </span>
              <div className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-white/65">
                <span>{sessionStats.totalSessions} sessions</span>
                {answered > 0 && (
                  <span>{Math.round((sessionStats.soloRate ?? 0) * 100)}% solo</span>
                )}
                <span>goal {profile.dailyGoalMin}m/day</span>
              </div>
              {sessions.length > 0 && (
                <ul className="relative mt-auto border-t border-white/10 pt-3">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 py-1 text-[12.5px]"
                    >
                      <span className="truncate text-white/85">{s.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-white/55">
                        {formatDuration(s.activeMs)} · <TimeAgo date={s.startedAt} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="relative mt-auto pt-6">
              <p className="text-[15px] font-[550]">Time every problem automatically.</p>
              <p className="mt-1 text-[12.5px] text-white/60">
                The extension times LeetCode and GFG problems and catches every verdict.
              </p>
              <Link
                href="/extension/connect"
                className={buttonClasses({ variant: "signal", size: "sm", className: "mt-4" })}
              >
                <Puzzle size={14} aria-hidden="true" /> Set up the extension
              </Link>
            </div>
          )}
        </div>

        {/* Recent solves · platforms */}
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(History)}>Recent solves</CardTitle>
            <CardSub>accepted</CardSub>
          </CardHeader>
          {recent.length === 0 ? (
            <EmptyState icon={<History size={18} />} title="No solves yet">
              Your accepted problems show up here. Start with a sheet.
            </EmptyState>
          ) : (
            <ol className="relative ml-1 border-l border-line-2">
              {recent.map((r) => (
                <RecentRow key={r.id} solve={r} />
              ))}
            </ol>
          )}
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(Plug)}>Platforms</CardTitle>
            <CardLink href="/dashboard/settings" label="Manage platforms" />
          </CardHeader>
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Plug size={18} />}
              title="No platforms yet"
              action={
                <Link
                  href="/onboarding/connect"
                  className={buttonClasses({ variant: "signal", size: "sm" })}
                >
                  Connect a platform <ButtonArrow />
                </Link>
              }
            />
          ) : (
            accounts.map((a) => {
              const series = contestSeries.find((s) => s.platform === a.platform);
              const url = PLATFORM_PROFILE_URL[a.platform]?.(a.handle);
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-t border-dashed border-line-2 py-3.5 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-[550]">
                      {PLATFORM_LABEL[a.platform]}
                      {a.verified && (
                        <BadgeCheck size={14} className="text-ok" aria-label="verified" />
                      )}
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[12px] font-normal text-ink-3 hover:text-ink hover:underline"
                      >
                        {a.handle}
                      </a>
                    </p>
                    <p className="font-mono text-[11px] text-ink-3">
                      {a.lastSyncedAt ? (
                        <>
                          synced <TimeAgo date={a.lastSyncedAt} />
                        </>
                      ) : a.lastError ? (
                        <span className="text-bad">{a.lastError}</span>
                      ) : (
                        "waiting for first sync"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {series && series.points.length > 1 && (
                      <Sparkline
                        values={series.points.slice(-24).map((p) => p.rating)}
                        stroke={PLATFORM_STROKE[a.platform]}
                        className="hidden sm:block"
                      />
                    )}
                    <div className="text-right">
                      <p className="num text-[22px]">{a.snapshot?.rating ?? "—"}</p>
                      <p className="font-mono text-[10.5px] text-ink-3">
                        {a.snapshot?.rankLabel ?? "unrated"}
                      </p>
                    </div>
                  </div>
                  {a.snapshot && <SolvedSplit solved={a.snapshot.solved} className="col-span-2" />}
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

function RecentRow({ solve }: { solve: RecentSolve }) {
  const difficulty =
    solve.platform === "codeforces"
      ? ratingToDifficulty(solve.rating ?? undefined)
      : (solve.difficultyRaw?.toLowerCase() as "easy" | "medium" | "hard" | undefined);
  const title = (
    <span className="block truncate text-[13.5px] font-medium group-hover/row:underline">
      {solve.title}
    </span>
  );
  return (
    <li className="group/row relative flex items-center gap-3 py-2.5 pl-4">
      <span
        aria-hidden="true"
        className="absolute top-1/2 -left-[4.5px] size-2 -translate-y-1/2 rounded-full border-2 border-surface bg-ok"
      />
      <span className="min-w-0 flex-1">
        {solve.problemId ? (
          <Link href={`/dashboard/problems/${solve.problemId}`}>{title}</Link>
        ) : (
          <a href={solve.url} target="_blank" rel="noreferrer">
            {title}
          </a>
        )}
        <span className="font-mono text-[11px] text-ink-3">
          {PLATFORM_LABEL[solve.platform]}
          {solve.rating ? ` · ${solve.rating}` : ""} · <TimeAgo date={solve.submittedAt} />
          {solve.accepted > 1 ? ` · solved ×${solve.accepted}` : ""}
        </span>
      </span>
      <StatusBadge status="solved" className="hidden sm:inline-flex" />
      {difficulty ? <DifficultyTag difficulty={difficulty} /> : <Tag mono>unrated</Tag>}
    </li>
  );
}

function ConnectPrompt() {
  return (
    <Card spotlight className="flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-[550] tracking-[-0.02em]">
          <span className="text-ink-3">Your dashboard is empty.</span> Connect LeetCode, Codeforces
          or GFG.
        </p>
        <p className="text-[13px] text-ink-2">
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
    <div aria-hidden="true" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} lines={1} className="col-span-12 sm:col-span-6 xl:col-span-3" />
        ))}
        <SkeletonCard lines={5} className="col-span-12 h-[280px] xl:col-span-5" />
        <SkeletonCard lines={4} className="col-span-12 h-[280px] sm:col-span-6 xl:col-span-3" />
        <SkeletonCard lines={4} className="col-span-12 h-[280px] sm:col-span-6 xl:col-span-4" />
      </div>
    </div>
  );
}

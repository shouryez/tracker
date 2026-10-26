import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  BadgeCheck,
  Brain,
  CircleCheck,
  Flame,
  Grid3x3,
  History,
  ListChecks,
  Plug,
  Puzzle,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { ratingToDifficulty } from "@upsolve/adapters";
import { suggestNext, topicLabel, type Difficulty } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  PixelHeatmap,
  Stat,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { SolvedSplit, Sparkline } from "@/components/charts";
import { dueLabel, MasteryBars, reviewUrl, StepLadder } from "@/components/learning";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL, PLATFORM_STROKE } from "@/components/platform-meta";
import { formatEta, SegmentedProgress } from "@/components/progress";
import { FocusBars, SessionItem } from "@/components/sessions";
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
import {
  getLearning,
  getNextCandidates,
  getTopicTargets,
  masteryOf,
  revisionQueue,
} from "@/lib/learning";
import { GOALS } from "@/lib/profile-options";
import { getSheetSummaries } from "@/lib/sheets-data";
import {
  formatDuration,
  getExtensionTokens,
  getSessionStats,
  getSessions,
} from "@/lib/sessions-data";
import { localDay, requestNow } from "@/lib/time";
import { AutoSync } from "./_components/auto-sync";

export const metadata: Metadata = { title: "Overview" };

const icon = (Icon: typeof Flame, className?: string) => (
  <Icon size={13} strokeWidth={2} className={className} />
);

export default function DashboardPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
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
  ] = await Promise.all([
    getAccounts(user.id),
    getContestSeries(user.id),
    getRecentSolves(user.id),
    getSessionStats(user.id),
    getSessions(user.id, 8),
    getExtensionTokens(user.id),
    getLearning(user.id),
    getTopicTargets(),
    getNextCandidates(user.id),
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
  const followed = (await getSheetSummaries(user.id)).filter((s) => s.following);
  const hasExtension = tokens.length > 0;
  const answered =
    sessionStats.honest.solo + sessionStats.honest.hint + sessionStats.honest.solution;
  const stats = buildStats(accounts);
  const firstName = profile.name?.split(" ")[0] ?? "there";
  const goal = GOALS.find((g) => g.value === profile.goal);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
          Hey, {firstName}
          <span className="block text-ink-3">
            {profile.college?.shortName ?? profile.college?.name ?? "Your prep"}
            {profile.gradYear ? ` · Batch ${profile.gradYear}` : ""}
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <AutoSync stale={needsSync(accounts)} />
          <Meta label="Goal" value={goal?.label ?? "—"} />
          <Meta label="Daily goal" value={`${profile.dailyGoalMin} min`} />
          <Meta label="Platforms" value={String(accounts.length)} />
        </div>
      </div>

      {accounts.length === 0 && <ConnectPrompt />}

      <div className="grid grid-cols-12 gap-3.5">
        <Kpi
          feature
          title="Solved"
          icon={icon(CircleCheck)}
          value={stats.solved.total.toLocaleString("en-IN")}
          unit="problems"
          foot={
            accounts
              .filter((a) => a.snapshot)
              .map((a) => `${PLATFORM_LABEL[a.platform]} ${a.snapshot!.solved.total}`)
              .join(" · ") || "Connect a platform to start"
          }
        />
        <Kpi
          title="Streak"
          icon={icon(Flame, "text-ember")}
          value={String(stats.streak)}
          unit={stats.streak === 1 ? "day" : "days"}
          foot={`${stats.activeDays} active days this year`}
        />
        <Kpi
          title="Focus this week"
          icon={icon(Timer)}
          value={(sessionStats.focusWeekMs / 3_600_000).toFixed(1)}
          unit="h"
          foot={
            hasExtension
              ? `Goal ${((profile.dailyGoalMin * 7) / 60).toFixed(1)} h · tracked by the extension`
              : "Install the extension to track time"
          }
        />
        <Kpi
          title="Solo rate"
          icon={icon(Target)}
          value={
            sessionStats.soloRate === null ? "—" : String(Math.round(sessionStats.soloRate * 100))
          }
          unit={sessionStats.soloRate === null ? undefined : "%"}
          foot={
            answered > 0
              ? `${sessionStats.honest.solo} of ${answered} solved without help`
              : "Answer the prompt after Accepted"
          }
        />

        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle icon={icon(Grid3x3)}>Activity</CardTitle>
            <CardSub>last 26 weeks · all platforms</CardSub>
          </CardHeader>
          <PixelHeatmap
            levels={stats.heatmap26}
            weeks={26}
            label={`Activity heatmap: ${stats.activeDays} active days in the last year`}
          />
          <p className="mt-3 font-mono text-[11px] text-ink-3">
            Days with any submission. Dates in UTC.
          </p>
        </Card>

        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(CircleCheck)}>By difficulty</CardTitle>
            <CardSub>all platforms</CardSub>
          </CardHeader>
          <Stat value={stats.solved.total} unit="solved" className="mb-4" />
          <SolvedSplit solved={stats.solved} />
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(Timer)}>Focus</CardTitle>
            <CardSub>last 7 days · goal {profile.dailyGoalMin}m/day</CardSub>
          </CardHeader>
          <FocusBars stats={sessionStats} goalMin={profile.dailyGoalMin} />
        </Card>

        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(History)}>Sessions</CardTitle>
            {hasExtension ? (
              <Link
                href="/dashboard/sessions"
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                All sessions <ButtonArrow />
              </Link>
            ) : (
              <Tag mono>extension</Tag>
            )}
          </CardHeader>
          {!hasExtension ? (
            <InstallExtension />
          ) : sessions.length === 0 ? (
            <p className="text-[13px] text-ink-2">
              No sessions yet. Open any LeetCode or GFG problem; the timer starts on its own.
            </p>
          ) : (
            <ul>
              {sessions.map((s) => (
                <SessionItem key={s.id} s={s} />
              ))}
            </ul>
          )}
          {hasExtension && sessionStats.totalSessions > 0 && (
            <p className="mt-3 font-mono text-[11px] text-ink-3">
              {sessionStats.totalSessions} sessions · {sessionStats.solvedSessions} solved ·{" "}
              {formatDuration(sessionStats.focusWeekMs)} this week
            </p>
          )}
        </Card>

        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(Plug)}>Platforms</CardTitle>
            <Link
              href="/dashboard/settings"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              Manage <ButtonArrow />
            </Link>
          </CardHeader>
          {accounts.length === 0 ? (
            <p className="text-[13px] text-ink-2">No platforms connected yet.</p>
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

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(Brain)}>Topic mastery</CardTitle>
            <Link
              href="/dashboard/analytics"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              All topics <ButtonArrow />
            </Link>
          </CardHeader>
          <MasteryBars topics={masteryShown} showInputs={false} />
        </Card>

        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(History)}>Recent solves</CardTitle>
            <CardSub>accepted</CardSub>
          </CardHeader>
          {recent.length === 0 ? (
            <p className="text-[13px] text-ink-2">
              Nothing yet. Your accepted problems show up here.
            </p>
          ) : (
            <ul>
              {recent.map((r) => (
                <RecentRow key={r.id} solve={r} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(Sparkles)}>Solve next</CardTitle>
            <CardSub>from your sheets</CardSub>
          </CardHeader>
          {nextUp.length === 0 ? (
            <p className="text-[13px] text-ink-2">
              Follow a sheet and solve a few problems; suggestions target your weakest topic.
            </p>
          ) : (
            <ul>
              {nextUp.map((p) => (
                <li
                  key={p.problemId}
                  className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/problems/${p.problemId}`}
                      className="block truncate text-[13.5px] font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <span className="block truncate font-mono text-[11px] text-ink-3">
                      {p.reason} · {p.sheet}
                    </span>
                  </span>
                  {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
                </li>
              ))}
            </ul>
          )}
          {nextUp[0] && (
            <p className="mt-3 font-mono text-[11px] text-ink-3">
              Focus: {topicLabel(nextUp[0].topic)}
            </p>
          )}
        </Card>

        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(ListChecks)}>Sheets</CardTitle>
            <Link
              href="/dashboard/sheets"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              All sheets <ButtonArrow />
            </Link>
          </CardHeader>
          {followed.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[13.5px] text-ink-2">
                Follow Striver A2Z, NeetCode 150 or any other sheet and its progress shows here,
                ticked automatically as you solve.
              </p>
              <Link
                href="/dashboard/sheets"
                className={buttonClasses({ variant: "signal", size: "sm" })}
              >
                Pick your sheets <ButtonArrow />
              </Link>
            </div>
          ) : (
            followed.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/sheets/${s.slug}`}
                className="block border-t border-dashed border-line-2 py-3 first:border-t-0 first:pt-0 last:pb-0"
              >
                <div className="mb-2 flex items-baseline justify-between gap-2 text-[13.5px]">
                  <span className="font-[550]">{s.name}</span>
                  <span className="font-mono text-[11.5px] text-ink-3">
                    {s.done} / {s.total}
                    {s.eta ? ` · est. ${formatEta(s.eta)}` : ""}
                  </span>
                </div>
                <SegmentedProgress done={s.done} total={s.total} />
              </Link>
            ))
          )}
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(RotateCcw)}>Revision</CardTitle>
            <Link
              href="/dashboard/revision"
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              Open queue <ButtonArrow />
            </Link>
          </CardHeader>
          {learning.length === 0 ? (
            <p className="text-[13px] text-ink-2">
              Problems you solve are scheduled for review here, spaced 1 → 3 → 7 → 16 → 35 → 90
              days.
            </p>
          ) : queue.today.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">
              <span className="font-[550] text-ink">
                {queue.reviewedToday > 0 ? "Done for today." : "Nothing due today."}
              </span>{" "}
              {queue.backlog > 0
                ? `${queue.backlog} waiting for tomorrow.`
                : `${queue.upcoming[0] ?? 0} due tomorrow.`}
            </p>
          ) : (
            <>
              <Stat
                value={queue.today.length}
                unit={`due today${queue.backlog ? ` · ${queue.backlog} waiting` : ""}`}
                className="mb-3 text-[32px]"
              />
              <ul>
                {queue.today.slice(0, 3).map((p) => (
                  <li
                    key={p.problemId}
                    className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/problems/${p.problemId}`}
                        className="block truncate text-[13.5px] font-medium hover:underline"
                      >
                        {p.title}
                      </Link>
                      <span className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
                        <StepLadder step={p.state.step} />
                        {dueLabel(p.state.dueAt, now, endOfToday)}
                      </span>
                    </span>
                    <a
                      href={reviewUrl(p.url)}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      Re-solve
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[13px]">
      <span className="mb-0.5 block font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
        {label}
      </span>
      {value}
    </div>
  );
}

function Kpi({
  title,
  icon,
  value,
  unit,
  foot,
  feature,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  unit?: string;
  foot: string;
  feature?: boolean;
}) {
  return (
    <Card
      className={cn(
        "col-span-12 sm:col-span-6 xl:col-span-3",
        feature &&
          "border-transparent bg-[linear-gradient(155deg,color-mix(in_srgb,var(--primary)_92%,#000),var(--primary-2))] text-white",
      )}
    >
      <CardHeader className="mb-0">
        <CardTitle
          icon={icon}
          className={cn(
            feature && "[&>span]:border-transparent [&>span]:bg-white/15 [&>span]:text-white",
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <Stat
        value={value}
        unit={unit}
        className={cn("mt-1.5 mb-2.5", feature && "[&>small]:text-white/60")}
      />
      <p className={cn("truncate text-xs", feature ? "text-white/75" : "text-ink-3")}>{foot}</p>
    </Card>
  );
}

function RecentRow({ solve }: { solve: RecentSolve }) {
  const difficulty =
    solve.platform === "codeforces"
      ? ratingToDifficulty(solve.rating ?? undefined)
      : (solve.difficultyRaw?.toLowerCase() as "easy" | "medium" | "hard" | undefined);
  return (
    <li className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0">
      <span className="min-w-0 flex-1">
        {solve.problemId ? (
          <Link
            href={`/dashboard/problems/${solve.problemId}`}
            className="block truncate text-[13.5px] font-medium hover:underline"
          >
            {solve.title}
          </Link>
        ) : (
          <a
            href={solve.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[13.5px] font-medium hover:underline"
          >
            {solve.title}
          </a>
        )}
        <span className="font-mono text-[11px] text-ink-3">
          {PLATFORM_LABEL[solve.platform]}
          {solve.rating ? ` · ${solve.rating}` : ""} · <TimeAgo date={solve.submittedAt} />
          {solve.accepted > 1 ? ` · solved ×${solve.accepted}` : ""}
        </span>
      </span>
      {difficulty ? <DifficultyTag difficulty={difficulty} /> : <Tag mono>unrated</Tag>}
    </li>
  );
}

function InstallExtension() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-line-2 p-4">
      <span
        aria-hidden="true"
        className="hatch grid h-10 w-full place-items-center rounded-sm text-ink-3"
      >
        <Puzzle size={16} strokeWidth={1.75} />
      </span>
      <p className="text-[15px] font-[550] tracking-[-0.01em]">
        <span className="text-ink-3">Time every problem.</span> Automatically.
      </p>
      <p className="text-[13px] text-ink-2">
        The Upsolve extension times each LeetCode and GFG problem, catches every verdict and imports
        your full LeetCode history.
      </p>
      <Link href="/extension/connect" className={buttonClasses({ variant: "signal", size: "sm" })}>
        Set up the extension <ButtonArrow />
      </Link>
    </div>
  );
}

function ConnectPrompt() {
  return (
    <Card className="flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-[550] tracking-[-0.02em]">
          <span className="text-ink-3">Your dashboard is empty.</span> Connect LeetCode or
          Codeforces.
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
        <span className="h-8 w-56 animate-pulse rounded-sm bg-surface-3" />
        <span className="h-8 w-44 animate-pulse rounded-sm bg-surface-2" />
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className="col-span-12 h-[140px] animate-pulse rounded-lg bg-surface sm:col-span-6 xl:col-span-3"
          />
        ))}
        <span className="col-span-12 h-[220px] animate-pulse rounded-lg bg-surface xl:col-span-8" />
        <span className="col-span-12 h-[220px] animate-pulse rounded-lg bg-surface xl:col-span-4" />
      </div>
    </div>
  );
}

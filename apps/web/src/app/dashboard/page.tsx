import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  BadgeCheck,
  CircleCheck,
  Flame,
  Grid3x3,
  Layers,
  Plug,
  Sparkles,
  Tags,
  Trophy,
  History,
} from "lucide-react";
import { ratingToDifficulty } from "@upsolve/adapters";
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
import { SolvedSplit, Sparkline, TopicBar } from "@/components/charts";
import { PLATFORM_LABEL, PLATFORM_PROFILE_URL, PLATFORM_STROKE } from "@/components/platform-meta";
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
import { GOALS } from "@/lib/profile-options";
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

  const [accounts, contestSeries, recent] = await Promise.all([
    getAccounts(user.id),
    getContestSeries(user.id),
    getRecentSolves(user.id),
  ]);
  const stats = buildStats(accounts);
  const firstName = profile.name?.split(" ")[0] ?? "there";
  const goal = GOALS.find((g) => g.value === profile.goal);
  const totalContests = accounts.reduce((n, a) => n + (a.snapshot?.contests ?? 0), 0);

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
          title="Best rating"
          icon={icon(Trophy)}
          value={stats.bestRating ? String(stats.bestRating.rating) : "—"}
          foot={
            stats.bestRating
              ? `${PLATFORM_LABEL[stats.bestRating.platform]}${stats.bestRating.label ? ` · ${stats.bestRating.label}` : ""}`
              : "Take part in a rated contest"
          }
        />
        <Kpi
          title="Contests"
          icon={icon(Layers)}
          value={String(totalContests)}
          unit="rated"
          foot="Across your platforms"
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
            <CardSub>not yet de-duplicated</CardSub>
          </CardHeader>
          <Stat value={stats.solved.total} unit="solved" className="mb-4" />
          <SolvedSplit solved={stats.solved} />
          <p className="mt-4 text-[12.5px] text-ink-3">
            The same problem solved on two sites counts twice until the problem catalog lands.
          </p>
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
            <CardTitle icon={icon(Tags)}>Top topics</CardTitle>
            <CardSub>problems solved</CardSub>
          </CardHeader>
          {stats.topics.length === 0 ? (
            <p className="text-[13px] text-ink-2">Topics appear after your first sync.</p>
          ) : (
            stats.topics.map((t) => (
              <TopicBar key={t.slug} name={t.name} value={t.solved} max={stats.topics[0]!.solved} />
            ))
          )}
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
            <CardTitle icon={icon(Sparkles)}>Coming next</CardTitle>
          </CardHeader>
          <ul className="flex flex-col gap-3 text-[13px]">
            <Upcoming phase="Phase 2" title="Chrome extension">
              Automatic timer per problem, solo / hint / solution, full LeetCode history.
            </Upcoming>
            <Upcoming phase="Phase 3" title="Sheets">
              Striver A2Z, NeetCode 150 and Blind 75 tick themselves.
            </Upcoming>
            <Upcoming phase="Phase 4" title="Revision queue">
              Spaced repetition that checks you can still solve it.
            </Upcoming>
          </ul>
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
        <a
          href={solve.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-[13.5px] font-medium hover:underline"
        >
          {solve.title}
        </a>
        <span className="font-mono text-[11px] text-ink-3">
          {PLATFORM_LABEL[solve.platform]}
          {solve.rating ? ` · ${solve.rating}` : ""} · <TimeAgo date={solve.submittedAt} />
        </span>
      </span>
      {difficulty ? <DifficultyTag difficulty={difficulty} /> : <Tag mono>unrated</Tag>}
    </li>
  );
}

function Upcoming({
  phase,
  title,
  children,
}: {
  phase: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 border-t border-dashed border-line-2 pt-3 first:border-t-0 first:pt-0">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="text-ink-2">{children}</span>
      </span>
      <Tag mono>{phase}</Tag>
    </li>
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

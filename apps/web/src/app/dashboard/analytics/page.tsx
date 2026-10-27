import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Brain, Bug, CalendarCheck, Clock, Gauge, Info, Layers, Target, Timer } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, LinearProgress, SkeletonCard } from "@upsolve/ui";
import { TopicBar } from "@/components/charts";
import { TopicRadar } from "@/components/charts/insights";
import { NumberTicker } from "@/components/fx/number-ticker";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { RangeControl } from "@/components/range-control";
import { DifficultyTime, HourBars, VerdictMix } from "@/components/analytics-charts";
import { MasteryBars } from "@/components/learning";
import { HonestSplit } from "@/components/sessions";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getAnalytics, RANGES, type RangeKey } from "@/lib/analytics-data";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { formatDuration } from "@/lib/sessions-data";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Analytics" };

const RANGE_LABEL: Record<RangeKey, string> = {
  "7": "7 days",
  "30": "30 days",
  "90": "90 days",
  all: "All time",
};
const icon = (Icon: typeof Clock) => <Icon size={13} strokeWidth={2} />;

export default function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} lines={2} className="col-span-12 sm:col-span-6 xl:col-span-3" />
            ))}
            <SkeletonCard lines={5} className="col-span-12 h-[320px] xl:col-span-8" />
            <SkeletonCard lines={5} className="col-span-12 h-[320px] xl:col-span-4" />
          </div>
        }
      >
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/analytics">["searchParams"];
}) {
  const raw = (await searchParams).range;
  const range: RangeKey = typeof raw === "string" && raw in RANGES ? (raw as RangeKey) : "30";
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your analytics.</p>;

  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const [a, learning, targets] = await Promise.all([
    getAnalytics(user.id, range, tz),
    getLearning(user.id),
    getTopicTargets(),
  ]);
  const now = requestNow();
  const mastery = masteryOf(learning, targets, now);
  const shownMastery = mastery.filter((m) => m.solved > 0);
  const weakestTopic =
    shownMastery.length > 1
      ? shownMastery.reduce((x, y) => (y.score < x.score ? y : x)).topic
      : null;
  const days =
    a.rangeDays ??
    (a.firstActivityAt ? Math.max(1, Math.ceil((now - a.firstActivityAt) / 86_400_000)) : 1);
  const firstTryRate = a.firstTry.total
    ? Math.round((a.firstTry.ac / a.firstTry.total) * 100)
    : null;
  const topicMax = a.byTopic[0]?.activeMs ?? 1;

  const sortedMastery = [...shownMastery].sort((x, y) => y.score - x.score);
  const radarTopics = [...shownMastery].sort((x, y) => y.solved - x.solved).slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow={`Analytics · ${RANGE_LABEL[range].toLowerCase()}`}
        glow={PAGE_GLOW.analytics}
        title={
          <>
            Analytics, <em>how you practise.</em>
          </>
        }
        subtitle={`Times in ${tz}`}
        actions={
          <RangeControl
            value={range}
            items={(Object.keys(RANGES) as RangeKey[]).map((k) => ({
              value: k,
              label: k === "all" ? "All" : `${k}d`,
              href: k === "30" ? "/dashboard/analytics" : `/dashboard/analytics?range=${k}`,
            }))}
          />
        }
      />

      <div key={range} className="stagger-in grid grid-cols-12 gap-3.5">
        <Kpi
          icon={icon(CalendarCheck)}
          tint="var(--easy)"
          title="Active days"
          value={a.activeDays}
          unit={`of ${days}`}
          progress={a.activeDays / days}
          foot={`${Math.round((a.activeDays / days) * 100)}% of days · ${
            a.activeDays ? (a.solved / a.activeDays).toFixed(1) : "0"
          } solved per active day`}
        />
        <Kpi
          icon={icon(Layers)}
          tint="var(--violet)"
          title="Solved"
          value={a.solved}
          unit="problems"
          foot={`${RANGE_LABEL[range].toLowerCase()} · all platforms`}
        />
        <Kpi
          icon={icon(Target)}
          tint="var(--success)"
          title="First-try AC"
          value={firstTryRate ?? 0}
          unit={firstTryRate === null ? "no data" : "%"}
          progress={firstTryRate === null ? undefined : firstTryRate / 100}
          foot={
            a.firstTry.total
              ? `${a.firstTry.ac} of ${a.firstTry.total} new problems accepted on the first submit`
              : "Needs the extension (or Codeforces) to see every verdict"
          }
        />
        <Kpi
          icon={icon(Timer)}
          tint="var(--signal-mark)"
          title="Focus"
          value={Math.round((a.focusMs / 3_600_000) * 10) / 10}
          decimals={1}
          unit="hours"
          foot={`timed by the extension · ${formatDuration(a.focusMs / days)} a day`}
        />

        <Card spotlight className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Clock)} tint="var(--violet)">
              Best hours
            </CardTitle>
            <CardSub>accepted, by hour</CardSub>
          </CardHeader>
          <HourBars byHour={a.byHour} />
        </Card>

        <Card spotlight className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Gauge)} tint="var(--success)">
              Verdict mix
            </CardTitle>
            <CardSub>all submissions</CardSub>
          </CardHeader>
          <VerdictMix verdicts={a.verdicts} />
          <p className="mt-4 text-11 text-ink-3">
            LeetCode and GFG sync only report Accepted; the extension sees the rest.
          </p>
        </Card>

        <Card spotlight className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Target)} tint="var(--medium)">
              How you solved
            </CardTitle>
            <CardSub>after Accepted</CardSub>
          </CardHeader>
          <HonestSplit {...a.independence} />
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader>
            <CardTitle icon={icon(Timer)} tint="var(--medium)">
              Time per difficulty
            </CardTitle>
            <CardSub>timed sessions</CardSub>
          </CardHeader>
          <DifficultyTime rows={a.byDifficulty} />
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader>
            <CardTitle icon={icon(Layers)} tint="var(--violet)">
              Time per topic
            </CardTitle>
            <CardSub>minutes · a session counts for each topic</CardSub>
          </CardHeader>
          {a.byTopic.length === 0 ? (
            <p className="text-13 text-ink-2">No timed sessions in this range.</p>
          ) : (
            a.byTopic
              .slice(0, 8)
              .map((t, i) => (
                <TopicBar
                  key={t.topic}
                  name={t.label}
                  value={Math.round(t.activeMs / 60_000)}
                  max={Math.round(topicMax / 60_000)}
                  top={i === 0}
                />
              ))
          )}
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle icon={icon(Bug)} tint="var(--hard)">
              Mistakes you tagged
            </CardTitle>
            <CardSub>after a wrong answer</CardSub>
          </CardHeader>
          {a.mistakes.length === 0 ? (
            <p className="text-13 text-ink-3">
              None in this range. When the extension asks what went wrong, your answers collect
              here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {a.mistakes.map((m, i) => (
                <span
                  key={m.tag}
                  className="inline-flex items-center gap-2 rounded-full border border-v-wa/30 bg-v-wa/10 px-3 py-1"
                  style={{ fontSize: `${Math.max(12, 16 - i * 0.6)}px` }}
                >
                  {m.tag}
                  <span className="tnum rounded-full bg-v-wa/20 px-1.5 font-mono text-11 text-v-wa">
                    ×{m.n}
                  </span>
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card id="mastery" className="col-span-12 scroll-mt-24">
          <CardHeader>
            <CardTitle icon={icon(Brain)} tint="var(--easy)">
              Topic mastery
            </CardTitle>
            <CardSub>all time · decays without practice</CardSub>
          </CardHeader>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <TopicRadar topics={radarTopics} size={280} />
            <div className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
              <MasteryBars
                topics={sortedMastery.slice(0, Math.ceil(sortedMastery.length / 2))}
                weakestTopic={weakestTopic}
              />
              <MasteryBars
                topics={sortedMastery.slice(Math.ceil(sortedMastery.length / 2))}
                weakestTopic={weakestTopic}
              />
            </div>
          </div>
          <details className="group/how mt-5 rounded-[14px] border border-line bg-surface-inset px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-13 font-[600] [&::-webkit-details-marker]:hidden">
              <Info size={14} aria-hidden="true" className="text-ink-3" /> How is mastery
              calculated?
              <span className="ml-auto text-ink-3 transition-transform group-open/how:rotate-45">
                +
              </span>
            </summary>
            <div className="mt-3 grid gap-3 text-12 text-ink-2 sm:grid-cols-4">
              {[
                ["Difficulty", "easy 1 · medium 2 · hard 3"],
                ["How you solved", "solo 1 · hint 0.6 · solution 0.3 · unknown 0.7"],
                ["Recency", "halves every 45 days, never below a quarter"],
                ["Speed", "faster timed solves count a little more"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[10px] border border-line bg-surface-2 p-3">
                  <p className="label-mono">{k}</p>
                  <p className="mt-1">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-12 text-ink-3">
              100 means half the weighted problems for that topic across the curated sheets.
            </p>
          </details>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  icon,
  tint,
  title,
  value,
  decimals,
  unit,
  foot,
  progress,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  value: number;
  decimals?: number;
  unit?: string;
  foot: string;
  progress?: number;
}) {
  return (
    <Card
      spotlight
      glow={tint}
      className="col-span-12 flex flex-col gap-2.5 sm:col-span-6 xl:col-span-3"
    >
      <CardTitle icon={icon} tint={tint}>
        {title}
      </CardTitle>
      <p className="num text-[40px]">
        <NumberTicker value={value} decimals={decimals} />
        {unit && (
          <small className="ml-1.5 font-display text-[.45em] font-normal tracking-normal text-ink-3 italic">
            {unit}
          </small>
        )}
      </p>
      {progress !== undefined && (
        <LinearProgress value={progress} max={1} height={5} color={tint} aria-label={title} />
      )}
      <p className="text-12 text-ink-3">{foot}</p>
    </Card>
  );
}

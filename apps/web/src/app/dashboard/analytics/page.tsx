import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Brain, Bug, CalendarCheck, Clock, Gauge, Layers, Target, Timer } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, Stat, Tag, cn } from "@upsolve/ui";
import { TopicBar } from "@/components/charts";
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
    <div className="flex flex-col gap-5">
      <Suspense fallback={<div className="h-[600px] skeleton rounded-lg" />}>
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
  const peakHour = a.byHour.indexOf(Math.max(...a.byHour));
  const acTotal = a.byHour.reduce((n, x) => n + x, 0);
  const topicMax = a.byTopic[0]?.activeMs ?? 1;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
          Analytics<span className="block text-ink-3">How you practise</span>
        </h1>
        <nav
          aria-label="Time range"
          className="flex rounded-full border border-line bg-surface p-1"
        >
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={k === "30" ? "/dashboard/analytics" : `/dashboard/analytics?range=${k}`}
              aria-current={k === range ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-[var(--dur-base)]",
                k === range ? "bg-ink text-bg" : "text-ink-2 hover:text-ink",
              )}
            >
              {RANGE_LABEL[k]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-12 gap-3.5">
        <Kpi
          icon={icon(CalendarCheck)}
          title="Active days"
          value={String(a.activeDays)}
          unit={`of ${days}`}
          foot={`${Math.round((a.activeDays / days) * 100)}% of days · ${
            a.activeDays ? (a.solved / a.activeDays).toFixed(1) : "0"
          } solved per active day`}
        />
        <Kpi
          icon={icon(Layers)}
          title="Solved"
          value={String(a.solved)}
          unit="problems"
          foot={`${RANGE_LABEL[range].toLowerCase()} · all platforms`}
        />
        <Kpi
          icon={icon(Target)}
          title="First-try AC"
          value={firstTryRate === null ? "—" : String(firstTryRate)}
          unit={firstTryRate === null ? undefined : "%"}
          foot={
            a.firstTry.total
              ? `${a.firstTry.ac} of ${a.firstTry.total} new problems accepted on the first submit`
              : "Needs the extension (or Codeforces) to see every verdict"
          }
        />
        <Kpi
          icon={icon(Timer)}
          title="Focus"
          value={formatDuration(a.focusMs)}
          foot={`timed by the extension · ${formatDuration(a.focusMs / days)} a day`}
        />

        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle icon={icon(Clock)}>Best hours</CardTitle>
            <CardSub>
              {acTotal
                ? `most accepted around ${String(peakHour).padStart(2, "0")}:00`
                : "accepted, by hour"}
            </CardSub>
          </CardHeader>
          {acTotal === 0 ? (
            <p className="text-[13px] text-ink-2">No accepted submissions in this range.</p>
          ) : (
            <HourBars byHour={a.byHour} />
          )}
          <p className="mt-3 font-mono text-[11px] text-ink-3">Your timezone: {tz}</p>
        </Card>

        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Gauge)}>Verdict mix</CardTitle>
            <CardSub>all submissions</CardSub>
          </CardHeader>
          <VerdictMix verdicts={a.verdicts} />
          <p className="mt-3 font-mono text-[11px] text-ink-3">
            LeetCode and GFG sync only report Accepted; the extension sees the rest.
          </p>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Timer)}>Time per difficulty</CardTitle>
            <CardSub>timed sessions</CardSub>
          </CardHeader>
          <DifficultyTime rows={a.byDifficulty} />
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Layers)}>Time per topic</CardTitle>
            <CardSub>a session counts for each of its topics</CardSub>
          </CardHeader>
          {a.byTopic.length === 0 ? (
            <p className="text-[13px] text-ink-2">No timed sessions in this range.</p>
          ) : (
            a.byTopic
              .slice(0, 8)
              .map((t) => (
                <TopicBar
                  key={t.topic}
                  name={t.label}
                  value={Math.round(t.activeMs / 60_000)}
                  max={Math.round(topicMax / 60_000)}
                />
              ))
          )}
          {a.byTopic.length > 0 && <p className="mt-2 font-mono text-[11px] text-ink-3">minutes</p>}
        </Card>

        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(Target)}>How you solved</CardTitle>
            <CardSub>your answers after Accepted</CardSub>
          </CardHeader>
          <HonestSplit {...a.independence} />
          <div className="mt-5 border-t border-dashed border-line-2 pt-3">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-[550]">
              <Bug size={13} aria-hidden="true" /> Mistakes you tagged
            </p>
            {a.mistakes.length === 0 ? (
              <p className="text-[12.5px] text-ink-3">None in this range.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {a.mistakes.map((m) => (
                  <Tag key={m.tag} tone="wa" mono>
                    {m.tag} ×{m.n}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card id="mastery" className="col-span-12 scroll-mt-6">
          <CardHeader>
            <CardTitle icon={icon(Brain)}>Topic mastery</CardTitle>
            <CardSub>all time · decays without practice</CardSub>
          </CardHeader>
          <div className="grid gap-x-8 md:grid-cols-2">
            <MasteryBars
              topics={shownMastery.slice(0, Math.ceil(shownMastery.length / 2))}
              weakestTopic={weakestTopic}
            />
            <MasteryBars
              topics={shownMastery.slice(Math.ceil(shownMastery.length / 2))}
              weakestTopic={weakestTopic}
            />
          </div>
          <p className="mt-4 border-t border-dashed border-line-2 pt-3 text-[12.5px] leading-relaxed text-ink-3">
            Each solve earns points: easy 1, medium 2, hard 3, times how you solved it (solo 1, hint
            0.6, solution 0.3, unknown 0.7), how recently (halves every 45 days, never below a
            quarter) and speed when timed. 100 means half the weighted problems for that topic
            across the curated sheets.
          </p>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  icon,
  title,
  value,
  unit,
  foot,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  unit?: string;
  foot: string;
}) {
  return (
    <Card className="col-span-12 sm:col-span-6 xl:col-span-3">
      <CardHeader className="mb-0">
        <CardTitle icon={icon}>{title}</CardTitle>
      </CardHeader>
      <Stat value={value} unit={unit} className="mt-1.5 mb-2.5" />
      <p className="text-xs text-ink-3">{foot}</p>
    </Card>
  );
}

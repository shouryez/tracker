import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brain, Clock, Info } from "lucide-react";
import {
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  SkeletonCard,
  buttonClasses,
} from "@upsolve/ui";
import { TopicRadar } from "@/components/charts/insights";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { RangeControl } from "@/components/range-control";
import { MasteryBars } from "@/components/learning";
import { KpiStrip, SkillMap } from "@/components/dashboard/lamplight";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getAnalytics, RANGES, type RangeKey } from "@/lib/analytics-data";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { requestNow } from "@/lib/time";
import { INSIGHTS_TABS, SectionTabs } from "@/components/orbit/section-tabs";

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
  const subs = a.verdicts.reduce((n, v) => n + v.n, 0);
  const honestTotal = a.independence.solo + a.independence.hint + a.independence.solution;
  const timed = a.byDifficulty.filter((r) => r.medianMs && r.solved);
  const overallMedian = timed.length
    ? timed.reduce((n, r) => n + r.medianMs! * r.solved, 0) /
      timed.reduce((n, r) => n + r.solved, 0)
    : null;
  // Verdicts, first-try rate and solve times come from the extension; without it they're
  // empty or misleading (platform sync only reports Accepted), so those cards hide.
  const extData = a.firstTry.total > 0 || timed.length > 0;
  const dayMax = Math.max(3, ...a.daily.map((d) => d.ac + d.wa + d.other));
  const hourMax = Math.max(1, ...a.byHour);
  const bestHour = a.byHour.some((n) => n > 0)
    ? a.byHour.reduce((best, _n, h, arr) => {
        const pair = (x: number) => (arr[x] ?? 0) + (arr[(x + 1) % 24] ?? 0);
        return pair(h) > pair(best) ? h : best;
      }, 0)
    : null;
  const SPAN_MS = 60 * 60_000;
  const VC = 2 * Math.PI * 46;
  const ac = a.verdicts.find((v) => v.verdict === "AC")?.n ?? 0;
  const wa = a.verdicts.find((v) => v.verdict === "WA")?.n ?? 0;
  const tle = a.verdicts
    .filter((v) => ["TLE", "MLE", "RE"].includes(v.verdict))
    .reduce((n, v) => n + v.n, 0);
  const other = Math.max(0, subs - ac - wa - tle);
  let rot = -90;
  const vmix = [
    { label: "Accepted", n: ac, color: "var(--signal)" },
    { label: "Wrong answer", n: wa, color: "var(--rose)" },
    { label: "TLE / runtime", n: tle, color: "var(--amber)" },
    { label: "Other", n: other, color: "var(--line-3)" },
  ]
    .filter((v) => v.n > 0)
    .map((v) => {
      const frac = subs ? v.n / subs : 0;
      const out = { ...v, frac, rot };
      rot += frac * 360;
      return out;
    });

  const sortedMastery = [...shownMastery].sort((x, y) => y.score - x.score);
  const radarTopics = [...shownMastery].sort((x, y) => y.solved - x.solved).slice(0, 8);

  return (
    <>
      <SectionTabs tabs={INSIGHTS_TABS} />
      <PageHeader
        eyebrow={`Analytics · ${RANGE_LABEL[range].toLowerCase()}`}
        glow={PAGE_GLOW.analytics}
        title={
          <>
            Analytics <em>· {RANGE_LABEL[range].toLowerCase()}</em>
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
        <KpiStrip
          className="col-span-12 xl:grid-cols-none"
          items={[
            { label: "Solved", value: a.solved, note: RANGE_LABEL[range].toLowerCase() },
            {
              label: "Submissions",
              value: subs,
              note: a.solved ? `${(subs / Math.max(1, a.solved)).toFixed(1)} per problem` : "—",
            },
            ...(extData
              ? [
                  {
                    label: "First-try accepted",
                    value: firstTryRate ?? "—",
                    unit: firstTryRate === null ? undefined : "%",
                    note: a.firstTry.total
                      ? `${a.firstTry.ac} of ${a.firstTry.total} new problems`
                      : "needs the extension",
                  },
                ]
              : []),
            {
              label: "Solved without help",
              value: honestTotal ? Math.round((a.independence.solo / honestTotal) * 100) : "—",
              unit: honestTotal ? "%" : undefined,
              note: honestTotal
                ? `${a.independence.hint + a.independence.solution} used hints or solutions`
                : "answer after each Accepted",
            },
            ...(extData
              ? [
                  {
                    label: "Median time",
                    value: overallMedian ? Math.round(overallMedian / 60_000) : "—",
                    unit: overallMedian ? "min" : undefined,
                    note: "timed solves",
                  },
                ]
              : []),
            {
              label: "Active days",
              value: a.activeDays,
              unit: `/${days}`,
              note: `${Math.round((a.activeDays / days) * 100)}% of days`,
            },
          ]}
        />

        <Card className="col-span-12 p-[22px]">
          <CardHeader>
            <CardTitle>Submissions per day</CardTitle>
            <span className="flex gap-3 text-12 text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-[2px] bg-signal" /> accepted
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-[2px] bg-[var(--rose)]" /> wrong
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-[2px] bg-line-3" /> other
              </span>
            </span>
          </CardHeader>
          <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
            <div className="flex h-40 flex-col justify-between text-right font-mono text-11 text-ink-3">
              <span>{dayMax}</span>
              <span>{Math.round(dayMax / 2)}</span>
              <span>0</span>
            </div>
            <div className="flex h-40 items-end gap-1 border-b border-line-2 bg-[linear-gradient(var(--line)_1px,transparent_1px)] bg-[length:100%_50%]">
              {a.daily.map((d, i) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.ac} accepted, ${d.wa} wrong, ${d.other} other`}
                  className="flex h-full flex-1 origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] flex-col-reverse gap-0.5"
                  style={{ animationDelay: `${i * 15}ms` }}
                >
                  {d.ac > 0 && (
                    <span
                      className="rounded-[2px] bg-signal"
                      style={{ height: `${(d.ac / dayMax) * 100}%` }}
                    />
                  )}
                  {d.wa > 0 && (
                    <span
                      className="rounded-[2px] bg-[var(--rose)]"
                      style={{ height: `${(d.wa / dayMax) * 100}%` }}
                    />
                  )}
                  {d.other > 0 && (
                    <span
                      className="rounded-[2px] bg-line-3"
                      style={{ height: `${(d.other / dayMax) * 100}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between pl-8 font-mono text-11 text-ink-3">
            {[0, 7, 14, 21, 29].map((i) => (
              <span key={i}>
                {i === 29
                  ? "Today"
                  : new Date(`${a.daily[i]!.date}T12:00:00Z`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}
              </span>
            ))}
          </div>
          <p className="mt-2 text-12 text-ink-3">
            Last 30 days. LeetCode and GFG sync only report Accepted; the extension sees the rest.
          </p>
        </Card>

        <Card className="lamp col-span-12 p-[22px]">
          <CardHeader>
            <CardTitle>Skill map</CardTitle>
            <CardSub>size = solved · fill = mastery · lines = what unlocks what</CardSub>
          </CardHeader>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <SkillMap topics={mastery} weakest={weakestTopic} />
            </div>
          </div>
        </Card>

        {extData ? (
          <>
            <Card className="col-span-12 md:col-span-6 xl:col-span-4">
              <CardHeader>
                <CardTitle>Verdicts</CardTitle>
                <CardSub className="font-mono">{subs} submissions</CardSub>
              </CardHeader>
              <div className="flex items-center gap-5">
                <svg
                  viewBox="0 0 120 120"
                  width="128"
                  height="128"
                  role="img"
                  aria-label={vmix.map((v) => `${v.label} ${v.n}`).join(", ")}
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="var(--surface-4)"
                    strokeWidth="12"
                  />
                  {vmix.map((v) => (
                    <circle
                      key={v.label}
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke={v.color}
                      strokeWidth="12"
                      strokeDasharray={`${(v.frac * VC).toFixed(1)} ${VC.toFixed(1)}`}
                      transform={`rotate(${v.rot.toFixed(1)} 60 60)`}
                    />
                  ))}
                  <text
                    x="60"
                    y="65"
                    textAnchor="middle"
                    fontSize="22"
                    fontWeight="600"
                    fill="var(--ink)"
                  >
                    {subs ? Math.round(((vmix[0]?.n ?? 0) / subs) * 100) : 0}%
                  </text>
                </svg>
                <ul className="flex flex-col gap-2.5 text-13">
                  {vmix.map((v) => (
                    <li key={v.label} className="flex items-center gap-2">
                      <i className="size-2 rounded-[2px]" style={{ background: v.color }} />
                      {v.label} <span className="font-mono text-ink-3">{v.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="col-span-12 md:col-span-6 xl:col-span-4">
              <CardHeader>
                <CardTitle>Time to solve</CardTitle>
                <CardSub>median and middle half</CardSub>
              </CardHeader>
              <div className="flex flex-col gap-4 pt-1.5">
                {(["easy", "medium", "hard"] as const).map((d) => {
                  const row = a.byDifficulty.find((r) => r.difficulty === d);
                  const sp = a.spread[d];
                  const pos = (ms: number) => `${Math.min(100, (ms / SPAN_MS) * 100).toFixed(1)}%`;
                  return (
                    <div
                      key={d}
                      className="grid grid-cols-[72px_minmax(0,1fr)_48px] items-center gap-3"
                    >
                      <DifficultyTag difficulty={d} />
                      <div className="relative h-[18px]">
                        <span className="absolute inset-x-0 top-2 h-0.5 rounded-full bg-surface-4" />
                        {sp && (
                          <span
                            className="absolute top-1 h-2.5 rounded-full"
                            style={{
                              left: pos(sp.p25),
                              width: `calc(${pos(sp.p75)} - ${pos(sp.p25)})`,
                              background: `color-mix(in srgb, var(--${d}) 25%, transparent)`,
                            }}
                          />
                        )}
                        {row?.medianMs ? (
                          <span
                            className="absolute top-0 -ml-[1.5px] h-[18px] w-[3px] rounded-full bg-ink"
                            style={{ left: pos(row.medianMs) }}
                          />
                        ) : null}
                      </div>
                      <span className="tnum text-right font-mono text-13">
                        {row?.medianMs ? `${Math.round(row.medianMs / 60_000)}m` : "—"}
                      </span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[72px_minmax(0,1fr)_48px] gap-3">
                  <span />
                  <div className="flex justify-between font-mono text-11 text-ink-3">
                    <span>0</span>
                    <span>15</span>
                    <span>30</span>
                    <span>45</span>
                    <span>60 min</span>
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="col-span-12 flex flex-col items-start justify-center gap-3 xl:col-span-8">
            <CardHeader className="mb-0">
              <CardTitle>Verdicts and solve times</CardTitle>
            </CardHeader>
            <p className="max-w-[560px] text-14 text-ink-2">
              Install the extension to see your wrong answers, first-try rate and how long each
              problem takes. Platform sync only reports Accepted, so these stay hidden until then.
            </p>
            <Link
              href="/extension/connect"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Get the extension
            </Link>
          </Card>
        )}

        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle>When you get accepted</CardTitle>
            <CardSub>
              {bestHour !== null
                ? `best: ${String(bestHour).padStart(2, "0")}:00–${String((bestHour + 2) % 24).padStart(2, "0")}:00`
                : "by hour"}
            </CardSub>
          </CardHeader>
          <div className="flex h-[110px] items-end gap-[3px] border-b border-line-2">
            {a.byHour.map((n, h) => (
              <span
                key={h}
                title={`${String(h).padStart(2, "0")}:00 · ${n} accepted`}
                className="flex-1 rounded-[3px_3px_1px_1px]"
                style={{
                  height: n ? `${(n / hourMax) * 100}%` : "2px",
                  background:
                    n >= hourMax * 0.8
                      ? "var(--signal)"
                      : n
                        ? "color-mix(in srgb, var(--signal) 45%, transparent)"
                        : "var(--surface-4)",
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-11 text-ink-3">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Mistakes you tagged</CardTitle>
            <CardSub>after a wrong answer</CardSub>
          </CardHeader>
          {a.mistakes.length === 0 ? (
            <p className="text-13 text-ink-3">
              None in this range. When the extension asks what went wrong, your answers collect
              here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {a.mistakes.map((m) => (
                <span
                  key={m.tag}
                  className="inline-flex items-center gap-2 rounded-full bg-hard-soft px-3 py-1 text-13"
                >
                  {m.tag.replace(/-/g, " ")}
                  <span className="tnum font-mono text-11 text-hard">×{m.n}</span>
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

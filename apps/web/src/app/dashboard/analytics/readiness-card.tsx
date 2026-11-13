import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { frozenDays } from "@upsolve/core";
import { Card, CardHeader, CardSub, CardTitle, cn } from "@upsolve/ui";
import { NumberTicker } from "@/components/fx/number-ticker";
import { getAnalytics } from "@/lib/analytics-data";
import { buildStats, getAccounts } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf, reviewHistory } from "@/lib/learning";
import { readiness } from "@/lib/readiness";
import { getStreakFreezes } from "@/lib/social-data";

const DAY = 86_400_000;

const HREF: Record<string, string> = {
  coverage: "/dashboard/analytics#mastery",
  revision: "/dashboard/revision",
  consistency: "/dashboard",
  speed: "/dashboard/sessions",
  mix: "/dashboard/sheets",
};

/**
 * Interview readiness (FEATURES-PLAN F2): the dial, the five parts with their arithmetic on
 * show, and the two cheapest next points. Streams in its own Suspense block on Insights.
 */
export async function ReadinessCard({
  userId,
  tz,
  now,
}: {
  userId: string;
  tz: string;
  now: number;
}) {
  const [accounts, freezes, learning, targets, a] = await Promise.all([
    getAccounts(userId),
    getStreakFreezes(userId),
    getLearning(userId),
    getTopicTargets(),
    getAnalytics(userId, "30", tz),
  ]);
  const stats = buildStats(accounts, new Date(now), frozenDays(freezes));
  const active = learning.filter((p) => !p.state.retired);
  const recent = reviewHistory(learning, 400).filter((h) => h.at > now - 30 * DAY);
  const last50 = [...learning]
    .sort((x, y) => y.state.firstSolvedAt - x.state.firstSolvedAt)
    .slice(0, 50);
  const r = readiness({
    mastery: masteryOf(learning, targets, now),
    streak: stats.streak,
    activeDays28: stats.heatmap52.slice(-28).filter((l) => l > 0).length,
    ladder: {
      active: active.length,
      overdue: active.filter((p) => now - p.state.dueAt >= DAY).length,
    },
    passRate30: recent.length
      ? recent.filter((h) => h.result === "pass").length / recent.length
      : null,
    medianMediumMs: a.byDifficulty.find((d) => d.difficulty === "medium")?.medianMs ?? null,
    last50: {
      medium: last50.filter((p) => p.difficulty === "medium").length,
      hard: last50.filter((p) => p.difficulty === "hard").length,
      total: last50.length,
    },
  });
  const R = 54;
  const C = 2 * Math.PI * R;
  const tone = r.score >= 70 ? "var(--signal)" : r.score >= 40 ? "var(--amber)" : "var(--rose)";

  return (
    <Card className="col-span-12 xl:col-span-8">
      <CardHeader>
        <CardTitle icon={<Gauge size={15} />} tint="var(--signal-mark)">
          Interview readiness
        </CardTitle>
        <CardSub>every point accounted for</CardSub>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-8">
        <div className="relative shrink-0" role="img" aria-label={`Readiness ${r.score} of 100`}>
          <svg viewBox="0 0 140 140" width="150" height="150" className="overflow-visible">
            {Array.from({ length: 40 }, (_, k) => {
              const ang = (k / 40) * Math.PI * 2 - Math.PI / 2;
              return (
                <line
                  key={k}
                  x1={70 + Math.cos(ang) * 66}
                  y1={70 + Math.sin(ang) * 66}
                  x2={70 + Math.cos(ang) * 70}
                  y2={70 + Math.sin(ang) * 70}
                  stroke="var(--ink)"
                  strokeOpacity={k / 40 <= r.score / 100 ? 0.4 : 0.1}
                  strokeWidth="1.6"
                />
              );
            })}
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line-2)" strokeWidth="9" />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={tone}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${(C * r.score) / 100} ${C}`}
              transform="rotate(-90 70 70)"
              className="animate-[readiness-arc_1100ms_var(--ease-out)_backwards]"
              style={{
                filter: `drop-shadow(0 0 8px color-mix(in srgb, ${tone} 60%, transparent))`,
              }}
            />
          </svg>
          <span className="absolute inset-0 grid place-content-center text-center">
            <span className="num font-display text-[40px] leading-none">
              <NumberTicker value={r.score} />
            </span>
            <span className="text-11 text-ink-3">/ 100</span>
          </span>
        </div>
        <div className="min-w-[260px] flex-1">
          <ul className="flex flex-col gap-2.5">
            {r.parts.map((p) => (
              <li key={p.id}>
                <Link href={HREF[p.id] ?? "/dashboard"} className="group/part block">
                  <span className="flex items-baseline justify-between gap-3 text-13">
                    <span className="font-[600] group-hover/part:underline">{p.label}</span>
                    <span className="tnum text-ink-2">
                      {p.pts} <span className="text-ink-4">/ {p.max}</span>
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
                    <span
                      className="block h-full origin-left animate-[grow-x_800ms_var(--ease-out)_backwards] rounded-full bg-[var(--signal-mark)]"
                      style={{ width: `${(p.pts / p.max) * 100}%` }}
                    />
                  </span>
                  <span className="mt-0.5 block text-11 text-ink-3">{p.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {r.next.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-12 font-[600] text-ink-3">Cheapest next points:</span>
          {r.next.map((n) => (
            <span
              key={n.move}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-12 font-[600] text-signal-text",
              )}
            >
              {n.move} <span className="tnum">+{n.gain}</span>
              <ArrowUpRight size={12} aria-hidden="true" />
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

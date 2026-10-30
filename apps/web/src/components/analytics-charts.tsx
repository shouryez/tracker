import type { CSSProperties } from "react";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { ProgressRing, cn } from "@upsolve/ui";
import { ChartEmpty, LegendItem } from "@/components/charts/kit";
import type { Analytics } from "@/lib/analytics-data";
import { formatDuration } from "@/lib/sessions-data";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
const isNight = (h: number) => h < 6 || h >= 22;

/**
 * Best hours as a 24-hour radial clock: one polar bar per hour (accepted submissions),
 * night hours shaded, the peak hour in lime and named underneath.
 */
export function HourBars({ byHour }: { byHour: number[] }) {
  const max = Math.max(1, ...byHour);
  const total = byHour.reduce((a, b) => a + b, 0);
  const peak = byHour.indexOf(Math.max(...byHour));
  const size = 220;
  const c = size / 2;
  const inner = 38;
  const outer = c - 16;
  const PeakIcon = isNight(peak) ? Moon : peak < 12 ? Sunrise : peak < 18 ? Sun : Sunset;

  const clock = (ghost: boolean) => (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[240px]"
      aria-hidden="true"
    >
      {/* night shading 22:00–06:00 */}
      <path
        d={arcPath(c, inner, outer, 22, 30)}
        fill="color-mix(in srgb, var(--violet) 7%, transparent)"
      />
      {[0.33, 0.66, 1].map((r) => (
        <circle
          key={r}
          cx={c}
          cy={c}
          r={inner + (outer - inner) * r}
          fill="none"
          stroke="var(--chart-grid)"
        />
      ))}
      {Array.from({ length: 24 }, (_, h) => {
        const v = ghost
          ? [1, 0, 0, 0, 0, 0, 1, 2, 3, 2, 4, 5, 3, 2, 4, 6, 5, 4, 6, 8, 7, 5, 3, 2][h]! / 8
          : byHour[h]! / max;
        if (v === 0) return null;
        const len = (outer - inner) * Math.max(0.08, v);
        return (
          <path
            key={h}
            d={arcPath(c, inner, inner + len, h + 0.12, h + 0.88)}
            fill={ghost ? "var(--ink-3)" : h === peak ? "var(--signal-mark)" : "var(--violet)"}
            opacity={ghost ? 1 : h === peak ? 1 : 0.45 + v * 0.55}
            className="origin-center animate-[fade-in-pop_700ms_var(--ease-out)_backwards]"
            style={
              { animationDelay: `${h * 25}ms`, transformOrigin: `${c}px ${c}px` } as CSSProperties
            }
          >
            {!ghost && <title>{`${hh(h)} · ${byHour[h]} accepted`}</title>}
          </path>
        );
      })}
      {[0, 6, 12, 18].map((h) => {
        const a = ((h / 24) * 360 - 90) * (Math.PI / 180);
        return (
          <text
            key={h}
            x={c + Math.cos(a) * (outer + 9)}
            y={c + Math.sin(a) * (outer + 9) + 3}
            textAnchor="middle"
            fontSize="9.5"
            fill="var(--ink-3)"
            fontFamily="var(--font-geist-mono), monospace"
          >
            {String(h).padStart(2, "0")}
          </text>
        );
      })}
    </svg>
  );

  if (total === 0) {
    return (
      <ChartEmpty
        ghost={clock(true)}
        title={
          <>
            No accepted <em>yet</em> in this range.
          </>
        }
      >
        Your best hours appear once you have a few ACs.
      </ChartEmpty>
    );
  }
  return (
    <div>
      <div role="img" aria-label={`Accepted submissions by hour; most around ${hh(peak)}`}>
        {clock(false)}
      </div>
      <p className="mt-3 flex items-center justify-center gap-2 text-13 text-ink-2">
        <PeakIcon size={15} aria-hidden="true" className="text-signal-text" />
        Most accepted around <span className="tnum font-[600] text-ink">{hh(peak)}</span>
      </p>
    </div>
  );
}

/** Annular sector from hour a to hour b (fractions allowed), radii r0 → r1. */
function arcPath(c: number, r0: number, r1: number, a: number, b: number) {
  const ang = (h: number) => ((h / 24) * 360 - 90) * (Math.PI / 180);
  const p = (r: number, h: number) =>
    `${(c + Math.cos(ang(h)) * r).toFixed(2)},${(c + Math.sin(ang(h)) * r).toFixed(2)}`;
  const large = b - a > 12 ? 1 : 0;
  return `M${p(r0, a)} L${p(r1, a)} A${r1},${r1} 0 ${large} 1 ${p(r1, b)} L${p(r0, b)} A${r0},${r0} 0 ${large} 0 ${p(r0, a)} Z`;
}

const VERDICT: Record<string, { label: string; color: string }> = {
  AC: { label: "Accepted", color: "var(--v-ac)" },
  WA: { label: "Wrong answer", color: "var(--v-wa)" },
  TLE: { label: "Time limit", color: "var(--v-tle)" },
  MLE: { label: "Memory limit", color: "var(--v-err)" },
  RE: { label: "Runtime error", color: "var(--v-err)" },
  CE: { label: "Compile error", color: "var(--v-ce)" },
  OTHER: { label: "Other", color: "var(--ink-4)" },
};

/** Verdict mix as a donut with the AC rate in the centre, plus a labelled legend. */
export function VerdictMix({ verdicts }: { verdicts: Analytics["verdicts"] }) {
  const total = verdicts.reduce((n, v) => n + v.n, 0);
  if (total === 0) {
    return (
      <ChartEmpty
        ghost={
          <div className="flex items-center gap-6 py-2">
            <ProgressRing
              total={10}
              size={132}
              stroke={16}
              glow={false}
              segments={[
                { label: "a", value: 6, color: "var(--ink-3)" },
                { label: "b", value: 3, color: "var(--ink-3)" },
              ]}
            />
          </div>
        }
        title={
          <>
            No submissions <em>yet</em>.
          </>
        }
      >
        Verdicts from synced platforms and the extension show up here.
      </ChartEmpty>
    );
  }
  const ac = verdicts.find((v) => v.verdict === "AC")?.n ?? 0;
  const sorted = [...verdicts].sort((a, b) => b.n - a.n);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <ProgressRing
        total={total}
        size={140}
        stroke={16}
        glow={false}
        segments={sorted.map((v) => ({
          label: VERDICT[v.verdict]?.label ?? v.verdict,
          value: v.n,
          color: VERDICT[v.verdict]?.color ?? "var(--ink-3)",
        }))}
      >
        <span className="num text-30">{Math.round((ac / total) * 100)}%</span>
        <span className="text-11 text-ink-3">accepted</span>
      </ProgressRing>
      <ul className="flex min-w-[180px] flex-1 flex-col gap-1.5">
        {sorted.map((v) => (
          <LegendItem
            key={v.verdict}
            color={VERDICT[v.verdict]?.color ?? "var(--ink-3)"}
            label={VERDICT[v.verdict]?.label ?? v.verdict}
            value={
              <>
                {v.n} <span className="text-ink-3">· {Math.round((v.n / total) * 100)}%</span>
              </>
            }
          />
        ))}
      </ul>
    </div>
  );
}

const DIFF_COLOR = {
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
  unrated: "var(--ink-3)",
} as const;

/** Focus time per difficulty: sorted gradient bars, value at the end, median solve time below. */
export function DifficultyTime({ rows }: { rows: Analytics["byDifficulty"] }) {
  if (rows.length === 0) {
    return (
      <ChartEmpty
        ghost={
          <div className="flex flex-col gap-3 py-2">
            {[80, 55, 30].map((w) => (
              <span key={w} className="h-2.5 rounded-full bg-ink-3" style={{ width: `${w}%` }} />
            ))}
          </div>
        }
        title={
          <>
            No timed sessions <em>yet</em>.
          </>
        }
      >
        The extension times every problem you open.
      </ChartEmpty>
    );
  }
  const sorted = [...rows].sort((a, b) => b.activeMs - a.activeMs);
  const max = Math.max(1, ...rows.map((r) => r.activeMs));
  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((r, i) => {
        const color = DIFF_COLOR[r.difficulty];
        return (
          <li key={r.difficulty}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className={cn("text-13 capitalize", i === 0 ? "font-[600]" : "text-ink-2")}>
                {r.difficulty}
              </span>
              <span className="tnum font-mono text-12">{formatDuration(r.activeMs)}</span>
            </div>
            <span className="relative block h-2.5 rounded-full bg-surface-3">
              <span
                className="absolute inset-y-0 left-0 origin-left animate-[grow-x_900ms_var(--ease-out)_backwards] rounded-full"
                style={{
                  width: `${Math.max(2, (r.activeMs / max) * 100)}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${color} 50%, transparent), ${color})`,
                  boxShadow: i === 0 ? `0 0 14px -3px ${color}` : undefined,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            </span>
            <span className="mt-1 block text-11 text-ink-3">
              {r.solved} solved{r.medianMs ? ` · median solve ${formatDuration(r.medianMs)}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// DsaKaro

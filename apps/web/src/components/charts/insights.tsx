import { Eye, Lightbulb, User } from "lucide-react";
import { ProgressRing, cn } from "@upsolve/ui";
import { ChartEmpty, LegendItem, MarkTip } from "@/components/charts/kit";
import { formatDuration } from "@/lib/format";

/**
 * Radar of up to 8 topics (0–100 mastery). Concentric guide rings, a violet filled shape
 * that scales in from the centre, a dot per topic.
 */
export function TopicRadar({
  topics,
  size = 260,
}: {
  topics: { label: string; score: number }[];
  size?: number;
}) {
  const t = topics.slice(0, 8);
  const c = size / 2;
  const r = c - 46;
  const n = Math.max(t.length, 3);
  const pt = (i: number, v: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const shape = (vals: number[]) =>
    vals
      .map((v, i) =>
        pt(i, v)
          .map((x) => x.toFixed(1))
          .join(","),
      )
      .join(" ");

  const svg = (vals: number[], ghost: boolean) => (
    <svg
      viewBox={`-56 -8 ${size + 112} ${size + 16}`}
      className="mx-auto w-full max-w-[360px]"
      aria-hidden="true"
    >
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon
          key={g}
          points={shape(Array.from({ length: n }, () => g))}
          fill="none"
          stroke="var(--chart-grid)"
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--chart-grid)" />;
      })}
      <polygon
        points={shape(vals)}
        fill={ghost ? "var(--ink-3)" : "color-mix(in srgb, var(--violet) 28%, transparent)"}
        stroke={ghost ? "var(--ink-3)" : "var(--violet)"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="animate-[fade-in-pop_900ms_var(--ease-out)_both]"
        style={{
          transformOrigin: `${c}px ${c}px`,
          filter: ghost
            ? undefined
            : "drop-shadow(0 0 10px color-mix(in srgb, var(--violet) 50%, transparent))",
        }}
      />
      {!ghost &&
        vals.map((v, i) => {
          const [x, y] = pt(i, v);
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--violet)" />;
        })}
      {!ghost &&
        t.map((topic, i) => {
          const [x, y] = pt(i, 1.2);
          return (
            <text
              key={topic.label}
              x={x}
              y={y + 3}
              textAnchor={Math.abs(x - c) < 8 ? "middle" : x > c ? "start" : "end"}
              fontSize="10.5"
              fill="var(--ink-2)"
            >
              {topic.label.length > 14 ? `${topic.label.slice(0, 13)}…` : topic.label}
            </text>
          );
        })}
    </svg>
  );

  if (t.length < 3) {
    return (
      <ChartEmpty
        ghost={svg([0.6, 0.8, 0.4, 0.7, 0.5, 0.9], true)}
        title={
          <>
            Your shape appears <em>soon</em>.
          </>
        }
      >
        Solve problems in three or more topics to see your strengths at a glance.
      </ChartEmpty>
    );
  }
  return (
    <div
      role="img"
      aria-label={`Topic mastery: ${t.map((x) => `${x.label} ${x.score}`).join(", ")}`}
    >
      {svg(
        t.map((x) => Math.max(0.04, x.score / 100)),
        false,
      )}
    </div>
  );
}

/**
 * Focus this week: a daily-goal ring for today's minutes, plus a 7-day minutes strip with the
 * goal as a dashed line. Days are oldest first, the last one is today.
 */
export function FocusWeek({
  days,
  goalMin,
  inverse,
}: {
  days: { day: string; activeMs: number }[];
  goalMin: number;
  inverse?: boolean;
}) {
  const today = days.at(-1)?.activeMs ?? 0;
  const todayMin = Math.round(today / 60_000);
  const goalMs = goalMin * 60_000;
  const max = Math.max(goalMs, ...days.map((d) => d.activeMs), 1);
  return (
    <div className="flex items-center gap-5">
      <ProgressRing
        total={goalMin}
        size={104}
        stroke={10}
        segments={[
          { label: "Today", value: Math.min(todayMin, goalMin), color: "var(--signal-mark)" },
        ]}
        aria-label={`${todayMin} of ${goalMin} minutes today`}
      >
        <span className="num text-24">{todayMin}</span>
        <span className={cn("text-[10.5px]", inverse ? "text-white/60" : "text-ink-3")}>
          of {goalMin} min
        </span>
      </ProgressRing>
      <div className="relative flex h-[84px] flex-1 items-end gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 border-t border-dashed",
            inverse ? "border-white/30" : "border-ink-3/50",
          )}
          style={{ bottom: `${(goalMs / max) * 100}%` }}
        />
        {days.map((d, i) => {
          const last = i === days.length - 1;
          const label = new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-IN", {
            weekday: "short",
            timeZone: "UTC",
          });
          return (
            <div
              key={d.day}
              tabIndex={0}
              aria-label={`${label}: ${formatDuration(d.activeMs)}`}
              className="group/mark relative flex h-full flex-1 flex-col justify-end outline-none"
            >
              <MarkTip title={label} value={formatDuration(d.activeMs)} />
              <span
                className={cn(
                  "w-full origin-bottom animate-[grow-y_700ms_var(--ease-out)_both] rounded-[5px]",
                  d.activeMs === 0
                    ? inverse
                      ? "h-1 bg-white/15"
                      : "h-1 bg-surface-3"
                    : last
                      ? "bg-signal-mark shadow-[0_0_14px_-4px_var(--signal-mark)]"
                      : inverse
                        ? "bg-white/55"
                        : "bg-violet/70",
                )}
                style={
                  d.activeMs > 0
                    ? {
                        height: `${Math.max(6, (d.activeMs / max) * 100)}%`,
                        animationDelay: `${i * 50}ms`,
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HOW = [
  { key: "solo", label: "Solo", color: "var(--success)", Icon: User },
  { key: "hint", label: "With a hint", color: "var(--medium)", Icon: Lightbulb },
  { key: "solution", label: "Saw the solution", color: "var(--violet)", Icon: Eye },
] as const;

/** How solved sessions were solved: a 3-segment ring with the solo rate in the middle. */
export function HowSolved({
  honest,
}: {
  honest: { solo: number; hint: number; solution: number };
}) {
  const total = honest.solo + honest.hint + honest.solution;
  if (total === 0) {
    return (
      <ChartEmpty
        ghost={
          <div className="flex items-center gap-5 py-1">
            <ProgressRing
              total={3}
              size={112}
              stroke={12}
              glow={false}
              segments={[{ label: "x", value: 2, color: "var(--ink-3)" }]}
            />
          </div>
        }
        title={
          <>
            Answer one <em>prompt</em>.
          </>
        }
      >
        After you solve, the extension asks: solo, hint or solution?
      </ChartEmpty>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-5">
      <ProgressRing
        total={total}
        size={112}
        stroke={12}
        segments={HOW.map((h) => ({ label: h.label, value: honest[h.key], color: h.color }))}
      >
        <span className="num text-24">{Math.round((honest.solo / total) * 100)}%</span>
        <span className="text-[10.5px] text-ink-3">solo</span>
      </ProgressRing>
      <ul className="flex min-w-[160px] flex-1 flex-col gap-2">
        {HOW.map((h) => (
          <LegendItem
            key={h.key}
            color={h.color}
            label={
              <span className="inline-flex items-center gap-1.5">
                <h.Icon size={13} aria-hidden="true" /> {h.label}
              </span>
            }
            value={honest[h.key]}
          />
        ))}
      </ul>
    </div>
  );
}

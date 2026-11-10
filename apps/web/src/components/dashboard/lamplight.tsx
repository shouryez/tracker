import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@upsolve/ui";

const DAY = 86_400_000;
const C = 120; // centre of the 240×240 dial

function polar(frac: number, r: number) {
  const a = frac * 2 * Math.PI - Math.PI / 2;
  return { x: +(C + r * Math.cos(a)).toFixed(1), y: +(C + r * Math.sin(a)).toFixed(1) };
}

function hm(ms: number) {
  const m = Math.round(ms / 60_000);
  const h = Math.floor(m / 60);
  return h
    ? { big: `${h}h ${String(m % 60).padStart(2, "0")}`, small: "m" }
    : { big: `${m}`, small: "min" };
}

/**
 * The study day as a clock face: it starts at your day-reset hour at the top and runs once
 * round. Focus sessions are amber arcs, accepted solves are lime dots, the hand is now.
 */
export function DayDial({
  dayStart,
  now,
  resetHour,
  sessions,
  solves,
  focusMs,
  goalMs,
  solvedToday,
  className,
}: {
  dayStart: number;
  now: number;
  resetHour: number;
  /** Ended focus sessions today: start and how long they ran (focus + away). */
  sessions: { start: number; ms: number }[];
  /** Accepted submission times today. */
  solves: number[];
  focusMs: number;
  goalMs: number;
  solvedToday: number;
  className?: string;
}) {
  const r = 88;
  const circ = 2 * Math.PI * r;
  const frac = (t: number) => Math.min(1, Math.max(0, (t - dayStart) / DAY));
  const arcs = sessions
    .filter((s) => s.ms > 30_000)
    .map((s) => {
      const a = frac(s.start);
      const len = Math.max(0.004, frac(s.start + s.ms) - a);
      return { rot: a * 360 - 90, da: `${(len * circ).toFixed(1)} ${circ.toFixed(1)}` };
    });
  // A short hand on the rim, so it never crosses the numbers in the middle.
  const hand = polar(frac(now), 80);
  const handIn = polar(frac(now), 60);
  const label = (h: number) => String((resetHour + h) % 24).padStart(2, "0");
  const t = hm(focusMs);
  const goalLeft = Math.max(0, goalMs - focusMs);
  return (
    <figure className={cn("relative m-0 grid place-items-center", className)}>
      <svg
        viewBox="0 0 240 240"
        className="h-auto w-full max-w-[240px]"
        role="img"
        aria-label={`Study day so far: ${t.big}${t.small} of focus in ${sessions.length} sessions, ${solvedToday} accepted`}
      >
        <circle cx={C} cy={C} r={104} fill="none" stroke="var(--line)" />
        {Array.from({ length: 48 }, (_, i) => {
          const major = i % 12 === 0;
          const a = polar(i / 48, 104);
          const b = polar(i / 48, major ? 96 : i % 2 === 0 ? 99 : 101);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--line-3)"
              strokeWidth={major ? 1.6 : 1}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={C} cy={C} r={r} fill="none" stroke="var(--surface-4)" strokeWidth={10} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={C}
            cy={C}
            r={r}
            fill="none"
            stroke="var(--amber)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={a.da}
            transform={`rotate(${a.rot.toFixed(2)} ${C} ${C})`}
          />
        ))}
        <circle cx={C} cy={C} r={70} fill="none" stroke="var(--line)" strokeDasharray="2 4" />
        {solves.map((s, i) => {
          const p = polar(frac(s), 70);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="var(--signal)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          );
        })}
        <line
          x1={handIn.x}
          y1={handIn.y}
          x2={hand.x}
          y2={hand.y}
          stroke="var(--ink)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.7}
        />
        <circle cx={hand.x} cy={hand.y} r={3.5} fill="var(--ink)" />
        {[
          [0, 120, 22, "middle"],
          [6, 226, 124, "end"],
          [12, 120, 232, "middle"],
          [18, 14, 124, "start"],
        ].map(([h, x, y, anchor]) => (
          <text
            key={h as number}
            x={x as number}
            y={y as number}
            textAnchor={anchor as "middle" | "end" | "start"}
            fontSize={10}
            fill="var(--ink-3)"
            fontFamily="var(--font-mono)"
          >
            {label(h as number)}:00
          </text>
        ))}
      </svg>
      <figcaption className="pointer-events-none absolute inset-0 grid place-content-center gap-0.5 text-center">
        <span className="label-mono">Focused today</span>
        <span className="num text-[28px]">
          {t.big}
          <small className="ml-0.5 text-[15px] font-[500] text-ink-3">{t.small}</small>
        </span>
        <span className="text-12 text-ink-3">
          {goalLeft > 0 ? `${Math.ceil(goalLeft / 60_000)} min to goal` : "goal met"} ·{" "}
          {solvedToday} accepted
        </span>
      </figcaption>
    </figure>
  );
}

/** Seven study days: an amber focus bar per day and a lime dot per accepted problem. */
export function WeekStrip({
  days,
}: {
  days: { label: string; focusMs: number; solved: number; today: boolean }[];
}) {
  const max = Math.max(1, ...days.map((d) => d.focusMs));
  return (
    <div className="grid h-[176px] grid-cols-7 items-end gap-2.5 pt-2">
      {days.map((d, i) => (
        <div key={i} className="flex h-full flex-col items-center justify-end gap-2">
          <div className="flex flex-col items-center gap-[3px]" aria-hidden="true">
            {Array.from({ length: Math.min(d.solved, 6) }, (_, k) => (
              <span key={k} className="size-[7px] rounded-full bg-signal" />
            ))}
          </div>
          <div
            title={`${Math.round(d.focusMs / 60_000)} min focus · ${d.solved} accepted`}
            className="w-full max-w-[34px] origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] rounded-[8px_8px_4px_4px]"
            style={{
              height: d.focusMs ? `${Math.max(10, (d.focusMs / max) * 120)}px` : "4px",
              background: d.focusMs
                ? d.today
                  ? "var(--amber)"
                  : "color-mix(in srgb, var(--amber) 45%, transparent)"
                : "var(--surface-4)",
              boxShadow:
                d.today && d.focusMs
                  ? "0 8px 20px -8px color-mix(in srgb, var(--amber) 60%, transparent)"
                  : undefined,
              animationDelay: `${i * 40}ms`,
            }}
          />
          <span className={cn("font-mono text-11", d.today ? "font-[600] text-ink" : "text-ink-3")}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export type KpiItem = {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  tone?: "up" | "down";
  spark?: number[];
  sparkColor?: string;
  href?: string;
};

/** One bordered strip of key numbers, split by hairlines, each with an optional sparkline. */
export function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <section
      aria-label="Key numbers"
      className={cn(
        "surface-card grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-3 xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none",
        className,
      )}
    >
      {items.map((k) => {
        const body = (
          <>
            <span className="text-[12.5px] text-ink-2">{k.label}</span>
            <span className="num text-[30px]">
              {k.value}
              {k.unit && (
                <small className="ml-0.5 text-[.5em] font-[500] tracking-[-0.01em] text-ink-3">
                  {k.unit}
                </small>
              )}
            </span>
            {k.spark && k.spark.length > 1 && <Spark values={k.spark} color={k.sparkColor} />}
            {k.note && (
              <span
                className={cn(
                  "font-mono text-11",
                  k.tone === "up"
                    ? "text-signal-text"
                    : k.tone === "down"
                      ? "text-bad"
                      : "text-ink-3",
                )}
              >
                {k.note}
              </span>
            )}
          </>
        );
        const cls =
          "flex min-w-0 flex-col gap-1.5 border-line px-[18px] py-4 [&:not(:last-child)]:border-r max-sm:border-b";
        return k.href ? (
          <Link
            key={k.label}
            href={k.href}
            className={cn(cls, "transition-colors duration-[var(--dur-base)] hover:bg-surface-2")}
          >
            {body}
          </Link>
        ) : (
          <div key={k.label} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

function Spark({ values, color = "var(--signal)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * 120).toFixed(1)},${(25 - ((v - min) / (max - min || 1)) * 22).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 120 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** The headline bar (shirorekha) used as a progress line under a heading. */
export function Rekha({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("rekha", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <i style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

const RUNGS = ["1 day", "3 days", "7 days", "16 days", "35 days", "90 days"];

/**
 * The revision ladder drawn as a staircase: one step per interval, taller as the gap grows,
 * with a little card stack on each (amber = due within 3 days, rose = failed last time).
 * The last column is problems you've graduated.
 */
export function LadderStairs({
  items,
  now,
}: {
  items: { step: number; dueAt: number; failed: boolean; retired: boolean }[];
  now: number;
}) {
  const cols = RUNGS.map((label, i) => {
    const here = items.filter((p) => !p.retired && Math.min(5, Math.max(0, p.step)) === i);
    return {
      label,
      sub: `rung ${i + 1}`,
      n: here.length,
      cards: here
        .slice(0, 8)
        .map((p) =>
          p.failed ? "var(--rose)" : p.dueAt < now + 3 * DAY ? "var(--amber)" : "var(--line-3)",
        ),
      grad: false,
    };
  });
  const retired = items.filter((p) => p.retired).length;
  cols.push({ label: "Graduated", sub: "passed at 90 days", n: retired, cards: [], grad: true });
  return (
    <div className="overflow-x-auto">
      <div className="grid h-[300px] min-w-[700px] grid-cols-7 items-end gap-2.5 pt-2.5">
        {cols.map((c, i) => (
          <div key={c.label} className="flex h-full flex-col justify-end gap-2.5">
            <div className="flex flex-col-reverse gap-1 px-1.5" aria-hidden="true">
              {c.cards.map((color, k) => (
                <span key={k} className="h-2 rounded-[3px]" style={{ background: color }} />
              ))}
            </div>
            <div
              className="flex origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] flex-col justify-between rounded-[12px_12px_6px_6px] p-3 shadow-[inset_0_0_0_1px_var(--line),inset_0_1px_0_rgba(255,255,255,.05)]"
              style={{
                height: `${96 + i * 26}px`,
                background: c.grad
                  ? "linear-gradient(180deg, var(--color-signal-soft), var(--surface-2))"
                  : "var(--surface-2)",
                animationDelay: `${i * 50}ms`,
              }}
            >
              <span className={cn("num font-mono text-[22px]", c.n ? "text-ink" : "text-ink-3")}>
                {c.n}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-13 font-[600]">{c.label}</span>
                <span className="text-11 text-ink-3">{c.sub}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type WeekHoursDay = {
  label: string;
  today: boolean;
  dayStart: number;
  totalMs: number;
  /** Study sessions: wall-clock start/end; focusMs of that was study, the rest auto-paused. */
  sessions: { start: number; end: number; focusMs: number }[];
  /** Accepted problems during sessions. */
  solves: number[];
};

const hhmm = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : m ? `${m}m` : "—";
};

/** A week of study days, hour by hour: focus in amber, auto-paused time hatched, solves as dots. */
export function WeekHours({ days, resetHour }: { days: WeekHoursDay[]; resetHour: number }) {
  const pct = (t: number, d: WeekHoursDay) =>
    `${(Math.min(1, Math.max(0, (t - d.dayStart) / DAY)) * 100).toFixed(2)}%`;
  const ticks = [0, 4, 8, 12, 16, 20, 24].map((h) => ({
    x: `${(h / 24) * 100}%`,
    l: `${String((resetHour + h) % 24).padStart(2, "0")}:00`,
  }));
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[760px] flex-col gap-2">
        <div className="grid grid-cols-[56px_minmax(0,1fr)_64px] gap-3">
          <span />
          <div className="relative h-3.5 font-mono text-11 text-ink-3">
            {ticks.map((t, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                style={{ left: t.x }}
              >
                {t.l}
              </span>
            ))}
          </div>
          <span />
        </div>
        {days.map((d) => (
          <div
            key={d.dayStart}
            className="grid grid-cols-[56px_minmax(0,1fr)_64px] items-center gap-3"
          >
            <span className={cn("text-[12.5px]", d.today ? "font-[600] text-ink" : "text-ink-2")}>
              {d.label}
            </span>
            <div
              className="relative h-[26px] rounded-[8px] bg-surface-2"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px calc(100% / 12))",
              }}
            >
              {d.sessions.map((s, i) => {
                const span = Math.max(1, s.end - s.start);
                const focusShare = Math.min(1, s.focusMs / span);
                return (
                  <span
                    key={i}
                    title={`${hhmm(s.focusMs)} focus`}
                    className="absolute top-1 bottom-1 flex overflow-hidden rounded-[5px]"
                    style={{
                      left: pct(s.start, d),
                      width: `max(3px, calc(${pct(s.end, d)} - ${pct(s.start, d)}))`,
                    }}
                  >
                    <i
                      className="block h-full bg-[var(--amber)]"
                      style={{ width: `${focusShare * 100}%` }}
                    />
                    <i
                      className="block h-full flex-1"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg, var(--surface-4) 0 3px, var(--line-3) 3px 5px)",
                      }}
                    />
                  </span>
                );
              })}
              {d.solves.map((t, i) => (
                <span
                  key={i}
                  className="absolute top-[9px] -ml-1 size-2 rounded-full bg-signal shadow-[0_0_0_2px_var(--surface-2)]"
                  style={{ left: pct(t, d) }}
                />
              ))}
            </div>
            <span className="text-right font-mono text-12 text-ink-2">{hhmm(d.totalMs)}</span>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-12 text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-3.5 rounded-[3px] bg-[var(--amber)]" /> focus
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="h-2 w-3.5 rounded-[3px]"
              style={{
                background:
                  "repeating-linear-gradient(135deg, var(--surface-4) 0 3px, var(--line-3) 3px 5px)",
              }}
            />{" "}
            auto-paused
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-signal" /> accepted
          </span>
        </div>
      </div>
    </div>
  );
}

const MAP: Record<string, [number, number]> = {
  arrays: [140, 190],
  strings: [300, 70],
  hashing: [300, 190],
  sorting: [300, 310],
  "two-pointers": [460, 110],
  "binary-search": [460, 260],
  "sliding-window": [620, 60],
  "linked-list": [620, 185],
  recursion: [620, 310],
  "stack-queue": [770, 120],
  trees: [770, 250],
  heap: [910, 80],
  graphs: [910, 200],
  dp: [910, 320],
};
const FALLBACK_LABEL: Record<string, string> = {
  arrays: "Arrays",
  strings: "Strings",
  hashing: "Hashing",
  sorting: "Sorting",
  "two-pointers": "Two pointers",
  "binary-search": "Binary search",
  "sliding-window": "Sliding window",
  "linked-list": "Linked list",
  recursion: "Recursion",
  "stack-queue": "Stack and queue",
  trees: "Trees",
  heap: "Heaps",
  graphs: "Graphs",
  dp: "DP",
};
const UNLOCKS: [string, string][] = [
  ["arrays", "strings"],
  ["arrays", "hashing"],
  ["arrays", "sorting"],
  ["arrays", "two-pointers"],
  ["sorting", "binary-search"],
  ["two-pointers", "sliding-window"],
  ["strings", "sliding-window"],
  ["hashing", "linked-list"],
  ["sorting", "recursion"],
  ["linked-list", "stack-queue"],
  ["stack-queue", "trees"],
  ["recursion", "trees"],
  ["trees", "heap"],
  ["trees", "graphs"],
  ["recursion", "dp"],
];

/**
 * Topics as a map of what unlocks what. Node size = problems solved, lime fill = mastery,
 * rose = your weakest, dashed and grey = not started yet.
 */
export function SkillMap({
  topics,
  weakest,
}: {
  topics: { topic: string; label: string; solved: number; score: number }[];
  weakest: string | null;
}) {
  const by = new Map(topics.map((t) => [t.topic, t]));
  const nodes = Object.entries(MAP).map(([id, [x, y]]) => {
    const t = by.get(id);
    const n = t?.solved ?? 0;
    const r = 14 + Math.min(26, Math.sqrt(n) * 5);
    return { id, x, y, r, n, t, weak: id === weakest };
  });
  const pos = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg
      viewBox="0 0 1040 400"
      className="h-auto w-full"
      role="img"
      aria-label={`Topic map. ${topics
        .filter((t) => t.solved > 0)
        .map((t) => `${t.label} ${t.solved} solved, mastery ${t.score}`)
        .join("; ")}`}
    >
      {UNLOCKS.map(([a, b]) => {
        const A = pos.get(a)!;
        const B = pos.get(b)!;
        const on = A.n > 0 && B.n > 0;
        return (
          <path
            key={`${a}-${b}`}
            d={`M${A.x} ${A.y} Q${(A.x + B.x) / 2} ${(A.y + B.y) / 2 - 22} ${B.x} ${B.y}`}
            fill="none"
            stroke={on ? "var(--line-3)" : "var(--line-2)"}
            strokeWidth={1.5}
            strokeDasharray={on ? undefined : "4 5"}
          />
        );
      })}
      {nodes.map((n) => {
        const label = n.t?.label ?? FALLBACK_LABEL[n.id] ?? n.id;
        const fill = !n.n
          ? "var(--surface-2)"
          : n.weak
            ? "color-mix(in srgb, var(--rose) 22%, transparent)"
            : `color-mix(in srgb, var(--signal) ${Math.round(10 + (n.t!.score / 100) * 45)}%, transparent)`;
        return (
          <g key={n.id}>
            {n.n > 0 && <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="var(--line)" />}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={fill}
              stroke={!n.n ? "var(--line-2)" : n.weak ? "var(--rose)" : "var(--signal)"}
              strokeWidth={1.5}
            />
            <text
              x={n.x}
              y={n.y + n.r + 17}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={n.n ? "var(--ink)" : "var(--ink-3)"}
            >
              {label}
            </text>
            <text
              x={n.x}
              y={n.y + n.r + 31}
              textAnchor="middle"
              fontSize={11}
              fill="var(--ink-3)"
              fontFamily="var(--font-mono)"
            >
              {n.n ? `${n.n} · ${n.t!.score}%` : "not started"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const clockOf = (t: number, tz: string) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });

/**
 * One attempt as a strip: the timed stretch in amber with each submission marked where it
 * happened (wrong in rose, accepted in lime), and clock times underneath.
 */
export function AttemptStrip({
  start,
  activeMs,
  submissions,
  timeZone,
}: {
  start: number;
  activeMs: number;
  submissions: { at: number; ok: boolean; label: string }[];
  timeZone: string;
}) {
  const inside = submissions.filter((s) => s.at >= start - 60_000 && s.at <= start + 4 * 3_600_000);
  const end = Math.max(start + activeMs, ...inside.map((s) => s.at)) + 60_000;
  const span = Math.max(60_000, end - start);
  const x = (t: number) => `${Math.min(100, Math.max(0, ((t - start) / span) * 100)).toFixed(2)}%`;
  const ticks = Array.from({ length: 5 }, (_, i) => start + (span * i) / 4);
  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[520px] px-2 pt-9 pb-1">
        <div className="relative h-3.5">
          <div className="absolute inset-0 flex gap-[3px]">
            <span
              className="rounded-[7px] bg-[var(--amber)]"
              style={{ flex: `${Math.max(1, activeMs)} 1 0` }}
            />
            {end - start - activeMs > 60_000 && (
              <span
                className="rounded-[7px]"
                style={{
                  flex: `${end - start - activeMs} 1 0`,
                  background:
                    "repeating-linear-gradient(135deg, var(--surface-4) 0 4px, var(--surface-3) 4px 8px)",
                }}
              />
            )}
          </div>
          {inside.map((s, i) => (
            <span
              key={i}
              className="absolute -top-8 flex -translate-x-1/2 flex-col items-center gap-1"
              style={{ left: x(s.at) }}
            >
              <span
                className={cn(
                  "rounded-full px-2 py-px text-[11px] font-[600] whitespace-nowrap",
                  s.ok ? "bg-signal/15 text-signal-text" : "bg-bad/15 text-bad",
                )}
              >
                {s.label}
              </span>
              <span className={cn("h-5 w-0.5 rounded-full", s.ok ? "bg-signal" : "bg-bad")} />
            </span>
          ))}
        </div>
        <div className="relative mt-2 h-4 font-mono text-11 text-ink-3">
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: x(t) }}
            >
              {clockOf(t, timeZone)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

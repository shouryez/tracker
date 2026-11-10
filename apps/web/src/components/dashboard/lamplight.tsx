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
  const hand = polar(frac(now), 80);
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
          x1={C}
          y1={C}
          x2={hand.x}
          y2={hand.y}
          stroke="var(--ink)"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.55}
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
        <span className="num text-[32px]">
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
        "surface-card grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-3 xl:grid-cols-5",
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

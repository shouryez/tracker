import type { ReactNode } from "react";
import { Card, cn } from "@upsolve/ui";
import { CardLink } from "@/components/card-link";
import { CountUp } from "./count-up";

/** Donezo-style KPI: title + ↗ link, a big counting number, a trend line and a sparkline. */
export function KpiCard({
  title,
  icon,
  value,
  decimals,
  unit,
  foot,
  href,
  feature,
  spark,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  value: number;
  decimals?: number;
  unit?: string;
  foot: ReactNode;
  href: string;
  feature?: boolean;
  spark?: number[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card
      interactive
      spotlight={!feature}
      className={cn(
        "flex flex-col gap-3",
        feature &&
          "border-transparent bg-[linear-gradient(155deg,color-mix(in_srgb,var(--primary)_92%,#000),var(--primary-2)_70%,color-mix(in_srgb,var(--primary-2)_70%,#000))] text-white shadow-glow",
        className,
      )}
    >
      {feature && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.22),transparent_65%)]"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn("flex items-center gap-2 text-[14px] font-[550]", feature && "text-white")}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-7 place-items-center rounded-[9px]",
              feature ? "bg-white/15 text-white" : "border border-line bg-surface-2 text-ink-2",
            )}
          >
            {icon}
          </span>
          {title}
        </span>
        <CardLink href={href} label={`Open ${title}`} tone={feature ? "inverse" : "default"} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="num text-[40px]">
          <CountUp value={value} decimals={decimals} />
          {unit && (
            <small
              className={cn(
                "ml-1 text-[.42em] font-normal tracking-[-0.01em]",
                feature ? "text-white/65" : "text-ink-3",
              )}
            >
              {unit}
            </small>
          )}
        </span>
        {spark && spark.some((v) => v > 0) && <MiniBars values={spark} inverse={feature} />}
      </div>
      {children}
      <p className={cn("truncate text-[12px]", feature ? "text-white/75" : "text-ink-3")}>{foot}</p>
    </Card>
  );
}

/** Tiny bar sparkline (last 14 days): bars grow in from the baseline. */
function MiniBars({ values, inverse }: { values: number[]; inverse?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <span aria-hidden="true" className="flex h-9 items-end gap-[3px]">
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            "w-[5px] origin-bottom animate-grow rounded-[2px]",
            v === 0
              ? inverse
                ? "bg-white/15"
                : "bg-surface-3"
              : inverse
                ? "bg-white/80"
                : i === values.length - 1
                  ? "bg-primary"
                  : "bg-ink-3",
          )}
          style={{ height: `${Math.max(12, (v / max) * 100)}%`, animationDelay: `${i * 30}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * This week's solves per day as capsules (Donezo "Project Analytics"):
 * solid for days with activity, hatched for empty or future days, today labelled.
 */
export function WeekCapsules({
  days,
  todayIndex,
}: {
  days: { label: string; count: number; future: boolean }[];
  todayIndex: number;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div
      className="grid h-[190px] grid-cols-7 items-end gap-2 sm:gap-3"
      role="img"
      aria-label={`Submissions this week: ${days.map((d) => `${d.label} ${d.count}`).join(", ")}`}
    >
      {days.map((d, i) => {
        const today = i === todayIndex;
        const h = d.count === 0 ? 100 : Math.max(28, (d.count / max) * 100);
        return (
          <div
            key={d.label}
            className="flex h-full flex-col items-center justify-end gap-2"
            title={`${d.label}: ${d.count} submission${d.count === 1 ? "" : "s"}`}
          >
            <div className="relative flex w-full max-w-11 flex-1 items-end">
              {today && d.count > 0 && (
                <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-[6px] border border-line-2 bg-surface px-1.5 py-0.5 font-mono text-[10.5px] whitespace-nowrap shadow-sm">
                  {d.count}
                </span>
              )}
              <span
                className={cn(
                  "w-full origin-bottom animate-grow rounded-full",
                  d.count === 0 || d.future
                    ? "hatch border border-line-2"
                    : today
                      ? "bg-[linear-gradient(180deg,var(--signal),color-mix(in_srgb,var(--signal)_70%,#000))] shadow-glow-signal"
                      : i % 2
                        ? "bg-primary"
                        : "bg-[color-mix(in_srgb,var(--primary)_55%,var(--surface))]",
                )}
                style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
              />
            </div>
            <span
              className={cn(
                "font-mono text-[11px]",
                today ? "font-semibold text-ink" : "text-ink-3",
              )}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Half-ring gauge (Donezo "Project Progress"): done in ink, remaining hatched.
 * The arc draws in on load (pathLength + stroke-dashoffset).
 */
export function HalfGauge({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`${pct}% ${label}`}>
        <defs>
          <pattern
            id="gauge-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="2" height="6" fill="var(--hatch)" />
          </pattern>
          <linearGradient id="gauge-fill" x1="0" x2="1">
            <stop offset="0" stopColor="var(--primary)" />
            <stop offset="1" stopColor="color-mix(in srgb, var(--primary) 60%, var(--signal))" />
          </linearGradient>
        </defs>
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gauge-hatch)"
          strokeWidth="26"
          strokeLinecap="round"
        />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth="26"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(pct, 0.01)} 100`}
          className="animate-draw"
          style={{ ["--draw-from" as string]: `${pct}` }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <span className="num text-[38px]">
          <CountUp value={pct} />%
        </span>
        <span className="block font-mono text-[11px] text-ink-3">{label}</span>
      </div>
    </div>
  );
}

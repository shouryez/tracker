import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Card, CornerArrow, ProgressRing, cn } from "@upsolve/ui";
import { ChartEmpty, MarkTip } from "@/components/charts/kit";
import { NumberTicker } from "@/components/fx/number-ticker";

/**
 * Stat tile: icon + label → big rolling number with the unit in serif italic → context line,
 * with an optional mini visual and delta chip. `feature` makes it the page's hero tile.
 * The whole tile is one link.
 */
export function KpiCard({
  title,
  icon,
  tint,
  value,
  decimals,
  unit,
  foot,
  href,
  feature,
  spark,
  delta,
  visual,
  strip,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  /** Icon square + corner glow tint, e.g. "var(--ember)". */
  tint?: string;
  value: number;
  decimals?: number;
  unit?: string;
  foot: ReactNode;
  href: string;
  feature?: boolean;
  spark?: number[];
  /** e.g. +3 vs last week; colour follows the sign. */
  delta?: { value: number; label: string };
  /** Replaces the sparkline (ring, flame, …). */
  visual?: ReactNode;
  /** On wide screens, lay out as a short horizontal row (title and foot left, value right). */
  strip?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card
      tier={feature ? "hero" : "standard"}
      beam={feature}
      interactive
      spotlight={!feature}
      glow={!feature ? tint : undefined}
      className={cn(
        "flex flex-col gap-3",
        strip &&
          "xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:content-center xl:items-center xl:gap-x-6 xl:gap-y-1.5",
        className,
      )}
    >
      <Link
        href={href}
        aria-label={`Open ${title}`}
        className="absolute inset-0 z-[2] rounded-[inherit]"
      />
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          strip && "xl:col-start-1 xl:row-start-1",
        )}
      >
        <span className="flex items-center gap-2.5 text-14 font-[600]">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-7 place-items-center rounded-[9px] border",
              feature
                ? "border-white/15 bg-white/12 text-white"
                : tint
                  ? "border-[color-mix(in_srgb,var(--t)_30%,transparent)] bg-[color-mix(in_srgb,var(--t)_14%,transparent)] text-[var(--t)]"
                  : "border-line bg-surface-2 text-ink-2",
            )}
            style={tint ? ({ "--t": tint } as CSSProperties) : undefined}
          >
            {icon}
          </span>
          {title}
        </span>
        <CornerArrow
          className={cn(feature && "border-white/25 text-white", strip && "xl:hidden")}
        />
      </div>
      <div
        className={cn(
          "flex min-w-0 items-end justify-between gap-3",
          strip && "xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:items-center xl:gap-5",
        )}
      >
        <span className={cn("num text-[44px]", feature && "text-white")}>
          <NumberTicker value={value} decimals={decimals} />
          {unit && (
            <small
              className={cn(
                "ml-1.5 font-display text-[.46em] font-normal tracking-normal italic",
                feature ? "text-white/65" : "text-ink-3",
              )}
            >
              {unit}
            </small>
          )}
        </span>
        {visual ??
          (spark && spark.some((v) => v > 0) ? (
            <MiniBars values={spark} inverse={feature} />
          ) : null)}
      </div>
      {children}
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          strip && "xl:col-start-1 xl:row-start-2 xl:pl-[38px]",
        )}
      >
        {delta && delta.value !== 0 && (
          <span
            className={cn(
              "tnum inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-11 font-[600]",
              feature
                ? "bg-white/15 text-white"
                : delta.value > 0
                  ? "bg-success-soft text-success"
                  : "bg-hard-soft text-hard",
            )}
          >
            {delta.value > 0 ? "↑" : "↓"} {Math.abs(delta.value)} {delta.label}
          </span>
        )}
        <p className={cn("truncate text-12", feature ? "text-white/75" : "text-ink-3")}>{foot}</p>
      </div>
    </Card>
  );
}

/** 14-day bar sparkline: grows in from the baseline, the last bar highlighted. */
function MiniBars({ values, inverse }: { values: number[]; inverse?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <span aria-hidden="true" className="hidden h-10 shrink-0 items-end gap-[2px] sm:flex">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <span
            key={i}
            className={cn(
              "w-[4px] origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] rounded-[2px]",
              v === 0
                ? inverse
                  ? "bg-white/15"
                  : "bg-surface-3"
                : inverse
                  ? last
                    ? "bg-signal-mark shadow-[0_0_8px_var(--signal-mark)]"
                    : "bg-white/75"
                  : last
                    ? "bg-signal-mark"
                    : "bg-violet/70",
            )}
            style={{ height: `${Math.max(12, (v / max) * 100)}%`, animationDelay: `${i * 30}ms` }}
          />
        );
      })}
    </span>
  );
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const GHOST = [40, 65, 30, 85, 55, 20, 45];

/**
 * This week: seven rounded bars growing from the baseline, today's in lime with a glow,
 * a dashed average line, values on hover. Future days are hatched (planned, not empty).
 */
export function WeekCapsules({
  days,
  todayIndex,
}: {
  days: { label: string; count: number; future: boolean }[];
  todayIndex: number;
}) {
  const total = days.reduce((n, d) => n + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  const past = days.filter((d) => !d.future);
  const avg = past.length ? total / past.length : 0;

  const bars = (ghost: boolean) => (
    <div className="grid h-[180px] grid-cols-7 gap-2 sm:gap-3">
      {days.map((d, i) => {
        const today = i === todayIndex;
        const h = ghost ? GHOST[i]! : d.count === 0 ? 0 : Math.max(10, (d.count / max) * 100);
        return (
          <div
            key={i}
            tabIndex={ghost ? undefined : 0}
            aria-label={ghost ? undefined : `${DAY_NAMES[i]}: ${d.count}`}
            className="group/mark flex h-full flex-col items-center gap-2 outline-none"
          >
            <div className="relative flex w-full max-w-10 flex-1 items-end">
              {!ghost && d.count > 0 && (
                <MarkTip
                  title={DAY_NAMES[i]}
                  value={`${d.count} solved`}
                  swatch={today ? "var(--signal-mark)" : "var(--violet)"}
                />
              )}
              {!ghost && avg > 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[-6px] border-t border-dashed border-ink-3/50"
                  style={{ bottom: `${(avg / max) * 100}%` }}
                />
              )}
              {d.future && !ghost ? (
                <span className="hatch h-[18%] w-full rounded-[10px] border border-dashed border-line-2" />
              ) : h === 0 ? (
                <span className="h-1.5 w-full rounded-full bg-surface-3" />
              ) : (
                <span
                  className={cn(
                    "relative w-full origin-bottom animate-[grow-y_800ms_var(--ease-out)_backwards] rounded-[10px] transition-[filter] duration-[var(--dur-fast)] group-hover/mark:brightness-125",
                    ghost
                      ? "bg-ink-3"
                      : today
                        ? "bg-[linear-gradient(180deg,var(--signal-mark),color-mix(in_srgb,var(--signal-mark)_55%,var(--surface)))] shadow-[0_0_24px_-6px_var(--signal-mark)]"
                        : "bg-[linear-gradient(180deg,var(--violet),color-mix(in_srgb,var(--violet)_35%,var(--surface)))]",
                  )}
                  style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
                />
              )}
            </div>
            <span className={cn("font-mono text-11", today ? "font-[700] text-ink" : "text-ink-3")}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  if (total === 0) {
    return (
      <ChartEmpty
        ghost={bars(true)}
        title={
          <>
            No submissions <em>yet</em> this week.
          </>
        }
      >
        Your first one lights this up.
      </ChartEmpty>
    );
  }
  return (
    <div>
      <div role="img" aria-label={`This week: ${total} solved, ${avg.toFixed(1)} a day on average`}>
        {bars(false)}
      </div>
      <p className="mt-2 flex items-center gap-2 text-11 text-ink-3">
        <i aria-hidden="true" className="w-4 border-t border-dashed border-ink-3/70" />
        average {avg.toFixed(1)} a day
      </p>
    </div>
  );
}

/**
 * Sheet progress ring (replaces the old half gauge): ring + big percentage + done/total.
 * Kept under the old name so callers don't change.
 */
export function HalfGauge({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-5">
      <ProgressRing
        total={Math.max(total, 1)}
        size={128}
        stroke={11}
        segments={[{ label: "Done", value: done, color: "var(--violet)" }]}
        aria-label={`${done} of ${total} ${label}`}
      >
        <span className="num text-30">
          <NumberTicker value={pct} />
          <span className="text-[.6em] text-ink-3">%</span>
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="num text-24">
          <NumberTicker value={done} />
          <span className="text-ink-3"> / {total}</span>
        </p>
        <p className="mt-1 truncate text-12 text-ink-3">{label}</p>
      </div>
    </div>
  );
}

// DsaKaro

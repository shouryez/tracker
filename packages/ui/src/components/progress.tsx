import type { CSSProperties, ReactNode } from "react";
import { cn } from "../cn";

/*
 * Progress primitives. Fills animate in once (out-expo, 900 ms) and are static under
 * reduced motion. "Empty" is a plain track: hatch is reserved for planned/future.
 */

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Rounded track + gradient fill with a glowing tip, optional goal tick and trailing label. */
export function LinearProgress({
  value,
  max = 1,
  color = "var(--primary)",
  goal,
  height = 8,
  label,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  max?: number;
  /** Any CSS colour; the fill fades from it to a lighter mix. */
  color?: string;
  /** Goal as a fraction of max (0–1), drawn as a tick. */
  goal?: number;
  height?: number;
  /** Label that rides at the tip (e.g. "21 / 495"). */
  label?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const p = max > 0 ? clamp(value / max) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      className={cn("relative w-full", label != null && "pt-5", className)}
      style={{ "--c": color } as CSSProperties}
    >
      {label != null && (
        <span
          className="tnum absolute top-0 -translate-x-1/2 text-11 whitespace-nowrap text-ink-2"
          style={{ left: `clamp(16px, ${p * 100}%, calc(100% - 16px))` }}
        >
          {label}
        </span>
      )}
      <div className="relative overflow-visible rounded-full bg-surface-3" style={{ height }}>
        {p > 0 && (
          <div
            className="relative h-full origin-left animate-[grow-x_900ms_var(--ease-out)_backwards] rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--c)_70%,transparent),var(--c))]"
            style={{ width: `${Math.max(p * 100, 2)}%` }}
          >
            <span className="absolute top-1/2 right-0 aspect-square h-[calc(100%+4px)] translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--c)] shadow-[0_0_10px_1px_var(--c)]" />
          </div>
        )}
        {goal != null && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -bottom-1 w-px bg-ink-3"
            style={{ left: `${clamp(goal) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

export type Segment = { value: number; color: string; label: string };

/** Segments with 2px gaps; hovering one dims the others. Labels go into title + aria. */
export function SegmentedProgress({
  segments,
  total,
  height = 8,
  className,
}: {
  segments: Segment[];
  /** Defaults to the sum of segments (a full bar). */
  total?: number;
  height?: number;
  className?: string;
}) {
  const sum = segments.reduce((a, s) => a + s.value, 0);
  const t = Math.max(total ?? sum, 1);
  const rest = Math.max(0, t - sum);
  return (
    <div
      role="img"
      aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}
      className={cn("group/seg flex w-full gap-[2px]", className)}
      style={{ height }}
    >
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <span
            key={s.label}
            title={`${s.label}: ${s.value}`}
            className="h-full origin-left animate-[grow-x_900ms_var(--ease-out)_backwards] rounded-full transition-opacity duration-[var(--dur-fast)] group-hover/seg:opacity-40 hover:!opacity-100"
            style={{ flexGrow: s.value, background: s.color }}
          />
        ))}
      {rest > 0 && <span className="h-full rounded-full bg-surface-3" style={{ flexGrow: rest }} />}
    </div>
  );
}

/**
 * Ring with rounded caps, one or more segments (e.g. by difficulty), drawing in on mount.
 * `sweep` 360 = full circle, 270 = open at the bottom. Children render in the centre.
 */
export function ProgressRing({
  segments,
  total,
  size = 132,
  stroke = 10,
  sweep = 360,
  glow = true,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  segments: Segment[];
  total: number;
  size?: number;
  stroke?: number;
  sweep?: 270 | 360;
  glow?: boolean;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = (c * sweep) / 360;
  const rotate = sweep === 360 ? -90 : 135;
  const t = Math.max(total, 1);
  const gap = segments.filter((s) => s.value > 0).length > 1 ? stroke * 0.9 : 0;
  let offset = 0;
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? segments.map((s) => `${s.label} ${s.value}`).join(", ")}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ transform: `rotate(${rotate}deg)` }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
        {segments.map((s) => {
          if (s.value <= 0) return null;
          const len = Math.max((s.value / t) * arc - gap, 0.01);
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
              className="animate-[ring-in_1100ms_var(--ease-out)_backwards]"
              style={
                {
                  "--ring-from": `${len}`,
                  filter: glow ? `drop-shadow(0 0 6px ${s.color})` : undefined,
                } as CSSProperties
              }
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          offset += (s.value / t) * arc;
          return el;
        })}
      </svg>
      <div className="relative flex flex-col items-center text-center">{children}</div>
    </div>
  );
}

/** The revision ladder: 1 → 3 → 7 → 16 → 35 → 90 days. */
export const LADDER_DAYS = [1, 3, 7, 16, 35, 90] as const;

/**
 * 6-step strength meter. Filled steps glow violet, the current step is highlighted,
 * and when overdue the next step turns rose. `stage` = steps completed (0–6).
 */
export function StrengthLadder({
  stage,
  overdue,
  dueLabel,
  compact,
  className,
}: {
  stage: number;
  overdue?: boolean;
  /** e.g. "next review in 3 days" — goes into the tooltip. */
  dueLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  const s = Math.max(0, Math.min(6, Math.round(stage)));
  const tip = `Stage ${s} of 6${dueLabel ? ` · ${dueLabel}` : ""}`;
  return (
    <span
      role="img"
      aria-label={tip}
      title={tip}
      className={cn("inline-flex items-end", compact ? "gap-[3px]" : "gap-1", className)}
    >
      {LADDER_DAYS.map((d, i) => {
        const filled = i < s;
        const next = i === s;
        return (
          <span key={d} className="flex flex-col items-center gap-1">
            <i
              className={cn(
                "block rounded-[3px] transition-colors",
                compact ? "w-[7px]" : "w-3",
                filled
                  ? "bg-violet shadow-[0_0_8px_-1px_var(--violet)]"
                  : next && overdue
                    ? "bg-overdue/70 shadow-[0_0_8px_-1px_var(--overdue)]"
                    : next
                      ? "border border-violet/60 bg-violet-soft"
                      : "bg-surface-3",
              )}
              style={{ height: (compact ? 6 : 8) + i * (compact ? 1.5 : 2.5) }}
            />
            {!compact && (
              <span
                className={cn(
                  "tnum font-mono text-[9.5px] leading-none",
                  filled || next ? "text-ink-2" : "text-ink-4",
                )}
              >
                {d}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

// DsaKaro

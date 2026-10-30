import type { ReactNode } from "react";
import { cn } from "@upsolve/ui";

/*
 * Shared chart pieces. Rules: muted 11px mono axes, 6% gridlines, glass tooltips, a draw-in
 * on first view, and a designed empty state per chart (ghost shape + copy + optional CTA).
 */

/** Glass tooltip that appears above a `group/mark relative` parent on hover or focus. */
export function MarkTip({
  title,
  value,
  swatch,
  className,
}: {
  title: ReactNode;
  value?: ReactNode;
  swatch?: string;
  className?: string;
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        "glass pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 rounded-[9px] border border-line-2 px-2.5 py-1.5 text-left whitespace-nowrap opacity-0 shadow-e3",
        "transition-[opacity,translate] duration-[var(--dur-fast)] group-hover/mark:translate-y-0 group-hover/mark:opacity-100 group-focus-visible/mark:translate-y-0 group-focus-visible/mark:opacity-100",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-11 text-ink-3">
        {swatch && <i className="size-2 rounded-[2px]" style={{ background: swatch }} />}
        {title}
      </span>
      {value != null && <span className="tnum block text-13 font-[600] text-ink">{value}</span>}
    </span>
  );
}

/** Empty chart: a faint ghost of the chart behind a short message and an optional action. */
export function ChartEmpty({
  ghost,
  title,
  children,
  action,
  className,
}: {
  ghost: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate", className)}>
      <div aria-hidden="true" className="pointer-events-none opacity-[.14] [filter:grayscale(1)]">
        {ghost}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-14 font-[600] [&_em]:font-display [&_em]:text-[1.12em] [&_em]:font-normal">
          {title}
        </p>
        {children && <p className="mt-1 max-w-[40ch] text-12 text-ink-3">{children}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

/** Legend row: swatch, label, value. */
export function LegendItem({
  color,
  label,
  value,
  className,
}: {
  color: string;
  label: ReactNode;
  value?: ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("flex items-center gap-2 text-13", className)}>
      <i
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-[3px]"
        style={{ background: color }}
      />
      <span className="min-w-0 flex-1 truncate text-ink-2">{label}</span>
      {value != null && <span className="tnum font-mono text-12 text-ink">{value}</span>}
    </li>
  );
}

// DsaKaro

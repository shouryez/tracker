import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Clickable card: lifts, brightens its border and deepens its shadow on hover. */
  interactive?: boolean;
  /** Soft radial light that follows the cursor (needs <SpotlightTracker /> once on the page). */
  spotlight?: boolean;
};

/** Layered surface: 1px border, inner top highlight (dark), soft shadow. */
export function cardClasses({
  interactive,
  spotlight,
}: { interactive?: boolean; spotlight?: boolean } = {}) {
  return cn(
    "relative isolate rounded-lg border border-line bg-surface p-[18px] shadow-card",
    "transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]",
    interactive && "hover:-translate-y-0.5 hover:border-line-2 hover:shadow-md",
    spotlight &&
      "overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-[var(--dur-slow)] hover:before:opacity-100 " +
        "before:bg-[radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,0%),var(--spotlight),transparent_65%)]",
  );
}

export function Card({ className, interactive, spotlight, ...props }: CardProps) {
  return (
    <div
      data-spotlight={spotlight || undefined}
      className={cn(cardClasses({ interactive, spotlight }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-3.5 flex items-center justify-between gap-2.5", className)} {...props} />
  );
}

export function CardTitle({
  icon,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { icon?: ReactNode }) {
  return (
    <h3 className={cn("flex items-center gap-2 text-sm font-[550]", className)} {...props}>
      {icon && (
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-[7px] border border-line bg-surface-2 text-ink-2"
        >
          {icon}
        </span>
      )}
      {children}
    </h3>
  );
}

/** Mono meta line, e.g. "LAST 30 DAYS". */
export function CardSub({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("font-mono text-[11.5px] leading-tight tracking-[.02em] text-ink-3", className)}
      {...props}
    />
  );
}

/** Big two-tone number: value in ink, unit muted at 42% size. */
export function Stat({
  value,
  unit,
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("num text-[40px]", className)}>
      {value}
      {unit && (
        <small className="ml-1 text-[.42em] font-normal tracking-[-0.01em] text-ink-3">
          {unit}
        </small>
      )}
    </div>
  );
}

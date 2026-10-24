import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative isolate rounded-lg border border-line bg-surface p-[18px] shadow-card",
        className,
      )}
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

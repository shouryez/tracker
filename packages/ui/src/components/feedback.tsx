import type { ReactNode } from "react";
import { cn } from "../cn";

/** Shimmering placeholder. Give it the size and radius of the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

/** A card-shaped skeleton: header line, a big number, two lines of text. */
export function SkeletonCard({ className, lines = 2 }: { className?: string; lines?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-lg border border-line bg-surface p-[18px] shadow-card", className)}
    >
      <Skeleton className="mb-5 h-4 w-28" />
      <Skeleton className="mb-4 h-9 w-24 rounded-md" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("mb-2 h-3", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/**
 * Friendly empty state: a small icon composition, what's missing, and what to do.
 * Pass the action (a link or button) so it can be a real route.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-8 text-center", className)}>
      <span aria-hidden="true" className="relative mb-4 grid size-14 place-items-center">
        <span className="dots absolute inset-[-14px] rounded-full opacity-70 [mask-image:radial-gradient(circle,#000_40%,transparent_70%)]" />
        <span className="relative grid size-12 place-items-center rounded-[14px] border border-line-2 bg-surface-2 text-ink-2 shadow-sm">
          {icon}
        </span>
      </span>
      <p className="text-[15px] font-[550] tracking-[-0.01em]">{title}</p>
      {children && (
        <p className="mt-1 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-2">{children}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Keyboard key hint, e.g. <Kbd>Ctrl K</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded-[5px] border border-line bg-surface-2 px-1.5 font-mono text-[10.5px] text-ink-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

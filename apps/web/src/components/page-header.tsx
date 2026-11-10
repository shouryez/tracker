import type { ReactNode } from "react";
import { cn } from "@upsolve/ui";

/**
 * Lamplight has one light source: every page header sits under the same warm lamp.
 * Kept as a map so callers can still say which section they are.
 */
const LAMP = "var(--amber)";
export const PAGE_GLOW = {
  overview: LAMP,
  revision: LAMP,
  sheets: LAMP,
  analytics: LAMP,
  sessions: LAMP,
  contests: LAMP,
  groups: LAMP,
  college: LAMP,
  settings: LAMP,
} as const;

/**
 * App page header: a sentence-case eyebrow, an Inter Tight title (pass a dimmed accent as
 * <em>), a one-line subtitle with live numbers, and actions on the right (one ember at most).
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Kept for older call sites; Orbit headers have no glow. */
  glow?: string;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2.5 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-3">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[clamp(32px,3.4vw,48px)] leading-[1.02] text-balance text-ink [&_em]:font-[inherit] [&_em]:text-ink-3 [&_em]:not-italic">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 flex max-w-[720px] flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-relaxed text-ink-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}

/** Dot separator for header subtitles. */
export function Dot() {
  return (
    <span aria-hidden="true" className="text-ink-4">
      ·
    </span>
  );
}

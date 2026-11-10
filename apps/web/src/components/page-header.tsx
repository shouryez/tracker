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
 * App page header: mono eyebrow → title with one dimmed accent (pass it as <em>)
 * → a one-line subtitle with live numbers → actions on the right (one primary at most).
 * A faint dot field and the lamp glow sit behind it.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  glow,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  glow?: string;
  className?: string;
}) {
  return (
    <header
      className={cn("relative isolate flex flex-wrap items-end justify-between gap-4", className)}
    >
      <span aria-hidden="true" className="dotfield pointer-events-none absolute -inset-x-4 -top-8 -bottom-4 -z-10" />
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 -z-10 h-56 w-[min(520px,90vw)] scale-[1.6] opacity-[.14]"
          style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
        />
      )}
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 label-mono">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_var(--color-signal-soft)]" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-[clamp(26px,3vw,34px)] leading-[1.05] font-[620] tracking-[-0.035em] [&_em]:font-[inherit] [&_em]:text-ink-3 [&_em]:not-italic">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-14 text-ink-2">
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

// DsaKaro

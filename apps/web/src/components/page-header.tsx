import type { ReactNode } from "react";
import { cn } from "@upsolve/ui";

/** Ambient glow colour per section. */
export const PAGE_GLOW = {
  overview: "var(--primary)",
  revision: "var(--violet)",
  sheets: "var(--primary)",
  analytics: "var(--easy)",
  sessions: "var(--signal)",
  contests: "var(--medium)",
  groups: "#ff6bb5",
  college: "var(--info)",
  settings: "var(--ink-3)",
} as const;

/**
 * App page header: mono eyebrow → sans title with one serif-italic accent (pass it as <em>)
 * → a one-line subtitle with live numbers → actions on the right (one primary at most).
 * A soft ambient glow tinted per page sits behind it.
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
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 -z-10 h-56 w-[min(520px,90vw)] scale-[1.6] opacity-[.16]"
          style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
        />
      )}
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 label-mono">{eyebrow}</p>}
        <h1 className="text-[clamp(28px,3.6vw,40px)] leading-[1.04] font-[600] tracking-[-0.04em] [&_em]:font-display [&_em]:text-[1.12em] [&_em]:font-normal [&_em]:tracking-[-0.01em]">
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

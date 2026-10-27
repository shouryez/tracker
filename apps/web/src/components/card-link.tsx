import Link from "next/link";
import { cn } from "@upsolve/ui";

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M5 11 11 5M6 5h5v5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The ↗ circle in a card's corner that opens the page behind it. On hover (of the link or
 * its card) the arrow exits top-right, a fresh one slides in bottom-left over a lime fill.
 */
export function CardLink({
  href,
  label,
  className,
  tone = "default",
}: {
  href: string;
  label: string;
  className?: string;
  tone?: "default" | "inverse";
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "group/arrow relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border transition-[color,border-color] duration-[var(--dur-base)]",
        "hover:border-transparent hover:text-signal-ink group-hover/card:border-transparent group-hover/card:text-signal-ink",
        tone === "inverse" ? "border-white/35 text-white" : "border-line-2 bg-surface text-ink-2",
        className,
      )}
    >
      <span className="absolute inset-0 scale-0 rounded-full bg-signal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/arrow:scale-100 group-hover/card:scale-100" />
      <span className="relative transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/arrow:translate-x-4 group-hover/arrow:-translate-y-4 group-hover/card:translate-x-4 group-hover/card:-translate-y-4">
        {ARROW}
      </span>
      <span className="absolute -translate-x-4 translate-y-4 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/arrow:translate-0 group-hover/card:translate-0">
        {ARROW}
      </span>
    </Link>
  );
}

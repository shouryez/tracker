import Link from "next/link";
import { cn } from "@upsolve/ui";

/** The ↗ circle in a card's corner that opens the page behind it (Donezo style). */
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
        "group/arrow grid size-8 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:rotate-45",
        tone === "inverse"
          ? "border-white/40 bg-white/10 text-white hover:bg-white hover:text-ink"
          : "border-line-2 bg-surface text-ink-2 hover:border-ink hover:bg-ink hover:text-bg",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M5 11 11 5M6 5h5v5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

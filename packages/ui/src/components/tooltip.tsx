import type { ReactNode } from "react";
import { cn } from "../cn";

/**
 * CSS-only glass tooltip with an arrow: 150 ms delay, fades in with a 4px rise.
 * Shows on hover and keyboard focus. The trigger keeps its own accessible name.
 */
export function Tooltip({
  content,
  side = "top",
  children,
  className,
}: {
  content: ReactNode;
  side?: "top" | "right" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "glass pointer-events-none absolute z-[80] w-max max-w-[260px] rounded-[9px] border border-line-2 px-2.5 py-1.5 text-12 leading-snug text-ink shadow-e3",
          "opacity-0 transition-[opacity,translate] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
          "group-hover/tip:opacity-100 group-hover/tip:delay-150 group-focus-within/tip:opacity-100",
          // Arrow: a rotated square sharing the glass fill.
          "after:absolute after:size-2 after:rotate-45 after:border-line-2 after:bg-[var(--overlay)]",
          side === "top" &&
            "bottom-full left-1/2 mb-2.5 -translate-x-1/2 translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0 after:top-full after:left-1/2 after:-mt-1 after:-ml-1 after:border-r after:border-b",
          side === "bottom" &&
            "top-full left-1/2 mt-2.5 -translate-x-1/2 -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0 after:bottom-full after:left-1/2 after:-mb-1 after:-ml-1 after:border-t after:border-l",
          side === "right" &&
            "top-1/2 left-full ml-3 translate-x-1 -translate-y-1/2 group-hover/tip:translate-x-0 group-focus-within/tip:translate-x-0 after:top-1/2 after:right-full after:-mt-1 after:-mr-1 after:border-b after:border-l",
        )}
      >
        {content}
      </span>
    </span>
  );
}

// DsaKaro

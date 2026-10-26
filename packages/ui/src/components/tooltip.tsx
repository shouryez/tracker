import type { ReactNode } from "react";
import { cn } from "../cn";

/**
 * CSS-only tooltip: shows after a short delay on hover or keyboard focus.
 * Wrap the trigger; the trigger keeps its own accessible name (aria-label).
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
          "pointer-events-none absolute z-[80] w-max max-w-[240px] rounded-[8px] border border-line-2 bg-surface-2 px-2 py-1 text-[12px] text-ink shadow-md",
          "scale-95 opacity-0 transition-[opacity,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
          "group-hover/tip:scale-100 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-focus-within/tip:scale-100 group-focus-within/tip:opacity-100",
          side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2 origin-bottom",
          side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2 origin-top",
          side === "right" && "top-1/2 left-full ml-2.5 -translate-y-1/2 origin-left",
        )}
      >
        {content}
      </span>
    </span>
  );
}

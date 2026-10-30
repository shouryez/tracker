import type { HTMLAttributes } from "react";
import { cn } from "../cn";

/** Pulsing lime dot for anything live right now. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-[7px]", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-70" />
      <span className="relative inline-flex size-[7px] rounded-full bg-signal" />
    </span>
  );
}

export type EyebrowProps = HTMLAttributes<HTMLSpanElement> & { live?: boolean };

/** Mono uppercase pill above section heads (DESIGN.md §5). */
export function Eyebrow({ live, className, children, ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/70 px-[11px] py-[5px]",
        "font-mono text-[11px] leading-none font-medium tracking-[.08em] text-ink-2 uppercase pointer-fine:backdrop-blur-md",
        className,
      )}
      {...props}
    >
      {live && <LiveDot />}
      {children}
    </span>
  );
}

// DsaKaro

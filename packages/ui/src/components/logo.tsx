"use client";

import { useId } from "react";
import { cn } from "../cn";

/**
 * A tick drawn through graph nodes: two hollow nodes on the path, ending in a lime one.
 * The holes are masked out, so the mark sits on any background. The mask covers the whole
 * grid: its default box hugs the path and would clip the round stroke caps.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  const mask = `dk-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="2.5 0.5 28 28"
      aria-hidden="true"
      className={className}
    >
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
        <rect x="0" y="0" width="32" height="32" fill="#fff" />
        <circle cx="5.5" cy="16" r="1.3" fill="#000" />
        <circle cx="12.5" cy="23" r="1.3" fill="#000" />
      </mask>
      <path
        d="M5.5 16 12.5 23 24.5 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        mask={`url(#${mask})`}
      />
      <circle cx="26" cy="7.5" r="4.2" fill="var(--signal)" />
    </svg>
  );
}

/** "Dsa" in the sans, "Karo" in the serif italic, the same pairing as the page headlines. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[9px] text-[17px] font-[650] tracking-[-0.03em]",
        className,
      )}
    >
      <LogoMark />
      <span>
        Dsa
        <em className="font-display text-[1.14em] font-normal tracking-[-0.01em] italic">Karo</em>
      </span>
    </span>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@upsolve/ui";

/**
 * Sticky top bar: transparent at the top, frosted glass with a border once you scroll, and a
 * soft progressive blur under it.
 */
export function StickyHeader({ children, className }: { children: ReactNode; className?: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    // Only tell React when it flips: a state update per scroll event costs a render each
    // time (a few ms per frame on a phone), on every page of the app.
    let last = false;
    const onScroll = () => {
      const next = window.scrollY > 8;
      if (next !== last) setScrolled((last = next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-40 -mx-4 mb-6 flex items-center justify-between gap-3 border-b px-4 py-3 sm:-mx-6 sm:px-6",
        "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-[var(--dur-slow)]",
        scrolled ? "glass border-line shadow-e1" : "border-transparent",
        className,
      )}
    >
      {children}
      {/* Progressive blur: content softens as it slides under the bar instead of a hard edge. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-full h-6 transition-opacity duration-[var(--dur-slow)] pointer-coarse:hidden",
          "[mask-image:linear-gradient(#000,transparent)] backdrop-blur-[6px]",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
    </header>
  );
}

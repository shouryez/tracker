"use client";

import type { MouseEvent } from "react";
import { cn } from "../cn";
import { THEME_STORAGE_KEY } from "./theme-script";

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function ThemeToggle({ className }: { className?: string }) {
  function toggle(e: MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    const doc = document as ViewTransitionDoc;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (doc.startViewTransition && !reduced) {
      // Circular reveal from the toggle: the new theme grows out of the button.
      const r = e.currentTarget.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      doc
        .startViewTransition(() => root.setAttribute("data-theme", next))
        .ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            {
              duration: 520,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(() => {});
    } else {
      // Fallback: cross-fade colours for one switch (see .theme-transition in index.css).
      root.classList.add("theme-transition");
      root.setAttribute("data-theme", next);
      window.setTimeout(() => root.classList.remove("theme-transition"), 400);
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this page view.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      className={cn(
        "inline-grid size-[34px] place-items-center rounded-full border border-line-2 bg-surface text-ink-2",
        "transition-[color,border-color,transform] duration-[var(--dur-base)] hover:border-ink-3 hover:text-ink active:scale-95 [&>svg]:transition-transform [&>svg]:duration-[var(--dur-slow)] hover:[&>svg]:rotate-[30deg]",
        className,
      )}
    >
      {/* Sun shows in dark mode (switch to light); moon in light mode. CSS-only, so no hydration mismatch. */}
      <svg
        className="light:hidden"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg
        className="hidden light:block"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.6 6.6 0 0 0 10.7 10.7Z" />
      </svg>
    </button>
  );
}

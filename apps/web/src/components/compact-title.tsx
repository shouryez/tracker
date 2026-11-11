"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@upsolve/ui";

/** The heading's readable text: animated headings keep per-letter spans aria-hidden. */
function readable(h: HTMLElement) {
  const c = h.cloneNode(true) as HTMLElement;
  c.querySelectorAll("[aria-hidden=true]").forEach((n) => n.remove());
  return (c.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * iOS-style large titles (FRONTEND-PLAN §0.6): once the page's big H1 scrolls out of view, a
 * slim frosted pill with the title fades in at the top. Tapping it scrolls back up. Mounted
 * by PageHeader inside its <header>.
 */
export function CompactTitle() {
  const probe = useRef<HTMLSpanElement>(null);
  const [title, setTitle] = useState("");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const h1 = probe.current?.closest("header")?.querySelector("h1");
    if (!h1) return;
    setTitle(readable(h1));
    const io = new IntersectionObserver(
      ([e]) => setShown(!!e && !e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );
    io.observe(h1);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <span ref={probe} hidden />
      {title && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={`Back to top: ${title}`}
          tabIndex={shown ? 0 : -1}
          aria-hidden={!shown}
          className={cn(
            "glass-chrome fixed top-[68px] left-1/2 z-30 flex max-w-[min(520px,calc(100vw-32px))] -translate-x-1/2 items-center gap-2 rounded-full py-1.5 pr-3 pl-4 text-13 font-[600] text-ink lg:top-4",
            "transition-[opacity,translate] duration-[var(--dur-base)] ease-[var(--ease-out)]",
            shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <span className="truncate font-display">{title}</span>
          <ArrowUp size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
        </button>
      )}
    </>
  );
}

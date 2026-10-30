"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@upsolve/ui";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fades children up the first time they scroll into view; with `stagger`, each child
 * 60 ms after the previous. Progressive: the server renders content visible, and only
 * content still below the fold is hidden (by JS, via data-reveal) until it scrolls in.
 */
export function Reveal({
  children,
  className,
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    // Not on touch screens: fading a whole section in promotes it to one big GPU layer for
    // the transition, a raster spike right as you scroll into it.
    if (
      !el ||
      reduced() ||
      window.matchMedia("(pointer: coarse)").matches ||
      el.getBoundingClientRect().top < window.innerHeight
    )
      return;
    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.dataset.reveal = "shown";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn(
        stagger
          ? cn(
              "[&>*]:transition-[opacity,transform] [&>*]:duration-[var(--dur-slower)] [&>*]:ease-[var(--ease-out)]",
              "data-[reveal=hidden]:[&>*]:translate-y-5 data-[reveal=hidden]:[&>*]:opacity-0",
              "[&>*:nth-child(2)]:delay-[60ms] [&>*:nth-child(3)]:delay-[120ms] [&>*:nth-child(4)]:delay-[180ms] [&>*:nth-child(5)]:delay-[240ms] [&>*:nth-child(6)]:delay-[300ms] [&>*:nth-child(7)]:delay-[360ms]",
            )
          : cn(
              "transition-[opacity,transform] duration-[var(--dur-slower)] ease-[var(--ease-out)]",
              "data-[reveal=hidden]:translate-y-5 data-[reveal=hidden]:opacity-0",
            ),
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Moved to the shared fx library; re-exported for the landing page. */
export { Magnetic } from "@/components/fx/pointer";

/** Shifts layers with [data-depth] a few px with the mouse; the hero scene feels 3D. */
export function Parallax({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        el.querySelectorAll<HTMLElement>("[data-depth]").forEach((layer) => {
          const d = Number(layer.dataset.depth);
          layer.style.translate = `${-x * d}px ${-y * d}px`;
        });
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Thin ink hairline showing how far down the page you are (lime is kept for the CTA).
 * A CSS scroll-driven animation where supported (runs on the compositor, no JS per frame);
 * a once-per-frame listener elsewhere.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (CSS.supports("animation-timeline: scroll()")) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current)
        ref.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="scroll-progress fixed inset-x-0 top-0 z-[60] h-px origin-left [transform:scaleX(0)] bg-ink/60"
    />
  );
}

/**
 * The landing nav: hides while you scroll down through the hero story (it would sit on
 * the laptop), comes back the moment you scroll up, and stays once you're past the hero.
 */
export function NavAutoHide({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = window.scrollY;
    let frame = 0;
    // Where the hero ends, measured on resize only (reading layout on every scroll frame
    // forces a layout pass whenever anything else changed it).
    const pin = document.querySelector<HTMLElement>("[data-hero-pin]");
    let heroEnd = 0;
    const measure = () => {
      heroEnd = pin ? pin.offsetTop + pin.offsetHeight - window.innerHeight : 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (pin) ro.observe(pin);
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const hide = y > last + 2 && y > 80 && y < heroEnd;
      const next = hide ? "true" : y < last - 2 || y <= 80 || y >= heroEnd ? "false" : null;
      if (next && el.dataset.hidden !== next) el.dataset.hidden = next;
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={cn(
        "transition-[translate,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)] data-[hidden=true]:pointer-events-none data-[hidden=true]:-translate-y-[140%] data-[hidden=true]:opacity-0 focus-within:!translate-y-0 focus-within:!opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Appears after a screen of scrolling; returns to the top. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // React only hears about it when the answer flips, not on every scroll event.
    let shown = false;
    const onScroll = () => {
      const next = window.scrollY > window.innerHeight;
      if (next !== shown) setShow((shown = next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" })}
      className={cn(
        "glass fixed right-4 bottom-4 z-50 grid size-11 place-items-center rounded-full border border-line-2 text-ink-2 shadow-md transition-[opacity,transform] duration-[var(--dur-slow)] ease-[var(--ease-out)] hover:text-ink",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp size={16} aria-hidden="true" />
    </button>
  );
}

// DsaKaro

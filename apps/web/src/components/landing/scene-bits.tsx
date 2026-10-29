"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@upsolve/ui";
import { WORDMARK } from "@upsolve/ui/brand";

// Small scroll pieces for the landing scenes (design/LANDING-V3.md). Plain listeners and
// IntersectionObservers, no animation library, so they cost little on first load.

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Calls `fn(progress)` once per frame while scrolling; progress = 0..1 through `el`. It only
 * listens while `el` is near the viewport (one last update as it leaves), so the long page
 * doesn't pay for every scene on every frame.
 */
function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  fn: (p: number) => void,
  range: (r: DOMRect, vh: number) => [number, number] = (r, vh) => [r.top, r.height - vh],
) {
  const cb = useRef(fn);
  useEffect(() => {
    cb.current = fn;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let near = false;
    const update = () => {
      frame = 0;
      const [top, len] = range(el.getBoundingClientRect(), window.innerHeight);
      cb.current(len > 0 ? Math.min(1, Math.max(0, -top / len)) : 1);
    };
    const onScroll = () => {
      if (near && !frame) frame = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        near = !!e?.isIntersecting;
        if (!frame) frame = requestAnimationFrame(update);
      },
      { rootMargin: "25% 0px" },
    );
    io.observe(el);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Pauses the CSS loops (beams, marquee, sheen, twinkle, pulses) inside every element matching
 * `selector` while it is off screen. A running loop costs a style pass per frame even
 * when nobody can see it.
 */
export function PauseOffscreen({ selector }: { selector: string }) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("paused", !e.isIntersecting);
      },
      { rootMargin: "10% 0px" },
    );
    document.querySelectorAll(selector).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selector]);
  return null;
}

/**
 * A demo that plays once when 40% of it is visible, and resets when you scroll back above
 * it. Children style their starting state with the `armed:` variant; with no JS or with
 * reduced motion nothing is armed, so the finished state shows.
 */
export function PlayOnView({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const arm = () => (el.dataset.demo = "armed");
    if (el.getBoundingClientRect().top > window.innerHeight * 0.75) arm();
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.intersectionRatio >= 0.4) delete el.dataset.demo;
        else if (!e.isIntersecting && e.boundingClientRect.top > 0) arm();
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** The timer bento: ticks for a few seconds, then the tab goes idle and it pauses. */
export function TimerDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [sec, setSec] = useState(18 * 60 + 42);
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let tick = 0;
    const stop = () => clearInterval(tick);
    const reset = () => {
      stop();
      setSec(18 * 60 + 34);
      setIdle(false);
    };
    if (el.getBoundingClientRect().top > window.innerHeight * 0.75) reset();
    let played = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.intersectionRatio >= 0.4 && !played) {
          played = true;
          setIdle(false);
          tick = window.setInterval(() => {
            setSec((s) => {
              if (s >= 18 * 60 + 42) {
                stop();
                setIdle(true);
                return s;
              }
              return s + 1;
            });
          }, 1000);
        } else if (!e.isIntersecting && e.boundingClientRect.top > 0) {
          played = false;
          reset();
        }
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, []);
  return (
    <div ref={ref} className="p-4">
      <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
        <span
          className={cn(
            "size-1.5 rounded-full transition-colors",
            idle ? "bg-ink-4" : "bg-signal shadow-[0_0_6px_var(--signal)]",
          )}
        />
        {idle ? "Paused · idle 3 min" : "Session · auto-started"}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "num mt-1 block font-mono text-[46px] leading-none tracking-[-0.05em] transition-colors",
          idle && "text-ink-3",
        )}
        suppressHydrationWarning
      >
        {mmss(sec)}
      </span>
    </div>
  );
}

/**
 * The platform marquee leans and speeds up a little with how fast you scroll (mouse and
 * trackpad only: on touch, changing a running animation's rate every frame re-syncs it with
 * the compositor and makes it stutter, so phones get the plain marquee).
 */
export function VelocityMarquee({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || matchMedia("(pointer: coarse)").matches) return;
    let last = window.scrollY;
    let lastT = performance.now();
    let v = 0;
    let frame = 0;
    let visible = false;
    let rate = 1;
    const loop = () => {
      frame = 0;
      v *= 0.9;
      const next = Math.round((1 + Math.min(3, Math.abs(v) * 2.2)) * 20) / 20;
      if (next !== rate) {
        rate = next;
        el.getAnimations({ subtree: true }).forEach((a) => (a.playbackRate = rate));
      }
      el.style.transform = `skewX(${Math.max(-5, Math.min(5, -v * 3)).toFixed(2)}deg)`;
      if (Math.abs(v) > 0.01 && visible) frame = requestAnimationFrame(loop);
      else {
        el.style.transform = "";
        if (rate !== 1) {
          rate = 1;
          el.getAnimations({ subtree: true }).forEach((a) => (a.playbackRate = 1));
        }
      }
    };
    const onScroll = () => {
      const now = performance.now();
      const dv = (window.scrollY - last) / Math.max(1, now - lastT);
      v = v * 0.6 + dv * 0.4;
      last = window.scrollY;
      lastT = now;
      if (!frame && visible) frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}

/**
 * Sticky stacked cards: each card sticks a little lower than the last; as the next card
 * slides over it, it scales down slightly and dims. Children are the cards (<li>s).
 */
export function StackCards({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  useScrollProgress(ref, () => {
    const el = ref.current;
    if (!el || reduced()) return;
    const cards = [...el.children] as HTMLElement[];
    // All reads, then all writes: interleaving them forces a style pass per card.
    const tops = cards.map((c) => c.getBoundingClientRect().top);
    const heights = cards.map((c) => c.offsetHeight);
    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;
      // 0 when the next card is a full card-height below, 1 when it has covered this one.
      const t = Math.min(1, Math.max(0, 1 - (tops[i + 1]! - tops[i]!) / heights[i]!));
      const key = t.toFixed(4);
      if (card.dataset.t !== key) {
        card.dataset.t = key;
        card.style.transform = `scale(${1 - t * 0.05})`;
        card.style.opacity = String(1 - t * 0.35);
      }
    });
  });
  return (
    <ol ref={ref} className={className}>
      {children}
    </ol>
  );
}

/**
 * The footer's giant DSA करो: its headline bar fills with lime from the left as you scroll
 * through the last viewport, the brand as a progress bar.
 */
export function WordmarkFill({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fill = useRef<SVGRectElement>(null);
  useScrollProgress(
    ref,
    (p) => {
      if (fill.current) fill.current.style.transform = `scaleX(${reduced() ? 1 : p})`;
    },
    // From the wordmark entering the viewport to the bottom of the page.
    (r, vh) => [
      r.top - vh,
      Math.max(1, document.documentElement.scrollHeight - window.scrollY - r.top),
    ],
  );
  const { bar } = WORDMARK;
  return (
    <div ref={ref} className={className}>
      <svg
        viewBox={WORDMARK.viewBox}
        role="img"
        aria-label="DSA करो"
        className="h-auto w-full text-ink"
      >
        <path d={WORDMARK.dsa} fill="currentColor" />
        <path d={WORDMARK.karo} fill="currentColor" />
        <rect {...bar} fill="currentColor" />
        <rect
          ref={fill}
          {...bar}
          fill="var(--signal-mark)"
          style={{
            transformOrigin: `${bar.x}px 0`,
            transformBox: "view-box",
            transform: "scaleX(1)",
          }}
        />
      </svg>
    </div>
  );
}

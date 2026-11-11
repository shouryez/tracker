"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, NotebookPen } from "lucide-react";
import { LevelChip, StatusBadge, cn } from "@upsolve/ui";
import { burstFrom } from "@/components/dashboard/celebrate";
import { AnimatedCheckbox, StarToggle } from "@/components/fx/toggles";
import { PlatformMark } from "@/components/site-icons";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Smooth scrolling for the landing page only (Lenis, loaded lazily). Off for reduced
 * motion and touch, where native scrolling already feels right.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (reduced() || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    let stop: (() => void) | undefined;
    void import("lenis").then(({ default: Lenis }) => {
      const lenis = new Lenis({ lerp: 0.12, anchors: { offset: -80 } });
      // The hero's step rail scrolls through Lenis so it doesn't fight the smoothing.
      (window as Window & { __lenis?: typeof lenis }).__lenis = lenis;
      const raf = (t: number) => {
        lenis.raf(t);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      stop = () => {
        lenis.destroy();
        delete (window as Window & { __lenis?: typeof lenis }).__lenis;
      };
    });
    return () => {
      cancelAnimationFrame(frame);
      stop?.();
    };
  }, []);
  return null;
}

/** Nav links with an indicator that follows the section in view. */
export function LandingNavLinks({ links }: { links: { href: string; label: string }[] }) {
  const nav = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const anchors = [...el.querySelectorAll<HTMLAnchorElement>("a[data-target]")];
    const pill = el.querySelector<HTMLElement>("[data-pill]");
    const mark = (id: string | null) => {
      const a = anchors.find((x) => x.dataset.target === id);
      anchors.forEach((x) => (x === a ? (x.dataset.active = "") : delete x.dataset.active));
      if (!pill) return;
      if (!a) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.opacity = "1";
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
      pill.style.width = `${a.offsetWidth}px`;
    };
    const io = new IntersectionObserver(
      (entries) => {
        const v = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (v) mark(v.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    anchors.forEach((a) => {
      const t = document.getElementById(a.dataset.target ?? "");
      if (t) io.observe(t);
    });
    return () => io.disconnect();
  }, []);
  return (
    <div ref={nav} className="relative hidden items-center text-[13.5px] text-ink-2 md:flex">
      <span
        data-pill
        aria-hidden="true"
        className="absolute top-1/2 left-0 h-8 -translate-y-1/2 rounded-full border border-line-2 bg-surface-3 opacity-0 transition-[transform,width,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
      />
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          data-target={l.href.slice(1)}
          className="relative rounded-full px-3.5 py-1.5 transition-colors hover:text-ink data-[active]:text-ink"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

const ROWS = [
  { t: "Largest Element", tier: "Basic", done: true },
  { t: "Second Largest Element", tier: "Basic", done: true },
  { t: "Maximum Consecutive Ones", tier: "Basic", done: false, star: true },
  { t: "Left Rotate Array by K Places", tier: "Core", done: false, revise: true },
  { t: "Move Zeros to End", tier: "Core", done: false },
];

/** Interactive mini sheet: visitors can tick rows (local state only) and watch it fill. */
export function SheetDemo() {
  const [done, setDone] = useState(() => ROWS.map((r) => r.done));
  const [stars, setStars] = useState(() => ROWS.map((r) => !!r.star));
  const base = 12;
  const total = 32;
  const count = base + done.filter(Boolean).length;
  const pct = (count / total) * 100;
  return (
    <div className="surface-card overflow-hidden rounded-[22px]">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <span className="tnum font-mono text-24 leading-none font-[600] text-ink-4">03</span>
        <span className="text-15 font-[600]">Arrays</span>
        <span className="tnum ml-auto hidden text-12 text-ink-3 sm:block">~3h left</span>
        <span className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-3">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--signal)_45%,transparent),var(--signal))] transition-[width] duration-[var(--dur-slower)] ease-[var(--ease-out)]"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="tnum font-mono text-12 text-ink-3">
          {count}/{total}
        </span>
      </div>
      <ul className="m-3 overflow-hidden rounded-[14px] border border-line bg-surface-inset">
        {ROWS.map((r, i) => (
          <li
            key={r.t}
            className="group/row relative flex items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0 hover:bg-surface-2/70"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-2 bottom-2 left-0 w-[3px] scale-y-0 rounded-r-full transition-transform group-hover/row:scale-y-100",
                r.tier === "Basic" ? "bg-easy" : "bg-medium",
              )}
            />
            <AnimatedCheckbox
              checked={done[i]!}
              aria-label={`Mark ${r.t} ${done[i] ? "not done" : "done"}`}
              onClick={(e) => {
                const next = !done[i];
                setDone((d) => d.map((x, k) => (k === i ? next : x)));
                if (next) void burstFrom(e.currentTarget);
              }}
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13.5px] font-medium",
                done[i] && "text-ink-2",
              )}
            >
              {r.t}
            </span>
            <LevelChip level={r.tier} className="hidden sm:inline-flex" />
            {r.revise && (
              <StatusBadge status="revise" className="hidden h-5 px-1.5 text-11 sm:inline-flex" />
            )}
            <span className="flex items-center text-ink-3">
              {(["tuf", "youtube", "leetcode"] as const).map((site) => (
                <span
                  key={site}
                  className="group grid size-[30px] place-items-center rounded-md transition-[background-color,transform] hover:scale-110 hover:bg-surface-2"
                >
                  <PlatformMark site={site} size={15} />
                </span>
              ))}
              <span className="hidden size-[30px] place-items-center sm:grid">
                <FileText size={14} />
              </span>
              <span className="hidden size-[30px] place-items-center sm:grid">
                <NotebookPen size={14} />
              </span>
              <StarToggle
                on={stars[i]!}
                aria-label="Star"
                className="size-[30px] rounded-md"
                onClick={() => setStars((s) => s.map((x, k) => (k === i ? !x : x)))}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="px-5 pb-4 text-12 text-ink-3">
        Try it: tick a row. (Example sheet, nothing is saved.)
      </p>
    </div>
  );
}

// DsaKaro

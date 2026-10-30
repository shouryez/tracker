"use client";

import { useEffect, useRef, useState } from "react";
import { DifficultyTag, cn } from "@upsolve/ui";

// "Revision you have to prove": a scrubbed forgetting curve (design/LANDING-V3.md).
// Without revision, memory of a solve decays fast (grey). Each proven re-solve on the
// ladder (1 → 3 → 7 → 16 → 35 → 90 days) pushes it back up and makes it decay slower.
// Illustrative curve, not user data.

const REVIEWS = [1, 3, 7, 16, 35, 90];
const MAX_DAY = 110;
const W = 1000;
const H = 340;
const PAD = { l: 44, r: 16, t: 18, b: 34 };
const xOf = (d: number) => PAD.l + (Math.log1p(d) / Math.log1p(MAX_DAY)) * (W - PAD.l - PAD.r);
const yOf = (r: number) => PAD.t + (1 - r) * (H - PAD.t - PAD.b);

function forgetPath() {
  const pts: string[] = [];
  for (let d = 0; d <= MAX_DAY; d += 0.25)
    pts.push(`${xOf(d).toFixed(1)},${yOf(Math.exp(-d / 1.6)).toFixed(1)}`);
  return `M${pts.join("L")}`;
}

function revisedPath() {
  const pts: string[] = [];
  let stability = 1.6;
  let last = 0;
  let i = 0;
  for (let d = 0; d <= MAX_DAY; d += 0.25) {
    if (i < REVIEWS.length && d >= REVIEWS[i]!) {
      const at = REVIEWS[i]!;
      pts.push(`${xOf(at).toFixed(1)},${yOf(Math.exp(-(at - last) / stability)).toFixed(1)}`);
      pts.push(`${xOf(at).toFixed(1)},${yOf(1).toFixed(1)}`);
      last = at;
      stability *= 2.6;
      i++;
    }
    pts.push(`${xOf(d).toFixed(1)},${yOf(Math.exp(-(d - last) / stability)).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

const FORGET = forgetPath();
const REVISED = revisedPath();
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Share of the chart width (0..1) where a day sits. */
const xShare = (d: number) => (xOf(d) - PAD.l) / (W - PAD.l - PAD.r);

/**
 * A curve drawn left to right without repainting: the outer box slides left (its overflow
 * clips the right side) while the inner one slides back by the same amount, so the curve
 * stays put. Both are transforms, so the reveal runs on the GPU compositor (an animated
 * clip-path repaints the chart every frame, which stutters on phones).
 */
function CurveReveal({
  ref,
  d,
  stroke,
  width,
  opacity,
}: {
  ref: React.Ref<HTMLDivElement>;
  d: string;
  stroke: string;
  width: number;
  opacity?: number;
}) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
    >
      <div className="absolute inset-0 will-change-transform">
        <svg viewBox={`0 0 ${W} ${H}`} className="size-full">
          <path
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinejoin="round"
            opacity={opacity}
          />
        </svg>
      </div>
    </div>
  );
}

export function ForgettingCurve() {
  const pin = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const grey = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(REVIEWS.length);

  useEffect(() => {
    const el = pin.current;
    const chart = box.current;
    if (!el || !chart || reduced() || document.documentElement.dataset.scene !== "on") return;
    let frame = 0;
    let shown = -1;
    let near = false;
    // The chart's box, measured on resize only. The SVG letterboxes (meet), so a viewBox x
    // maps to box px through the fitted scale and the side offset.
    let size = { w: chart.clientWidth, h: chart.clientHeight };
    const reveal = (layer: HTMLDivElement | null, t: number) => {
      const inner = layer?.firstElementChild as HTMLElement | null | undefined;
      if (!layer || !inner) return;
      const k = Math.min(size.w / W, size.h / H);
      const edge = (size.w - W * k) / 2 + k * (PAD.l + t * (W - PAD.l - PAD.r));
      const hide = t >= 1 ? 0 : Math.max(0, size.w - edge);
      layer.style.transform = `translateX(${(-hide).toFixed(1)}px)`;
      inner.style.transform = `translateX(${hide.toFixed(1)}px)`;
    };
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      // 0–.25: the grey curve decays. .25–.9: the ladder draws, pulse by pulse.
      reveal(grey.current, Math.min(1, p / 0.25));
      const t = Math.min(1, Math.max(0, (p - 0.25) / 0.65));
      reveal(sky.current, t);
      const passed = REVIEWS.filter((d) => xShare(d) <= t + 0.001).length;
      if (passed !== shown) {
        shown = passed;
        setStep(passed);
      }
    };
    const onScroll = () => {
      if (near && !frame) frame = requestAnimationFrame(update);
    };
    // Only track scrolling while the section is near the viewport.
    const io = new IntersectionObserver(
      ([e]) => {
        near = !!e?.isIntersecting;
        if (!frame) frame = requestAnimationFrame(update);
      },
      { rootMargin: "25% 0px" },
    );
    io.observe(el);
    const ro = new ResizeObserver(() => {
      size = { w: chart.clientWidth, h: chart.clientHeight };
      if (!frame) frame = requestAnimationFrame(update);
    });
    ro.observe(chart);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const at = Math.max(0, step - 1);
  const next = REVIEWS[step] ?? null;

  return (
    <section id="revision" aria-labelledby="revision-title" className="scroll-mt-24 pt-28">
      <div ref={pin} className="relative scene:h-[260vh] max-sm:scene:h-[190vh]">
        <div className="scene:sticky scene:top-0 scene:flex scene:h-svh scene:items-center scene:pt-16">
          <div className="mx-auto w-[min(1200px,100%-32px)]">
            <div className="mb-8 flex flex-col items-start gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface/70 px-[11px] py-[5px] font-mono text-[11px] leading-none font-medium tracking-[.08em] text-ink-2 uppercase">
                Revision
              </span>
              <h2
                id="revision-title"
                className="max-w-[18ch] font-display text-[clamp(34px,5vw,60px)] leading-[1] tracking-[-0.02em]"
              >
                Revision you <em>have to prove.</em>
              </h2>
              <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
                You forget a solve within days. DsaKaro brings it back at 1, 3, 7, 16, 35 and 90
                days, and it only moves up the ladder when you re-solve it without help. Need a
                hint, and it comes back sooner.
              </p>
            </div>

            <div className="surface-card rounded-[22px] p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-ink-3">
                <span className="flex items-center gap-2">
                  <i className="h-[2px] w-5 rounded-full bg-ink-3" /> without revision
                </span>
                <span className="flex items-center gap-2">
                  <i className="h-[3px] w-5 rounded-full bg-primary" /> with the ladder
                </span>
                <span className="ml-auto">example · how much you still remember</span>
              </div>
              <div ref={box} className="relative">
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="h-auto max-h-[38svh] w-full overflow-visible"
                  role="img"
                  aria-label="Example: without revision, memory of a solve drops below 10% within a week. Reviewed at 1, 3, 7, 16, 35 and 90 days, it stays high and decays more slowly each time."
                >
                  {[1, 0.5, 0].map((r) => (
                    <g key={r}>
                      <line
                        x1={PAD.l}
                        x2={W - PAD.r}
                        y1={yOf(r)}
                        y2={yOf(r)}
                        stroke="var(--line)"
                        strokeDasharray={r === 0 ? undefined : "3 5"}
                      />
                      <text
                        x={PAD.l - 8}
                        y={yOf(r) + 4}
                        textAnchor="end"
                        className="fill-ink-3 font-mono text-[11px]"
                      >
                        {r * 100}%
                      </text>
                    </g>
                  ))}
                  {[0, ...REVIEWS].map((d) => (
                    <text
                      key={d}
                      x={xOf(d)}
                      y={H - 10}
                      textAnchor="middle"
                      className="fill-ink-3 font-mono text-[11px]"
                    >
                      {d === 0 ? "solved" : `${d}d`}
                    </text>
                  ))}
                </svg>
                <CurveReveal ref={grey} d={FORGET} stroke="var(--ink-3)" width={2} opacity={0.7} />
                <CurveReveal ref={sky} d={REVISED} stroke="var(--primary)" width={3} />
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 size-full overflow-visible"
                >
                  {REVIEWS.map((d, i) => (
                    <g
                      key={d}
                      className={cn(
                        "transition-[opacity,scale] duration-500 ease-[var(--ease-spring)] [transform-box:fill-box] [transform-origin:center]",
                        i < step ? "scale-100 opacity-100" : "scale-50 opacity-0",
                      )}
                    >
                      <circle cx={xOf(d)} cy={yOf(1)} r="11" fill="var(--primary)" opacity="0.18" />
                      <circle cx={xOf(d)} cy={yOf(1)} r="5" fill="var(--primary)" />
                    </g>
                  ))}
                </svg>
              </div>

              {/* The problem card hops along the ladder as each review is passed. */}
              <div className="relative mt-4">
                <div className="grid grid-cols-6 gap-1.5">
                  {REVIEWS.map((d, i) => (
                    <span
                      key={d}
                      className={cn(
                        "grid h-8 place-items-center rounded-[9px] border font-mono text-[11.5px] transition-colors duration-300",
                        i < step
                          ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-primary-soft text-primary"
                          : "border-line text-ink-3",
                      )}
                    >
                      {d}d
                    </span>
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute top-[calc(100%+8px)] left-0 w-[calc((100%-7.5px*5)/6)] transition-[translate] duration-500 ease-[var(--ease-spring)] max-sm:hidden"
                  style={{ translate: `calc(${at * 100}% + ${at * 7.5}px) 0` }}
                >
                  <span
                    className={cn(
                      "flex w-max items-center gap-1.5 rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium shadow-e1",
                      at === 0 ? "mr-auto" : at === REVIEWS.length - 1 ? "ml-auto" : "mx-auto",
                    )}
                  >
                    Coin Change <DifficultyTag difficulty="medium" className="scale-90" />
                  </span>
                </div>
              </div>
              <p className="mt-3 font-mono text-[11.5px] text-ink-3 sm:mt-12" aria-live="off">
                {step === 0
                  ? "Solved today. Without revision, it's mostly gone in a week."
                  : next
                    ? `Re-solved on day ${REVIEWS[at]} with no help · next review: day ${next}`
                    : "Proven at 90 days. It stays in your queue only if you miss it."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// DsaKaro

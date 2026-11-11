"use client";

import {
  type CSSProperties,
  type ElementType,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { cn } from "@upsolve/ui";

export type SignalTypeHandle = {
  /** Light the sign (from off). */
  ignite: () => void;
  /** Switch it off and light it again. */
  cycle: () => void;
  /** Switch it off. */
  powerDown: () => void;
};

type Tag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type SignalTypeProps = {
  /** The text. Words wrap as whole units. */
  text?: string;
  /** Element to render; inherits font and alignment from its parent. */
  as?: Tag;
  /** Lit letter colour. Defaults to the surrounding text colour. */
  color?: string;
  /** Halo and strike-on flash colour. */
  glowColor?: string;
  /** How letters look before they light. */
  unlit?: "outline" | "dim" | "none";
  /** Unlit outline width in px. */
  outlineWidth?: number;
  /** Opacity of the unlit outline or ghost fill (0–1). */
  outlineOpacity?: number;
  /** Steady halo strength on lit letters; 0 turns it off. */
  glow?: number;
  /** Halo reach, relative to the font size. */
  glowSize?: number;
  /** Brightness of the flash as each letter strikes on; 0 turns it off. */
  flash?: number;
  /** Average false starts before a letter stays lit; 0 lights cleanly. */
  flickers?: number;
  /** Pace of the flickers. */
  speed?: number;
  /** Seconds between consecutive letters starting. */
  stagger?: number;
  /** Seconds before the first letter starts. */
  delay?: number;
  /** Order letters start in. */
  order?: "random" | "start" | "center" | "end";
  /** When the sign powers on. */
  trigger?: "view" | "mount" | "hover" | "manual";
  /** How much a passing pointer disturbs lit letters; 0 turns it off. */
  interference?: number;
  /** Pointer disturbance reach in px. */
  interferenceRadius?: number;
  /** Clicking power-cycles the sign. */
  clickCycle?: boolean;
  /** How often a lit letter briefly loses power; 0 keeps it steady. */
  instability?: number;
  /** Power-cycle again after each run. */
  loop?: boolean;
  /** Seconds between runs when looping. */
  loopDelay?: number;
  /** Changes the flicker pattern and the random start order. */
  seed?: number;
  /** Fully lit, no motion. Reduced-motion users always get this. */
  paused?: boolean;
  /**
   * Play the power-on once per browser tab session under this key; later mounts start lit
   * (still clickable). Handy for headers you see on every visit.
   */
  once?: string;
  /** Called once all letters have lit. */
  onComplete?: () => void;
  ref?: Ref<SignalTypeHandle>;
  className?: string;
  style?: CSSProperties;
};

type State = "off" | "on" | "flash" | "lit";
type Step = { at: number; s: State };

/** Small seeded PRNG (mulberry32), so a seed gives the same flicker every time. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Start rank per letter (multiplied by `stagger`). */
function ranks(n: number, order: SignalTypeProps["order"], rand: () => number) {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (order === "start") return idx;
  if (order === "end") return idx.map((i) => n - 1 - i);
  if (order === "center") return idx.map((i) => Math.abs(i - (n - 1) / 2));
  const perm = [...idx];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j]!, perm[i]!];
  }
  const out = new Array<number>(n);
  perm.forEach((letter, k) => (out[letter] = k));
  return out;
}

const pct = (v: number) => `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%`;

/**
 * A headline that flickers on like a neon sign: each letter sputters a few times, strikes on
 * with a flash and settles into a soft halo. Lit letters glitch now and then, and a passing
 * pointer can disturb them. One rAF loop flips a data attribute per letter; all the looks
 * live in CSS (globals.css, "Signal Type"), so React never re-renders while it plays.
 */
export function SignalType({
  text = "Open to possibility",
  as = "span",
  color,
  glowColor = "var(--ember)",
  unlit = "outline",
  outlineWidth = 1,
  outlineOpacity = 0.28,
  glow = 0.6,
  glowSize = 1,
  flash = 1,
  flickers = 3,
  speed = 1,
  stagger = 0.045,
  delay = 0.15,
  order = "random",
  trigger = "view",
  interference = 1,
  interferenceRadius = 90,
  clickCycle = true,
  instability = 0.3,
  loop = false,
  loopDelay = 6,
  seed = 0,
  paused = false,
  once,
  onComplete,
  ref,
  className,
  style,
}: SignalTypeProps) {
  const Root = as as ElementType;
  const rootRef = useRef<HTMLElement>(null);
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const api = useRef<(SignalTypeHandle & { hover: () => void }) | null>(null);
  const doneRef = useRef(onComplete);
  useEffect(() => {
    doneRef.current = onComplete;
  });

  const { words, count } = useMemo(() => {
    let i = 0;
    const words = text
      .split(/(\s+)/)
      .filter(Boolean)
      .map((w) =>
        /^\s+$/.test(w)
          ? { space: true as const, w }
          : { space: false as const, letters: Array.from(w, (ch) => ({ ch, i: i++ })) },
      );
    return { words, count: i };
  }, [text]);

  useImperativeHandle(
    ref,
    () => ({
      ignite: () => api.current?.ignite(),
      cycle: () => api.current?.cycle(),
      powerDown: () => api.current?.powerDown(),
    }),
    [],
  );

  // Layout effect so a sign that should start lit never paints unlit on client navigation.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const letters = els.current.slice(0, count).filter((e): e is HTMLSpanElement => !!e);
    if (!root || letters.length === 0) return;
    const set = (el: HTMLElement, s: State) => {
      if (el.dataset.s !== s) el.dataset.s = s;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduced) {
      letters.forEach((el) => set(el, "lit"));
      api.current = null;
      return;
    }
    let seen = false;
    if (once) {
      try {
        seen = !!sessionStorage.getItem(`signal-type:${once}`);
        sessionStorage.setItem(`signal-type:${once}`, "1");
      } catch {
        // No storage: just play it.
      }
    }

    const rand = prng(hash(text) ^ seed);
    const rank = ranks(letters.length, order, rand);
    const sp = Math.max(0.1, speed);
    const t0 = performance.now();
    const now = () => performance.now() - t0;
    const sched: Step[][] = letters.map(() => []);
    const ptr = letters.map(() => 0);
    const timers = new Set<number>();
    let raf = 0;
    let phase: "off" | "igniting" | "lit" = "off";
    let started = false;
    let inView = true;

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const clearTimers = () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
    const idle = (i: number) => ptr[i]! >= sched[i]!.length;
    const tick = () => {
      raf = 0;
      const t = now();
      let busy = false;
      letters.forEach((el, i) => {
        const steps = sched[i]!;
        let p = ptr[i]!;
        while (p < steps.length && steps[p]!.at <= t) set(el, steps[p++]!.s);
        ptr[i] = p;
        if (p < steps.length) busy = true;
      });
      if (busy) raf = requestAnimationFrame(tick);
      else if (phase === "igniting") {
        phase = "lit";
        doneRef.current?.();
        settle();
      }
    };
    const play = (i: number, steps: Step[]) => {
      sched[i] = steps;
      ptr[i] = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    /** A lit letter losing power for a moment; `long` stutters twice. */
    const glitch = (i: number, long: boolean) => {
      const t = now();
      play(
        i,
        long
          ? [
              { at: t, s: "off" },
              { at: t + 35 / sp, s: "on" },
              { at: t + 80 / sp, s: "off" },
              { at: t + (130 + rand() * 260) / sp, s: "lit" },
            ]
          : [
              { at: t, s: "off" },
              { at: t + (30 + rand() * 90) / sp, s: "lit" },
            ],
      );
    };

    const ignite = () => {
      clearTimers();
      phase = "igniting";
      started = true;
      const base = now() + delay * 1000;
      letters.forEach((_, i) => {
        const steps: Step[] = [{ at: now(), s: "off" }];
        let t = base + rank[i]! * stagger * 1000;
        const n = flickers > 0 ? Math.round(flickers * (0.4 + rand() * 1.2)) : 0;
        for (let k = 0; k < n; k++) {
          steps.push({ at: t, s: "on" });
          t += (25 + rand() * 70) / sp;
          steps.push({ at: t, s: "off" });
          t += (40 + rand() * 170) / sp;
        }
        if (flash > 0) {
          steps.push({ at: t, s: "flash" });
          t += 110 / sp;
        }
        steps.push({ at: t, s: "lit" });
        play(i, steps);
      });
    };

    const powerDown = () => {
      clearTimers();
      phase = "off";
      letters.forEach((_, i) => {
        const t = now() + rand() * 160;
        play(i, [
          { at: t, s: "flash" },
          { at: t + 45, s: "off" },
        ]);
      });
    };

    const cycle = () => {
      powerDown();
      later(ignite, 420);
    };

    /** Once lit: occasional glitches, and the next run if looping. */
    const settle = () => {
      if (loop) later(cycle, loopDelay * 1000);
      if (instability <= 0) return;
      const next = () =>
        later(
          () => {
            if (phase !== "lit") return;
            if (inView && !document.hidden) {
              const i = Math.floor(rand() * letters.length);
              if (idle(i)) glitch(i, rand() < 0.5);
            }
            next();
          },
          (1800 + rand() * 4200) / instability,
        );
      next();
    };

    // A passing pointer makes nearby lit letters stutter.
    let px = 0;
    let py = 0;
    let probing = false;
    const R = interferenceRadius;
    const probe = () => {
      probing = false;
      if (phase !== "lit" || !inView) return;
      const r = root.getBoundingClientRect();
      if (px < r.left - R || px > r.right + R || py < r.top - R || py > r.bottom + R) return;
      letters.forEach((el, i) => {
        if (!idle(i)) return;
        const b = el.getBoundingClientRect();
        const d = Math.hypot(px - (b.left + b.width / 2), py - (b.top + b.height / 2));
        if (d < R && rand() < interference * (1 - d / R) * 0.12) glitch(i, false);
      });
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!probing) {
        probing = true;
        requestAnimationFrame(probe);
      }
    };
    const disturb = interference > 0 && window.matchMedia("(pointer: fine)").matches;
    if (disturb) window.addEventListener("pointermove", onMove, { passive: true });

    const io = new IntersectionObserver(
      ([e]) => {
        inView = !!e?.isIntersecting;
        if (inView && trigger === "view" && !started) ignite();
      },
      { threshold: 0.35 },
    );
    io.observe(root);

    if (seen) {
      letters.forEach((el) => set(el, "lit"));
      phase = "lit";
      started = true;
      settle();
    } else {
      letters.forEach((el) => set(el, "off"));
      if (trigger === "mount") ignite();
    }

    api.current = {
      ignite,
      cycle,
      powerDown,
      hover: () => {
        if (trigger === "hover" && phase === "off" && !started) ignite();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      clearTimers();
      io.disconnect();
      if (disturb) window.removeEventListener("pointermove", onMove);
      api.current = null;
    };
  }, [
    text,
    count,
    paused,
    once,
    seed,
    order,
    speed,
    stagger,
    delay,
    flickers,
    flash,
    trigger,
    interference,
    interferenceRadius,
    instability,
    loop,
    loopDelay,
  ]);

  const halo =
    glow > 0
      ? `0 0 ${0.08 * glowSize}em color-mix(in srgb, var(--st-glow) ${pct(glow * 0.9)}, transparent), 0 0 ${0.38 * glowSize}em color-mix(in srgb, var(--st-glow) ${pct(glow * 0.55)}, transparent)`
      : "none";
  const flashShadow = `0 0 ${0.05 * glowSize}em var(--st-glow), 0 0 ${0.3 * glowSize}em var(--st-glow), 0 0 ${0.9 * glowSize}em color-mix(in srgb, var(--st-glow) ${pct(flash * 0.7)}, transparent)`;
  const vars = {
    ...(color ? { color } : null),
    "--st-glow": glowColor,
    "--st-halo": halo,
    "--st-flash": flashShadow,
    "--st-flash-fill": `color-mix(in srgb, currentColor ${pct(1 - flash * 0.45)}, var(--st-glow))`,
    "--st-off-fill":
      unlit === "dim"
        ? `color-mix(in srgb, currentColor ${pct(outlineOpacity)}, transparent)`
        : "transparent",
    "--st-off-stroke":
      unlit === "outline"
        ? `${outlineWidth}px color-mix(in srgb, currentColor ${pct(outlineOpacity)}, transparent)`
        : "0 transparent",
    ...style,
  } as CSSProperties;

  return (
    <Root
      ref={rootRef}
      className={cn(
        "signal-type",
        clickCycle && !paused && "cursor-default select-none",
        className,
      )}
      style={vars}
      onClick={clickCycle ? () => api.current?.cycle() : undefined}
      onPointerEnter={trigger === "hover" ? () => api.current?.hover() : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, wi) =>
          w.space ? (
            w.w
          ) : (
            <span key={wi} className="st-w">
              {w.letters.map(({ ch, i }) => (
                <span
                  key={i}
                  ref={(el) => {
                    els.current[i] = el;
                  }}
                  className="st-l"
                  data-s={paused ? "lit" : "off"}
                >
                  {ch}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </Root>
  );
}

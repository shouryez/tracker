"use client";

import {
  type CSSProperties,
  type ElementType,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@upsolve/ui";

export type GhostTypeHandle = {
  /** Take the current suggestion now. */
  accept: () => void;
  /** Skip to the next suggestion. */
  next: () => void;
  /** Replay from the first character. */
  restart: () => void;
};

export type GhostTypeProps = {
  /** Opening headline; types first and stays. */
  text?: string;
  /** Ghost endings, shown in turn. Start each with a space if it follows a word. */
  completions?: string[];
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span";
  textColor?: string;
  /** Caret, accept sweep and selection colour. */
  accentColor?: string;
  /** Ghost text opacity, relative to the text colour. */
  ghostOpacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  /** Where the block sits; the text inside stays left-aligned so it never shifts while typing. */
  align?: "left" | "center" | "right";
  /** ms per typed character (with natural variation). */
  typeSpeed?: number;
  /** ms between streamed ghost units (characters stream 3× faster). */
  streamSpeed?: number;
  streamBy?: "word" | "char";
  /** Wait before a suggestion appears. */
  thinkDelay?: number;
  /** How long a suggestion waits before it's accepted. */
  acceptDelay?: number;
  /** How long the accepted sentence stays before the next suggestion. */
  holdDelay?: number;
  /** How an accepted ending is removed. */
  clearStyle?: "select" | "backspace";
  caret?: "bar" | "block" | "underscore";
  caretBlink?: boolean;
  /** A key hint after the suggestion. */
  hint?: boolean;
  hintLabel?: string;
  /** Sweep the accent through an accepted ending. */
  sweep?: boolean;
  /** Cycle forever; off stops on the last accepted ending. */
  loop?: boolean;
  /** Start when scrolled into view (otherwise on mount). */
  startOnView?: boolean;
  /** Freeze while the pointer is over it, so it can be read. */
  pauseOnHover?: boolean;
  /** A click accepts the suggestion, or skips to the next one. */
  clickToAccept?: boolean;
  paused?: boolean;
  onAccept?: (completion: string, index: number) => void;
  ref?: Ref<GhostTypeHandle>;
  className?: string;
  style?: CSSProperties;
};

type Mode = "type" | "ghost" | "accepted" | "select" | "erase";
type S = { mode: Mode; typed: number; idx: number; shown: number; erased: number; run: number };

const START: S = { mode: "type", typed: 0, idx: 0, shown: 0, erased: 0, run: 0 };

/** Ghost units: whole words (with their leading space) or single characters. */
function unitsOf(c: string, by: "word" | "char") {
  return by === "word" ? (c.match(/\s*\S+\s*/g) ?? [c]) : Array.from(c);
}

/**
 * A headline that writes itself like an editor with AI completions: the opening types out,
 * a faded suggestion streams in after it with a key hint, gets accepted (the accent sweeps
 * through it), then is selected away for the next one. Space for every ending is reserved
 * up front, so nothing around it moves.
 */
export function GhostType({
  text = "Build anything",
  completions = [" with a single prompt.", " before the coffee cools.", " your users will love."],
  as = "h2",
  textColor,
  accentColor = "var(--signal)",
  ghostOpacity = 0.38,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  align = "center",
  typeSpeed = 45,
  streamSpeed = 70,
  streamBy = "word",
  thinkDelay = 600,
  acceptDelay = 1200,
  holdDelay = 1800,
  clearStyle = "select",
  caret = "bar",
  caretBlink = true,
  hint = true,
  hintLabel = "Tab",
  sweep = true,
  loop = true,
  startOnView = true,
  pauseOnHover = true,
  clickToAccept = true,
  paused = false,
  onAccept,
  ref,
  className,
  style,
}: GhostTypeProps) {
  const Root = as as ElementType;
  const rootRef = useRef<HTMLElement>(null);
  const [s, setS] = useState<S>(START);
  const [started, setStarted] = useState(!startOnView);
  const [hover, setHover] = useState(false);
  const [still, setStill] = useState(false); // reduced motion: show the first full sentence
  const acceptRef = useRef(onAccept);
  useEffect(() => {
    acceptRef.current = onAccept;
  });

  const n = completions.length;
  const c = n ? completions[s.idx % n]! : "";
  const units = unitsOf(c, streamBy);
  const last = !loop && s.idx === n - 1;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(reduce.matches);
    sync();
    reduce.addEventListener("change", sync);
    return () => reduce.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!startOnView || started) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [startOnView, started]);

  // The sequence: one timer at a time, recomputed from the current state.
  useEffect(() => {
    if (!started || still || paused || (pauseOnHover && hover) || n === 0) return;
    let next: S | null = null;
    let ms = 0;
    if (s.mode === "type") {
      if (s.typed < text.length) {
        const ch = text[s.typed];
        next = { ...s, typed: s.typed + 1 };
        // A little human: slower after punctuation, jittered otherwise.
        ms = typeSpeed * (0.55 + Math.random() * 0.9) * (/[.,]/.test(ch ?? "") ? 3 : 1);
      } else {
        next = { ...s, mode: "ghost", shown: 0 };
      }
    } else if (s.mode === "ghost") {
      if (s.shown < units.length) {
        next = { ...s, shown: s.shown + 1 };
        ms = s.shown === 0 ? thinkDelay : streamBy === "word" ? streamSpeed : streamSpeed / 3;
      } else {
        next = { ...s, mode: "accepted" };
        ms = acceptDelay;
      }
    } else if (s.mode === "accepted") {
      if (last) return;
      next =
        clearStyle === "select" ? { ...s, mode: "select" } : { ...s, mode: "erase", erased: 0 };
      ms = holdDelay;
    } else if (s.mode === "select") {
      next = { ...s, mode: "ghost", idx: (s.idx + 1) % n, shown: 0 };
      ms = 380;
    } else if (s.erased < c.length) {
      next = { ...s, erased: s.erased + 1 };
      ms = Math.max(16, typeSpeed * 0.45);
    } else {
      next = { ...s, mode: "ghost", idx: (s.idx + 1) % n, shown: 0, erased: 0 };
    }
    const t = window.setTimeout(() => setS(next), ms);
    return () => clearTimeout(t);
  }, [
    s,
    started,
    still,
    paused,
    hover,
    pauseOnHover,
    n,
    text,
    units.length,
    c.length,
    last,
    typeSpeed,
    streamSpeed,
    streamBy,
    thinkDelay,
    acceptDelay,
    holdDelay,
    clearStyle,
  ]);

  // Tell the page each time an ending is accepted.
  useEffect(() => {
    if (s.mode === "accepted" && n) acceptRef.current?.(completions[s.idx % n]!, s.idx % n);
    // Only on entering "accepted" for an index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.mode, s.idx, s.run]);

  const accept = () =>
    setS((p) =>
      p.mode === "type"
        ? { ...p, typed: text.length }
        : p.mode === "ghost"
          ? { ...p, mode: "accepted", shown: units.length }
          : { ...p, mode: "ghost", idx: (p.idx + 1) % Math.max(1, n), shown: 0, erased: 0 },
    );
  const next = () =>
    setS((p) => ({
      ...p,
      typed: text.length,
      mode: "ghost",
      idx: (p.idx + 1) % Math.max(1, n),
      shown: 0,
      erased: 0,
    }));
  const restart = () => setS((p) => ({ ...START, run: p.run + 1 }));
  useImperativeHandle(ref, () => ({ accept, next, restart }));

  // What's on screen.
  const mode = still ? "accepted" : s.mode;
  const head = still ? text : text.slice(0, s.typed);
  const real =
    mode === "accepted" || mode === "select"
      ? c
      : mode === "erase"
        ? c.slice(0, c.length - s.erased)
        : "";
  const ghost = mode === "ghost" ? units.slice(0, s.shown).join("") : "";
  const busy =
    mode === "type" ||
    mode === "erase" ||
    (mode === "ghost" && s.shown > 0 && s.shown < units.length);
  const showHint = hint && mode === "ghost" && s.shown > 0;

  const vars = {
    ...(textColor ? { color: textColor } : null),
    ...(fontFamily ? { fontFamily } : null),
    ...(fontSize ? { fontSize } : null),
    ...(fontWeight ? { fontWeight } : null),
    ...(lineHeight ? { lineHeight } : null),
    ...(letterSpacing !== undefined ? { letterSpacing: `${letterSpacing}em` } : null),
    textAlign: align,
    "--gt-accent": accentColor,
    "--gt-ghost": ghostOpacity,
    ...style,
  } as CSSProperties;

  return (
    <Root
      ref={rootRef}
      className={cn("ghost-type", clickToAccept && "cursor-pointer", className)}
      style={vars}
      onClick={clickToAccept ? accept : undefined}
      onPointerEnter={pauseOnHover ? () => setHover(true) : undefined}
      onPointerLeave={pauseOnHover ? () => setHover(false) : undefined}
    >
      <span className="sr-only">{text + (completions[0] ?? "")}</span>
      {/* Every full sentence stacked invisibly in one cell, so the box is as big as the longest. */}
      <span aria-hidden="true" className="gt-box">
        {completions.map((end, i) => (
          <span key={i} className="gt-cell invisible">
            {text}
            {end}
            {hint && <span className="gt-hint">{hintLabel}</span>}
          </span>
        ))}
        <span className="gt-cell">
          {head}
          {real && (
            <span
              key={`${s.idx}-${s.run}`}
              className={cn(
                mode === "select" && "gt-selected",
                sweep && mode === "accepted" && !still && "gt-sweep",
              )}
            >
              {real}
            </span>
          )}
          {!still && (
            <span
              className={cn("gt-caret", `gt-caret-${caret}`, caretBlink && !busy && "gt-blink")}
            />
          )}
          {ghost && <span className="gt-ghost">{ghost}</span>}
          {showHint && <span className="gt-hint">{hintLabel}</span>}
        </span>
      </span>
    </Root>
  );
}

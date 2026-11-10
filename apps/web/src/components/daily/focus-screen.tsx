"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Coffee, Minimize2, Pause, PictureInPicture2, Play, Square } from "lucide-react";
import { cn } from "@upsolve/ui";
import type { LabLive } from "@/lib/ext-bridge";
import type { ActiveFocus } from "@/lib/daily-data";
import { breakState, focusClock, focusElapsed, focusPhase, focusTotals } from "@/lib/focus";
import { ActivityLine } from "./focus-live";

const mins = (ms: number) => `${Math.round(ms / 60_000)}m`;
const TICKS = 60;

type Doc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
type El = HTMLElement & { webkitRequestFullscreen?: () => void };
const fsElement = () => document.fullscreenElement ?? (document as Doc).webkitFullscreenElement;

/**
 * Asks for real browser fullscreen. Call from the click that opens the focus screen (it
 * needs a user gesture). iPhone Safari has no element fullscreen: the screen still covers
 * the whole viewport, just with the browser bars.
 */
export function enterFullscreen() {
  const el = document.documentElement as El;
  try {
    if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {}
}
function exitFullscreen() {
  if (!fsElement()) return;
  try {
    if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
    else (document as Doc).webkitExitFullscreen?.();
  } catch {}
}

/**
 * Full-screen focus mode for a running study session: a slow ambient background, one big
 * progress wheel (pomodoro block, or the current hour on the stopwatch) and only the buttons
 * that matter. Space pauses, Esc leaves. The chrome fades out when you stop moving.
 */
export function FocusScreen({
  active,
  live,
  pending,
  onTogglePause,
  onStop,
  onClose,
  onPopout,
}: {
  active: ActiveFocus;
  /** From useLabLive in the parent: totals and the active tab. */
  live: LabLive | null;
  pending: boolean;
  onTogglePause: () => void;
  onStop: () => void;
  onClose: () => void;
  /** Float the timer over other tabs instead (when the browser can). */
  onPopout?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(0);
  const paused = active.pausedAt !== null;

  // Parents pass inline handlers; the effects below must not re-run every second for them.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const close = useCallback(() => {
    exitFullscreen();
    onCloseRef.current();
  }, []);

  // Tick while running, and on a pomodoro break (its countdown).
  const pomodoro = active.mode !== "stopwatch";
  useEffect(() => {
    if (paused && !pomodoro) return;
    // Catch up right away after a resume, then once a second.
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [paused, pomodoro]);

  // Keep the screen awake, lock page scroll, leave when the browser leaves fullscreen.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    let wasFull = Boolean(fsElement());
    const onFs = () => {
      const full = Boolean(fsElement());
      if (wasFull && !full) onCloseRef.current();
      wasFull = full;
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      void lock?.release().catch(() => {});
      document.documentElement.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  // Chrome fades after a few still seconds; any movement brings it back.
  const wake = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 3500);
  };

  // Space pauses, Esc leaves (outside browser fullscreen, where the browser handles Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      wake();
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (!pending) onTogglePause();
      } else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    idleTimer.current = window.setTimeout(() => setIdle(true), 3500);
    return () => clearTimeout(idleTimer.current);
  }, []);

  const elapsed = focusElapsed(active, paused ? active.pausedAt! : now);
  const p = focusPhase(active.mode, elapsed);
  const shown = focusTotals(active, paused || !live?.tracking ? null : live);
  const wall = new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  // A paused pomodoro is a break you took: its countdown on the wheel; it never resumes itself.
  const brk = breakState(active, now);
  const onBreak = Boolean(brk);
  // Wheel: the break, the pomodoro block, or the current hour for the stopwatch.
  const span = brk ? brk.length : p ? p.length : 60 * 60_000;
  const done = brk
    ? Math.min(brk.length, brk.length - brk.left)
    : p
      ? p.length - p.left
      : elapsed % (60 * 60_000);
  const progress = Math.min(1, done / span);
  const lit = Math.floor(progress * TICKS);
  const seconds = Math.floor(elapsed / 1000);
  // Lamplight: focus is the lamp (amber), a break is mint, paused dims to grey.
  const tone = onBreak ? "#5fd6b2" : paused ? "#9aa0ab" : "#f3b45c";
  const status = brk
    ? brk.left > 0
      ? "Break · stretch, drink water"
      : "Break over · resume when ready"
    : paused
      ? live?.autoPaused
        ? "Auto-paused"
        : "Paused"
      : p
        ? `Focus · round ${p.round}`
        : "Deep focus";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      onPointerMove={wake}
      onPointerDown={wake}
      className={cn(
        "fixed inset-0 z-[90] flex flex-col overflow-hidden bg-[#0b0c0f] text-[#eceef2] select-none",
        "animate-[focus-in_500ms_var(--ease-out)]",
        idle && "cursor-none",
      )}
      style={{ "--tone": tone } as CSSProperties}
    >
      {/* Ambient background: two slow colour fields and grain. Gradients only, no blur filter. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className={cn(
            "focus-field absolute -top-[20%] -left-[15%] size-[75vmax] rounded-full transition-opacity duration-1000",
            paused ? "opacity-30" : "opacity-100",
          )}
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--tone) 22%, transparent), transparent)",
          }}
        />
        <div
          className={cn(
            "focus-field focus-field-b absolute -right-[20%] -bottom-[25%] size-[70vmax] rounded-full transition-opacity duration-1000",
            paused ? "opacity-20" : "opacity-90",
          )}
          style={{
            background: "radial-gradient(closest-side, rgba(120, 150, 255, 0.12), transparent)",
          }}
        />
        {/* Dot field, clear in the middle so the wheel sits on a dark desk. */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.05)_1px,transparent_1.4px)] [mask-image:radial-gradient(closest-side,transparent_45%,#000_100%)] bg-[length:26px_26px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.65))]" />
        <div className="grain absolute inset-0 [--grain-opacity:.12]" />
      </div>

      {/* Top bar */}
      <div
        className={cn(
          "relative flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] transition-opacity duration-700 sm:px-8",
          idle && "opacity-0",
        )}
      >
        <span className="font-mono text-12 tracking-[.12em] text-white/50 uppercase">{wall}</span>
        <div className="flex items-center gap-2">
          {onPopout && (
            <button
              type="button"
              onClick={() => {
                exitFullscreen();
                onPopout();
              }}
              title="Float the timer over other tabs"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-13 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <PictureInPicture2 size={14} aria-hidden="true" />
              <span className="max-sm:hidden">Pop out</span>
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-13 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Minimize2 size={14} aria-hidden="true" /> Exit focus mode
          </button>
        </div>
      </div>

      {/* The wheel */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="relative aspect-square w-[min(78vw,58vh,520px)]">
          <svg viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id="focus-arc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--tone)" />
                <stop offset="1" stopColor="color-mix(in srgb, var(--tone) 55%, #ffffff)" />
              </linearGradient>
            </defs>
            {/* Minute ticks around the outside: lit up to where we are. */}
            {Array.from({ length: TICKS }, (_, i) => {
              const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
              const long = i % 5 === 0;
              const r1 = long ? 178 : 183;
              return (
                <line
                  key={i}
                  x1={200 + Math.cos(a) * r1}
                  y1={200 + Math.sin(a) * r1}
                  x2={200 + Math.cos(a) * 192}
                  y2={200 + Math.sin(a) * 192}
                  strokeWidth={long ? 3 : 2}
                  strokeLinecap="round"
                  className="transition-[stroke,opacity] duration-700"
                  style={{
                    stroke: i < lit ? "var(--tone)" : "rgba(255,255,255,.14)",
                    opacity: i < lit ? 0.95 : 1,
                  }}
                />
              );
            })}
            {/* Track + progress arc */}
            <circle
              cx="200"
              cy="200"
              r="158"
              fill="none"
              stroke="rgba(255,255,255,.06)"
              strokeWidth="12"
            />
            <circle
              cx="200"
              cy="200"
              r="158"
              fill="none"
              stroke="url(#focus-arc)"
              strokeWidth="12"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
              transform="rotate(-90 200 200)"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              style={{
                filter: "drop-shadow(0 0 10px color-mix(in srgb, var(--tone) 60%, transparent))",
              }}
            />
            {/* A bright knob where the arc has reached. */}
            {progress > 0.005 && (
              <circle
                cx={200 + Math.cos(progress * Math.PI * 2 - Math.PI / 2) * 158}
                cy={200 + Math.sin(progress * Math.PI * 2 - Math.PI / 2) * 158}
                r="10"
                fill="#fff7ea"
                stroke="var(--tone)"
                strokeWidth="4"
              />
            )}
            {/* Seconds: a small dot orbiting just inside the arc. */}
            <g
              className={cn(
                "transition-transform ease-linear",
                paused ? "duration-0" : "duration-1000",
              )}
              style={{ transform: `rotate(${seconds * 6}deg)`, transformOrigin: "200px 200px" }}
            >
              <circle cx="200" cy="62" r="4" fill="#ffffff" opacity={paused ? 0.3 : 0.85} />
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="flex items-center gap-2 font-mono text-[11px] tracking-[.18em] text-white/55 uppercase sm:text-12">
              {onBreak ? (
                <Coffee size={13} aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    paused ? "bg-medium" : "pulse-ring bg-[var(--tone)] text-[var(--tone)]",
                  )}
                />
              )}
              {status}
            </span>
            <span
              className={cn(
                "mt-2 font-mono leading-none font-[600] tabular-nums transition-opacity",
                "text-[clamp(52px,min(16vw,11vh),120px)] tracking-[-.04em]",
                paused && "animate-[focus-blink_2s_ease-in-out_infinite]",
              )}
              suppressHydrationWarning
            >
              {brk ? focusClock(Math.max(0, brk.left)) : focusClock(p ? p.left : elapsed)}
            </span>
            <span className="mt-3 text-13 text-white/45">
              {p ? `${focusClock(elapsed)} total` : `${Math.round(progress * 100)}% of this hour`}
            </span>
          </div>
        </div>

        {active.label && (
          <p className="max-w-[min(90vw,560px)] truncate text-center text-[clamp(16px,2vw,22px)] font-[550] tracking-[-0.02em] text-white/85">
            {active.label}
          </p>
        )}
        <ActivityLine
          live={live}
          paused={paused}
          className="-mt-2 max-w-[min(90vw,560px)] justify-center text-14"
        />

        {/* Pomodoro rounds, or what the extension saw. */}
        <div
          className={cn(
            "flex min-h-7 flex-wrap items-center justify-center gap-2 transition-opacity duration-700",
            idle && "opacity-40",
          )}
        >
          {p &&
            Array.from({ length: Math.max(4, p.round) }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i < p.round - 1
                    ? "w-6 bg-[#f3b45c]"
                    : i === p.round - 1
                      ? "w-10 bg-white/70"
                      : "w-6 bg-white/12",
                )}
              />
            ))}
          {shown.tracking && (
            <span className="ml-2 flex gap-3 font-mono text-12 text-white/55">
              <span>
                <span className="text-[#f3b45c]">●</span> focus {mins(shown.focusMs)}
              </span>
              <span>
                <span className="text-medium">●</span> away {mins(shown.awayMs)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        className={cn(
          "relative flex flex-col items-center gap-4 pb-[max(28px,env(safe-area-inset-bottom))] transition-opacity duration-700",
          idle && "opacity-0",
        )}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onStop}
            disabled={pending}
            aria-label="Stop and save the session"
            className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-bad/50 hover:bg-bad/15 hover:text-bad disabled:opacity-50"
          >
            <Square size={18} className="fill-current" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            disabled={pending}
            aria-label={paused ? "Resume" : "Pause"}
            className="grid size-20 place-items-center rounded-full bg-[var(--tone)] text-[#0b0b0f] shadow-[0_0_40px_-6px_var(--tone)] transition-[transform,background-color,box-shadow] duration-300 hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {paused ? (
              <Play size={28} className="translate-x-0.5 fill-current" aria-hidden="true" />
            ) : (
              <Pause size={28} className="fill-current" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Exit focus mode"
            className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Minimize2 size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="hidden font-mono text-11 tracking-[.08em] text-white/35 sm:block">
          SPACE pause · ESC exit
        </p>
      </div>
    </div>,
    document.body,
  );
}

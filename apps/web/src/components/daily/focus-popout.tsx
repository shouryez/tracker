"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Coffee, Pause, Play, Square } from "lucide-react";
import { cn } from "@upsolve/ui";
import type { ActiveFocus } from "@/lib/daily-data";
import type { LabLive } from "@/lib/ext-bridge";
import { focusClock, focusElapsed, focusPhase } from "@/lib/focus";
import { ActivityLine } from "./focus-live";

/**
 * The study timer in a small window that floats over every tab (and other apps). A slim
 * horizontal widget by default; taller windows get a stacked layout with a bigger ring,
 * narrow ones drop the ring. Rendered from this page into the pop-out window.
 */
export function FocusPopout({
  win,
  active,
  live,
  pending,
  onTogglePause,
  onStop,
}: {
  win: Window;
  active: ActiveFocus;
  live: LabLive | null;
  pending: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState(() => ({ w: win.innerWidth, h: win.innerHeight }));
  const paused = active.pausedAt !== null;

  useEffect(() => {
    if (paused) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [paused]);

  useEffect(() => {
    const onResize = () => setSize({ w: win.innerWidth, h: win.innerHeight });
    win.addEventListener("resize", onResize);
    return () => win.removeEventListener("resize", onResize);
  }, [win]);

  // Space pauses inside the pop-out too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      if (!pending) onTogglePause();
    };
    win.addEventListener("keydown", onKey);
    return () => win.removeEventListener("keydown", onKey);
  }, [win, pending, onTogglePause]);

  const elapsed = focusElapsed(active, paused ? active.pausedAt! : now);
  const p = focusPhase(active.mode, elapsed);
  const span = p ? p.length : 60 * 60_000;
  const progress = Math.min(1, (p ? p.length - p.left : elapsed % span) / span);
  const onBreak = Boolean(p && !p.working);
  const tone = paused ? "var(--medium)" : onBreak ? "var(--info)" : "var(--signal)";
  const status = paused
    ? live?.autoPaused
      ? "Auto-paused"
      : "Paused"
    : p
      ? p.working
        ? `Focus · round ${p.round}`
        : "Break"
      : "Studying";
  const time = focusClock(p ? p.left : elapsed);

  const tall = size.h >= 260 && size.w >= 240;
  const showRing = tall || size.w >= 330;
  const ringPx = tall
    ? Math.min(size.w * 0.6, size.h * 0.42, 240)
    : Math.max(64, Math.min(size.h - 40, 96));

  const ring = (
    <div className="relative shrink-0" style={{ width: ringPx, height: ringPx }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="var(--tone)"
          strokeWidth="5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
          style={{
            filter: "drop-shadow(0 0 4px color-mix(in srgb, var(--tone) 70%, transparent))",
          }}
        />
      </svg>
      {/* Pause / resume sits inside the ring. */}
      <button
        type="button"
        onClick={onTogglePause}
        disabled={pending}
        aria-label={paused ? "Resume" : "Pause"}
        className={cn(
          "absolute grid place-items-center rounded-full bg-[var(--tone)] text-[#0b0b0f] shadow-[0_0_22px_-4px_var(--tone)] transition-[transform,background-color] duration-300 hover:scale-105 active:scale-95 disabled:opacity-60",
          tall ? "inset-[30%]" : "inset-[21%]",
        )}
      >
        {paused ? (
          <Play className="size-[38%] translate-x-[6%] fill-current" aria-hidden="true" />
        ) : (
          <Pause className="size-[36%] fill-current" aria-hidden="true" />
        )}
      </button>
    </div>
  );

  const statusRow = (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] tracking-[.16em] whitespace-nowrap text-white/55 uppercase">
      {onBreak && !paused ? (
        <Coffee size={11} aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-[var(--tone)]",
            !paused && "pulse-ring text-[var(--tone)]",
          )}
        />
      )}
      {status}
    </span>
  );

  const stopBtn = (
    <button
      type="button"
      onClick={onStop}
      disabled={pending}
      aria-label="Stop and save"
      title="Stop and save"
      className="grid size-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/55 transition-colors hover:border-bad/40 hover:bg-bad/15 hover:text-bad disabled:opacity-50"
    >
      <Square size={10} className="fill-current" aria-hidden="true" />
    </button>
  );

  // What you're on (from the extension); else the session label.
  const activity =
    live?.now || live?.autoPaused ? (
      <ActivityLine live={live} paused={paused} className="min-w-0 text-[12px]" />
    ) : active.label ? (
      <p className="min-w-0 truncate text-[12px] text-white/55">{active.label}</p>
    ) : null;

  return createPortal(
    <div
      className="relative h-dvh w-full overflow-hidden bg-[#09090c] text-[#f4f4f6] select-none"
      style={{ "--tone": tone } as CSSProperties}
    >
      {/* Ambient: a soft glow of the state colour and a hairline of progress along the top. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(110% 130% at ${tall ? "50% 0%" : "0% 50%"}, color-mix(in srgb, var(--tone) 15%, transparent), transparent 60%), linear-gradient(180deg, rgba(255,255,255,.035), transparent 70%)`,
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-white/[.06]">
        <div
          className="h-full origin-left bg-[var(--tone)] shadow-[0_0_10px_var(--tone)] transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {tall ? (
        <div className="relative flex h-full flex-col items-center justify-center gap-4 px-5 py-6 text-center">
          {statusRow}
          {ring}
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "font-mono text-[clamp(32px,12vw,52px)] leading-none font-[600] tracking-[-.04em] tabular-nums",
                paused && "animate-[focus-blink_2s_ease-in-out_infinite]",
              )}
            >
              {time}
            </span>
            {p && <span className="mt-1.5 text-11 text-white/40">{focusClock(elapsed)} total</span>}
          </div>
          {active.label && (live?.now || live?.autoPaused) && (
            <p className="max-w-full truncate font-display text-[15px] text-white/75 italic">
              {active.label}
            </p>
          )}
          <div className="flex max-w-full items-center gap-3">
            {activity}
            {stopBtn}
          </div>
        </div>
      ) : (
        <div className="relative flex h-full items-center gap-3.5 px-4">
          {showRing && ring}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              {statusRow}
              {stopBtn}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-mono text-[clamp(26px,9vw,36px)] leading-none font-[600] tracking-[-.04em] tabular-nums",
                  paused && "animate-[focus-blink_2s_ease-in-out_infinite]",
                )}
              >
                {time}
              </span>
              {p && (
                <span className="truncate font-mono text-[11px] text-white/35">
                  / {focusClock(elapsed)}
                </span>
              )}
              {!showRing && (
                <button
                  type="button"
                  onClick={onTogglePause}
                  disabled={pending}
                  aria-label={paused ? "Resume" : "Pause"}
                  className="ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-[var(--tone)] text-[#0b0b0f]"
                >
                  {paused ? (
                    <Play size={13} className="fill-current" aria-hidden="true" />
                  ) : (
                    <Pause size={13} className="fill-current" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
            {activity}
          </div>
        </div>
      )}
    </div>,
    win.document.body,
  );
}

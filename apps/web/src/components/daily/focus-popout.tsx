"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, Square } from "lucide-react";
import { cn } from "@upsolve/ui";
import type { ActiveFocus } from "@/lib/daily-data";
import type { LabLive } from "@/lib/ext-bridge";
import { focusClock, focusElapsed, focusPhase } from "@/lib/focus";
import { ActivityLine } from "./focus-live";

/**
 * The study timer in a small window that floats over every tab (and other apps): ring,
 * time, what you're on, Pause and Stop. Rendered from this page into the pop-out window.
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

  const elapsed = focusElapsed(active, paused ? active.pausedAt! : now);
  const p = focusPhase(active.mode, elapsed);
  const span = p ? p.length : 60 * 60_000;
  const progress = Math.min(1, (p ? p.length - p.left : elapsed % span) / span);
  const tone = paused ? "var(--medium)" : p && !p.working ? "var(--info)" : "var(--signal)";
  const status = paused
    ? live?.autoPaused
      ? "Auto-paused"
      : "Paused"
    : p
      ? p.working
        ? `Focus · round ${p.round}`
        : "Break"
      : "Studying";

  return createPortal(
    <div
      className="relative flex h-dvh flex-col items-center justify-between overflow-hidden bg-[#060607] px-4 pt-4 pb-4 text-[#f4f4f6] select-none"
      style={{ "--tone": tone } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="focus-field pointer-events-none absolute -top-1/3 -left-1/3 size-[140%] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--tone) 18%, transparent), transparent)",
        }}
      />
      <div className="relative flex w-full items-center justify-between font-mono text-[10.5px] tracking-[.14em] text-white/50 uppercase">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              paused ? "bg-medium" : "pulse-ring bg-[var(--tone)] text-[var(--tone)]",
            )}
          />
          {status}
        </span>
        <span>DsaKaro</span>
      </div>

      <div className="relative aspect-square w-[min(62vw,46vh)]">
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="rgba(255,255,255,.07)"
            strokeWidth="9"
          />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="var(--tone)"
            strokeWidth="9"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
            transform="rotate(-90 100 100)"
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            style={{
              filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--tone) 55%, transparent))",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono text-[clamp(30px,13vw,46px)] leading-none font-[600] tracking-[-.04em] tabular-nums",
              paused && "animate-[focus-blink_2s_ease-in-out_infinite]",
            )}
          >
            {focusClock(p ? p.left : elapsed)}
          </span>
          {p && <span className="mt-1.5 text-11 text-white/45">{focusClock(elapsed)} total</span>}
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center gap-3">
        {active.label && (
          <p className="max-w-full truncate font-display text-15 text-white/80 italic">
            {active.label}
          </p>
        )}
        <ActivityLine live={live} paused={paused} className="max-w-full text-12" />
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onStop}
            disabled={pending}
            aria-label="Stop and save"
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-bad/15 hover:text-bad disabled:opacity-50"
          >
            <Square size={14} className="fill-current" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            disabled={pending}
            aria-label={paused ? "Resume" : "Pause"}
            className="grid size-13 place-items-center rounded-full bg-[var(--tone)] text-[#0b0b0f] shadow-[0_0_24px_-6px_var(--tone)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {paused ? (
              <Play size={20} className="translate-x-px fill-current" aria-hidden="true" />
            ) : (
              <Pause size={20} className="fill-current" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>,
    win.document.body,
  );
}

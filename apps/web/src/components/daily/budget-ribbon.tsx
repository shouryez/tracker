"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@upsolve/ui";
import { feel } from "@/lib/feel";

const SNAP = 15;
export const fmtMin = (m: number) =>
  m < 60 ? `${m} min` : `${m % 60 ? (m / 60).toFixed(1) : m / 60} h`;

/**
 * The time budget as a ribbon you drag (FRONTEND-PLAN §8 Today 3): snaps every 15 minutes,
 * shows where each remaining item ends, and the "these can wait" line on the list moves as
 * you drag. Keyboard: arrows ±15 min, Home/End, Delete for no limit.
 */
export function BudgetRibbon({
  budget,
  onChange,
  ends,
  leftMin,
}: {
  budget: number | null;
  onChange: (v: number | null) => void;
  /** Cumulative minutes at which each remaining item finishes, in list order. */
  ends: number[];
  leftMin: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const max = Math.min(480, Math.max(240, Math.ceil((leftMin + 30) / 60) * 60));
  const pct = (m: number) => `${(Math.min(m, max) / max) * 100}%`;
  const fits = budget ? ends.filter((e) => e <= budget).length : ends.length;
  const last = useRef(budget);

  const set = (v: number | null) => {
    if (v === last.current) return;
    last.current = v;
    feel.tick();
    onChange(v);
  };
  const fromX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const raw = ((clientX - r.left) / r.width) * max;
    return Math.min(max, Math.max(SNAP, Math.round(raw / SNAP) * SNAP));
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    set(fromX(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) set(fromX(e.clientX));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = budget ?? max;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? Math.min(max, v + SNAP)
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? Math.max(SNAP, v - SNAP)
          : e.key === "Home"
            ? SNAP
            : e.key === "End"
              ? max
              : e.key === "Delete" || e.key === "Backspace"
                ? null
                : undefined;
    if (next === undefined) return;
    e.preventDefault();
    set(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-12 text-ink-3">
        <span>
          About <span className="tnum font-[600] text-ink-2">{fmtMin(leftMin)}</span> left.{" "}
          {budget ? (
            <>
              <span className="tnum font-[600] text-signal-text">{fmtMin(budget)}</span> today fits{" "}
              {fits} of {ends.length}.
            </>
          ) : (
            "Drag to set how much time you have today."
          )}
        </span>
        {budget && (
          <button
            type="button"
            onClick={() => set(null)}
            className="font-[600] text-ink-3 underline-offset-4 hover:text-ink hover:underline"
          >
            No limit
          </button>
        )}
      </div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Time you have today"
        aria-valuemin={SNAP}
        aria-valuemax={max}
        aria-valuenow={budget ?? max}
        aria-valuetext={budget ? `${fmtMin(budget)}, fits ${fits} of ${ends.length}` : "No limit"}
        data-cursor="grab"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onKeyDown={onKey}
        className="group/rib relative h-8 cursor-pointer touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--signal-mark)]"
      >
        {/* Rail, fill and hour marks */}
        <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
        <span
          className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--signal-mark)_55%,transparent),var(--signal-mark))] transition-[width] duration-150 ease-out"
          style={{ width: budget ? pct(budget) : "0%" }}
        />
        {Array.from({ length: Math.floor(max / 60) - 1 }, (_, k) => (
          <span
            key={k}
            aria-hidden="true"
            className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-[color-mix(in_srgb,var(--ink)_14%,transparent)]"
            style={{ left: pct((k + 1) * 60) }}
          />
        ))}
        {/* Where each remaining item ends */}
        {ends.map((m, k) => (
          <span
            key={k}
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors",
              budget && m <= budget ? "bg-signal-ink" : "bg-ink-3",
            )}
            style={{ left: pct(m) }}
          />
        ))}
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-e2 transition-[left,background-color] duration-150 ease-out group-active/rib:scale-110",
            budget
              ? "bg-[var(--signal-mark)]"
              : "bg-surface-3 shadow-[inset_0_0_0_1px_var(--line-3)]",
          )}
          style={{ left: budget ? pct(budget) : "100%" }}
        />
      </div>
      <div className="tnum flex justify-between text-11 text-ink-4" aria-hidden="true">
        <span>0</span>
        {Array.from({ length: Math.floor(max / 60) }, (_, k) => (
          <span key={k}>{k + 1}h</span>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Play, X } from "lucide-react";
import { Button, cn } from "@upsolve/ui";
import { feel, reducedMotion } from "@/lib/feel";
import { WRAPPED_TONE, type WrappedCard } from "@/lib/wrapped";

const STEP_MS = 5200;

/**
 * Weekly Wrapped as stories (FRONTEND-PLAN §9.2): full screen, progress segments on top,
 * tap the right or left half (or arrow keys) to move, hold to pause, Esc to close. Each card
 * can be saved as an image, drawn on the server from your own data.
 */
export function WrappedStories({ cards }: { cards: WrappedCard[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="signal"
        onClick={() => {
          feel.tick();
          setOpen(true);
        }}
      >
        <Play size={14} aria-hidden="true" className="fill-current" /> Play your week
      </Button>
      {open && <Player cards={cards} onClose={() => setOpen(false)} />}
    </>
  );
}

function Player({ cards, onClose }: { cards: WrappedCard[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [t, setT] = useState(0);
  const card = cards[i]!;
  const tone = WRAPPED_TONE[card.tone];
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  const go = useCallback(
    (d: number) => {
      setT(0);
      setI((n) => {
        const next = n + d;
        if (next >= cards.length) {
          close.current();
          return n;
        }
        if (next !== n && next >= 0) feel.tick();
        return Math.max(0, next);
      });
    },
    [cards.length],
  );

  // Auto-advance (paused while held; off for reduced motion, where you tap through).
  useEffect(() => {
    if (held || reducedMotion()) return;
    const start = performance.now() - t;
    let raf = 0;
    const frame = () => {
      const e = performance.now() - start;
      if (e >= STEP_MS) go(1);
      else {
        setT(e);
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, held, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close.current();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, [go]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Your week, card ${i + 1} of ${cards.length}`}
      className="fixed inset-0 z-[95] grid place-items-center bg-[#07070a]/92 backdrop-blur-md"
    >
      <div
        className="relative flex h-[min(760px,100dvh)] w-[min(430px,100vw)] flex-col overflow-hidden text-white sm:rounded-[28px]"
        style={{
          background: `radial-gradient(120% 70% at 20% 0%, color-mix(in srgb, ${tone} 38%, #111114), #0a0a0d 72%)`,
          transition: "background 600ms ease",
        }}
      >
        <div className="grain pointer-events-none absolute inset-0 [--grain-opacity:.1]" />
        {/* Progress segments */}
        <div className="relative z-10 flex gap-1 px-4 pt-[max(14px,env(safe-area-inset-top))]">
          {cards.map((c, k) => (
            <span key={c.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full rounded-full bg-white"
                style={{ width: k < i ? "100%" : k === i ? `${(t / STEP_MS) * 100}%` : "0%" }}
              />
            </span>
          ))}
        </div>
        <div className="relative z-10 flex items-center justify-between px-4 pt-3">
          <span className="text-12 font-[600] text-white/70">DSA करो · your week</span>
          <button
            type="button"
            onClick={() => close.current()}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Tap zones: left half back, right half forward; hold to pause. */}
        <div
          className="absolute inset-0 z-0 grid grid-cols-[1fr_2fr]"
          onPointerDown={() => setHeld(true)}
          onPointerUp={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
        >
          <button
            type="button"
            aria-label="Previous card"
            onClick={() => go(-1)}
            className="outline-none"
          />
          <button
            type="button"
            aria-label="Next card"
            onClick={() => go(1)}
            className="outline-none"
          />
        </div>

        <div
          key={card.id}
          className="pointer-events-none relative z-[1] flex flex-1 flex-col justify-center gap-4 px-7 animate-[blur-in_520ms_var(--ease-out)]"
        >
          <p className="text-14 font-[650] tracking-[.02em]" style={{ color: tone }}>
            {card.kicker}
          </p>
          <p
            className={cn(
              "font-display leading-[.95] font-[700] tracking-[-0.05em] break-words",
              card.big.length > 14
                ? "text-[44px]"
                : card.big.length > 6
                  ? "text-[64px]"
                  : "text-[112px]",
            )}
          >
            {card.big}
            {card.unit && (
              <span className="mt-2 block text-[26px] font-[600] tracking-[-0.02em] text-white/70">
                {card.unit}
              </span>
            )}
          </p>
          <p className="max-w-[30ch] text-17 leading-snug text-white/80">{card.line}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-2 px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <a
            href={`/api/wrapped-card?card=${card.id}`}
            download={`dsakaro-week-${card.id}.png`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-4 text-13 font-[600] text-white hover:bg-white/20"
          >
            <Download size={14} aria-hidden="true" /> Save card
          </a>
          {card.href && (
            <Link
              href={card.href}
              onClick={() => close.current()}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-13 font-[650] text-[#111]"
            >
              {card.cta ?? "Open"}
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

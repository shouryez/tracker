"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "../cn";

/*
 * Background textures. All are decorative (aria-hidden), absolutely positioned and
 * pointer-events-none: drop one inside a `relative overflow-hidden` parent.
 */

type LayerProps = { className?: string; style?: CSSProperties };

/** Static film grain. */
export function Grain({ className, style }: LayerProps) {
  return (
    <div aria-hidden="true" className={cn("grain absolute inset-0", className)} style={style} />
  );
}

/** Faint dot grid, fading to the edges. */
export function DotGrid({ className, style }: LayerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("dot-grid pointer-events-none absolute inset-0", className)}
      style={style}
    />
  );
}

/** A single soft blurred light. Tint with `color` (any CSS colour or var). */
export function GlowOrb({
  className,
  color = "var(--glow-a)",
  size = 480,
  style,
}: LayerProps & { color?: string; size?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute rounded-full blur-[110px]", className)}
      style={{ width: size, height: size, background: color, ...style }}
    />
  );
}

/**
 * Pauses CSS animations inside `ref` while it is off-screen or the tab is hidden,
 * by toggling the `paused` utility on the node (no React state, no re-render).
 */
export function usePauseOffscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = true;
    const apply = () => el.classList.toggle("paused", !visible || document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      apply();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);
  return ref;
}

/** Twinkling starfield. Meant for dark stages (landing hero, login panel, 404). */
export function Starfield({ className, style }: LayerProps) {
  const ref = usePauseOffscreen<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("starfield pointer-events-none absolute inset-0", className)}
      style={style}
    />
  );
}

/**
 * Slow mesh-gradient aurora: three blurred lights drifting on an 18 s loop.
 * GPU-cheap (transform only), paused off-screen, static under reduced motion.
 */
export function Aurora({ className, style }: LayerProps) {
  const ref = usePauseOffscreen<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={style}
    >
      <i className="absolute -top-1/4 -left-1/6 h-[70%] w-[60%] animate-aurora rounded-full bg-[var(--aurora-1)] blur-[100px]" />
      <i className="absolute top-[10%] right-[-10%] h-[60%] w-[55%] animate-aurora rounded-full bg-[var(--aurora-2)] blur-[110px] [animation-delay:-6s] [animation-direction:alternate-reverse]" />
      <i className="absolute bottom-[-30%] left-[25%] h-[60%] w-[50%] animate-aurora rounded-full bg-[var(--aurora-3)] blur-[120px] [animation-delay:-12s]" />
    </div>
  );
}

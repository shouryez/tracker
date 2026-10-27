"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@upsolve/ui";

const fine = () =>
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  window.matchMedia("(pointer: fine)").matches;

/**
 * Subtle 3D tilt (max `max` degrees) with a moving glare. Children marked
 * [data-tilt-layer] float forward for parallax. Off on touch and reduced motion.
 */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !fine()) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg)`;
        el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
        el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
        el.dataset.tilting = "";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = "";
      delete el.dataset.tilting;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [max]);
  return (
    <div
      ref={ref}
      className={cn(
        "group/tilt relative transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] [transform-style:preserve-3d] data-[tilting]:duration-[var(--dur-instant)]",
        "[&_[data-tilt-layer]]:transition-transform [&_[data-tilt-layer]]:duration-[var(--dur-slow)] data-[tilting]:[&_[data-tilt-layer]]:[transform:translateZ(24px)]",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-[var(--dur-slow)] group-data-[tilting]/tilt:opacity-100 bg-[radial-gradient(circle_at_var(--gx,50%)_var(--gy,50%),rgba(255,255,255,.16),transparent_55%)]"
      />
    </div>
  );
}

/**
 * Magnetic hover for hero CTAs: the element drifts toward the cursor (≤ `strength` px)
 * and an inner [data-magnetic-label] moves at half speed; springs back on leave.
 */
export function Magnetic({
  children,
  strength = 12,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !fine()) return;
    const label = () => el.querySelector<HTMLElement>("[data-magnetic-label]");
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - (r.left + r.width / 2)) / r.width) * strength * 2;
      const y = ((e.clientY - (r.top + r.height / 2)) / r.height) * strength * 2;
      const cx = Math.max(-strength, Math.min(strength, x));
      const cy = Math.max(-strength, Math.min(strength, y));
      el.style.transform = `translate(${cx}px, ${cy}px)`;
      const l = label();
      if (l) l.style.transform = `translate(${cx / 2}px, ${cy / 2}px)`;
    };
    const leave = () => {
      el.style.transform = "";
      const l = label();
      if (l) l.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [strength]);
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)] [&_[data-magnetic-label]]:transition-transform [&_[data-magnetic-label]]:duration-[var(--dur-slow)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Soft violet light that follows the cursor over its parent (landing only). */
export function CursorGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent || !fine()) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = parent.getBoundingClientRect();
        el.style.transform = `translate(${e.clientX - r.left - 300}px, ${e.clientY - r.top - 300}px)`;
        el.style.opacity = "1";
      });
    };
    const leave = () => (el.style.opacity = "0");
    parent.addEventListener("pointermove", move);
    parent.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerleave", leave);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-0 left-0 size-[600px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--violet)_22%,transparent),transparent_60%)] opacity-0 transition-opacity duration-[var(--dur-slow)]",
        className,
      )}
    />
  );
}

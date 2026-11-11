"use client";

import { useEffect, useRef } from "react";
import { reducedMotion } from "@/lib/feel";

/**
 * A calm dot grid that brightens around the pointer (FRONTEND-PLAN §8 Login 3). Draws only
 * while the pointer moves near it; static (faint) for touch and reduced motion. Ink only.
 */
export function DotField({
  gap = 22,
  radius = 150,
  className,
}: {
  gap?: number;
  radius?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const host = canvas.parentElement!;
    let w = 0;
    let h = 0;
    let px = -1e4;
    let py = -1e4;
    let glow = 0;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ink = () =>
      getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#f3f1ec";

    const draw = () => {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink();
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const d = Math.hypot(x - px, y - py);
          const k = Math.max(0, 1 - d / radius) * glow;
          ctx.globalAlpha = 0.09 + k * 0.6;
          const r = 1 + k * 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    const size = () => {
      const r = host.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);
    if (reducedMotion() || !window.matchMedia("(pointer: fine)").matches)
      return () => ro.disconnect();

    let fade = 0;
    const tick = () => {
      draw();
      if (glow > 0.01 && fade) {
        glow *= 0.92;
        raf = requestAnimationFrame(tick);
      }
    };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      glow = 1;
      fade = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const onLeave = () => {
      fade = 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [gap, radius]);
  return <canvas ref={ref} aria-hidden="true" className={className} />;
}

/**
 * The 404 easter egg (FRONTEND-PLAN §8 404): after two idle seconds, the pointer leaves a
 * soft trail of mint and ember ink that fades. Desktop only, never for reduced motion.
 */
export function InkTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const parts: { x: number; y: number; vx: number; vy: number; life: number; hue: string }[] = [];
    let raf = 0;
    let armed = false;
    const arm = window.setTimeout(() => (armed = true), 2000);
    const size = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const frame = () => {
      raf = 0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = "lighter";
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!;
        p.life -= 0.022;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        const r = 18 * (1 - p.life) + 4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `${p.hue}${(p.life * 0.35).toFixed(3)})`);
        g.addColorStop(1, `${p.hue}0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (parts.length) raf = requestAnimationFrame(frame);
    };
    let lx = 0;
    let ly = 0;
    const onMove = (e: PointerEvent) => {
      if (!armed) return;
      const vx = (e.clientX - lx) * 0.15;
      const vy = (e.clientY - ly) * 0.15;
      lx = e.clientX;
      ly = e.clientY;
      for (let i = 0; i < 2; i++)
        parts.push({
          x: e.clientX,
          y: e.clientY,
          vx: vx + (Math.random() - 0.5),
          vy: vy + (Math.random() - 0.5),
          life: 1,
          hue: Math.random() < 0.6 ? "rgba(134,217,194," : "rgba(240,136,79,",
        });
      if (parts.length > 260) parts.splice(0, parts.length - 260);
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", size);
    return () => {
      clearTimeout(arm);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", size);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 size-full"
    />
  );
}

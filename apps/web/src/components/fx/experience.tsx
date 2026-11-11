"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { SERVER_FEEL, getFeel, reducedMotion, subscribeFeel } from "@/lib/feel";

/**
 * Site-wide feel, mounted once in the root layout (FRONTEND-PLAN §0.2–0.3):
 * - the halo cursor (desktop, fine pointer, on by default; Settings → Feel → Cursor);
 * - click sparks on the primary (ember, `.gloss`) action;
 * - tilt and glare on anything marked `data-tilt` (sheet covers, holo cards).
 * Both stay out of the way: no layout work per frame, paused when the tab is hidden, and off
 * for reduced motion. The system cursor is never hidden.
 */
export function Experience() {
  const prefs = useSyncExternalStore(subscribeFeel, getFeel, () => SERVER_FEEL);
  return (
    <>
      {prefs.cursor === "halo" && <HaloCursor />}
      <ClickSparks />
      <TiltGlare />
    </>
  );
}

/* ------------------------------------------------------------------ halo */

type Mode = "default" | "button" | "open" | "crosshair" | "grab" | "text" | "disabled";

const TEXT =
  "input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable=''], [contenteditable='true']";
const CLICKABLE =
  "button, [role=button], a[href], [role=tab], [role=switch], [role=menuitem], [role=option], [role=radio], label[for], summary";

/** What the pointer is over, and the element the halo should wrap (for buttons). */
function read(target: Element | null): { mode: Mode; el: Element | null; label: string | null } {
  if (!target) return { mode: "default", el: null, label: null };
  const explicit = target.closest<HTMLElement>("[data-cursor]");
  if (explicit) {
    const m = explicit.dataset.cursor as Mode;
    return { mode: m, el: explicit, label: explicit.dataset.cursorLabel ?? null };
  }
  if (target.closest(TEXT)) return { mode: "text", el: null, label: null };
  const off = target.closest("button:disabled, [aria-disabled=true]");
  if (off) return { mode: "disabled", el: off, label: null };
  const hit = target.closest(CLICKABLE);
  if (hit) {
    const r = hit.getBoundingClientRect();
    // Big clickable blocks (cards, rows) get the small "open" dot instead of a wrap.
    if (r.width * r.height > 48_000 || r.width > 520) return { mode: "open", el: hit, label: null };
    return { mode: "button", el: hit, label: null };
  }
  return { mode: "default", el: null, label: null };
}

function HaloCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches || reducedMotion()) return;
    const el = ring.current!;
    const label = tag.current!;

    // Pointer, current drawn box, and target box: we ease the drawn box towards the target.
    const p = { x: -100, y: -100, vx: 0, vy: 0 };
    const box = { x: -100, y: -100, w: 28, h: 28, r: 14, o: 0 };
    let goal = { x: -100, y: -100, w: 28, h: 28, r: 14, o: 0 };
    let state = read(null);
    let down = false;
    let raf = 0;
    let lastMove = 0;

    const radiusOf = (t: Element) => {
      const v = parseFloat(getComputedStyle(t).borderTopLeftRadius) || 10;
      return Math.min(v + 4, 999);
    };

    const aim = () => {
      const { mode, el: t } = state;
      el.dataset.mode = mode;
      if (mode === "button" && t) {
        const r = t.getBoundingClientRect();
        const pad = 5;
        // A little magnetic pull towards the pointer.
        const cx = r.left + r.width / 2 + (p.x - (r.left + r.width / 2)) * 0.1;
        const cy = r.top + r.height / 2 + (p.y - (r.top + r.height / 2)) * 0.1;
        goal = { x: cx, y: cy, w: r.width + pad * 2, h: r.height + pad * 2, r: radiusOf(t), o: 1 };
      } else if (mode === "open") {
        goal = { x: p.x, y: p.y, w: 8, h: 8, r: 4, o: 1 };
      } else if (mode === "crosshair") {
        goal = { x: p.x, y: p.y, w: 6, h: 6, r: 3, o: 1 };
      } else if (mode === "grab") {
        const s = Math.min(1.6, Math.hypot(p.vx, p.vy) / 18);
        goal = { x: p.x, y: p.y, w: 40 + s * 18, h: 40 - s * 8, r: 24, o: 1 };
      } else if (mode === "text") {
        goal = { ...goal, x: p.x, y: p.y, w: 10, h: 10, r: 5, o: 0 };
      } else if (mode === "disabled") {
        goal = { x: p.x, y: p.y, w: 20, h: 20, r: 10, o: 0.45 };
      } else {
        goal = { x: p.x, y: p.y, w: 28, h: 28, r: 14, o: 1 };
      }
      // The label pill: an explicit label, "Open" for big links.
      const text = state.label ?? (mode === "open" ? "Open ↗" : null);
      if (text && mode !== "text") {
        if (label.textContent !== text) label.textContent = text;
        label.style.opacity = "1";
      } else label.style.opacity = "0";
    };

    const frame = () => {
      raf = 0;
      aim();
      const k = state.mode === "button" ? 0.28 : 0.34;
      let moving = false;
      for (const key of ["x", "y", "w", "h", "r", "o"] as const) {
        const d = goal[key] - box[key];
        if (Math.abs(d) > 0.05) moving = true;
        box[key] += d * (key === "o" ? 0.2 : k);
      }
      const angle = state.mode === "grab" ? Math.atan2(p.vy, p.vx) : 0;
      const press = down ? 0.9 : 1;
      el.style.width = `${box.w}px`;
      el.style.height = `${box.h}px`;
      el.style.borderRadius = `${box.r}px`;
      el.style.opacity = String(box.o);
      el.style.transform = `translate3d(${box.x - box.w / 2}px, ${box.y - box.h / 2}px, 0) rotate(${angle}rad) scale(${press})`;
      label.style.transform = `translate3d(${p.x + 14}px, ${p.y + 14}px, 0)`;
      // Velocity decays when the pointer rests.
      p.vx *= 0.8;
      p.vy *= 0.8;
      if (moving || performance.now() - lastMove < 120) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      p.vx = e.clientX - p.x;
      p.vy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      lastMove = performance.now();
      if (box.x < -50) {
        // First move: appear where the pointer is, no fly-in from the corner.
        box.x = p.x;
        box.y = p.y;
      }
      state = read(e.target as Element);
      kick();
    };
    const onDown = () => {
      down = true;
      kick();
    };
    const onUp = () => {
      down = false;
      kick();
    };
    const onLeave = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        goal.o = 0;
        state = { mode: "text", el: null, label: null };
        kick();
      }
    };
    // Scrolling moves things under a still pointer: re-read what's there.
    const onScroll = () => {
      state = read(document.elementFromPoint(p.x, p.y));
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerout", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <div ref={ring} aria-hidden="true" className="halo" data-mode="default" />
      <div ref={tag} aria-hidden="true" className="halo-label" />
    </>
  );
}

/* ---------------------------------------------------------------- sparks */

/** Short ember strokes burst from a click on the primary action. Opt out with data-spark="off". */
function ClickSparks() {
  useEffect(() => {
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    const sparks: { x: number; y: number; a: number; t0: number }[] = [];
    let raf = 0;

    const ensure = () => {
      if (canvas) return;
      canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9998";
      document.body.appendChild(canvas);
      ctx = canvas.getContext("2d");
    };
    const size = () => {
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = () => {
      raf = 0;
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const now = performance.now();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        const t = (now - s.t0) / 380;
        if (t >= 1) {
          sparks.splice(i, 1);
          continue;
        }
        const e = 1 - (1 - t) ** 3;
        const r0 = 18 + e * 30;
        const r1 = r0 + 13 * (1 - t);
        ctx.strokeStyle = `rgba(246, 163, 116, ${1 - t})`;
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(s.a) * r0, s.y + Math.sin(s.a) * r0);
        ctx.lineTo(s.x + Math.cos(s.a) * r1, s.y + Math.sin(s.a) * r1);
        ctx.stroke();
      }
      if (sparks.length) raf = requestAnimationFrame(draw);
    };
    const onClick = (e: MouseEvent) => {
      const hit = (e.target as Element | null)?.closest(".gloss");
      if (!hit || (hit as HTMLElement).dataset.spark === "off" || reducedMotion()) return;
      ensure();
      size();
      const now = performance.now();
      const n = 8;
      const rot = Math.random() * Math.PI;
      for (let i = 0; i < n; i++)
        sparks.push({ x: e.clientX, y: e.clientY, a: rot + (i / n) * Math.PI * 2, t0: now });
      if (!raf) raf = requestAnimationFrame(draw);
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", size);
      canvas?.remove();
    };
  }, []);
  return null;
}

/* ------------------------------------------------------------ tilt glare */

/**
 * One listener for every `[data-tilt]` element: it leans towards the pointer (max degrees
 * from the attribute's value, default 8) and exposes --gx/--gy (0–100%) for a glare layer,
 * with `data-tilting` set while active. Fine pointers only; off for reduced motion.
 */
function TiltGlare() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || reducedMotion()) return;
    let active: HTMLElement | null = null;
    let frame = 0;
    const reset = (el: HTMLElement) => {
      el.style.transform = "";
      delete el.dataset.tilting;
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (active && active !== el) reset(active);
      active = el;
      if (!el) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (clientX - r.left) / r.width - 0.5;
        const y = (clientY - r.top) / r.height - 0.5;
        const max = Number(el.dataset.tilt) || 8;
        el.style.transform = `perspective(800px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-4px)`;
        el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
        el.dataset.tilting = "";
      });
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget && active) {
        reset(active);
        active = null;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);
  return null;
}

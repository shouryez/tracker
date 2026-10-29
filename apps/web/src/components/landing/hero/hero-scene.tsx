"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, useSpring } from "motion/react";
import { cn } from "@upsolve/ui";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Laptop } from "./laptop";
import {
  BEATS,
  CAMERA,
  MOMENTS,
  RAIL,
  RIG,
  clock,
  easeInOut,
  easeOut,
  lerp,
  sameState,
  seg,
  stateAt,
  timerAt,
  type SceneState,
} from "./scene";
import { ScreenDashboard } from "./screen-dashboard";
import { ScreenProblem } from "./screen-problem";

type Box = { x: number; y: number; w: number; h: number };
type Geo = {
  vw: number;
  vh: number;
  phone: boolean;
  /** Rig scale that fits the laptop in the viewport. */
  k: number;
  /** Screen rect at the pre-push pose (camera k·dolly, no translation), stage-relative. */
  screen?: Box;
  /** The hand-off frame target, stage-relative. */
  frame?: Box;
  /** Pixel flight endpoints and sizes, in the screen's own (untransformed) px. */
  flight?: { ax: number; ay: number; bx: number; by: number; size: number };
};

const INITIAL = stateAt(0);

type Prop = "transform" | "opacity" | "visibility" | "clipPath";
/**
 * Last value written per node and property. Unchanged values are skipped, so a frame only
 * invalidates (and repaints) what actually moved: on phones a needless write inside the
 * screen repaints the whole screen.
 */
const written = new WeakMap<HTMLElement, Partial<Record<Prop, string>>>();
function put(el: HTMLElement | null | undefined, prop: Prop, v: string) {
  if (!el) return;
  let w = written.get(el);
  if (!w) written.set(el, (w = {}));
  if (w[prop] === v) return;
  w[prop] = v;
  el.style[prop] = v;
}
const o = (n: number) => n.toFixed(3);
const px = (n: number) => n.toFixed(2);

const PARTS = [
  "persp",
  "rig",
  "lid",
  "base",
  "edge",
  "lid-back",
  "spill",
  "bezel",
  "reflect",
  "screen",
  "screen-off",
  "screen-glow",
  "frame",
  "ui-problem",
  "ui-dash",
  "pixel",
  "clock",
  "ac-chip",
  "heatmap",
] as const;
type Part = (typeof PARTS)[number];

/**
 * The pinned hero story. Mounted only when <html data-scene="on"> (JS, no reduced motion,
 * not a low-end device). Scroll progress drives every transform directly on the DOM in one
 * pass per frame; React re-renders only when the story's discrete state changes.
 */
export default function HeroScene() {
  const root = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLElement | null>(null);
  const parts = useRef<Partial<Record<Part, HTMLElement>>>({});
  const geo = useRef<Geo | null>(null);
  /** Server-rendered layers the scene fades (headline, glance head, page colour). */
  const page = useRef<{ copy: HTMLElement[]; glance: HTMLElement | null; bg: HTMLElement | null }>({
    copy: [],
    glance: null,
    bg: null,
  });
  const shownTime = useRef("");
  const state = useRef<SceneState>(INITIAL);
  const [s, setS] = useState<SceneState>(INITIAL);
  const debug = useRef<HTMLSpanElement>(null);
  const [showDebug] = useState(() => new URLSearchParams(location.search).has("debug"));

  useLayoutEffect(() => {
    pin.current = root.current!.closest<HTMLElement>("[data-hero-pin]");
  }, []);
  // Scroll progress through the pin (set from scrollY in the effect below), smoothed.
  const raw = useMotionValue(0);
  const p = useSpring(raw, CAMERA.spring);

  const stage = () => root.current?.parentElement ?? null;

  /**
   * Re-collect part nodes (some re-mount when the story's state changes). Only inside the
   * scene: the stage also holds the static poster's laptop, hidden.
   */
  const collect = () => {
    const sc = root.current;
    if (!sc) return;
    for (const name of PARTS) {
      const el = sc.querySelector<HTMLElement>(`[data-part="${name}"]`);
      if (el) parts.current[name] = el;
      else delete parts.current[name];
    }
  };

  const measureBase = () => {
    const st = stage();
    if (!st) return;
    const vw = st.clientWidth;
    const vh = st.clientHeight;
    const phone = vw < 640;
    const fit = phone ? RIG.fit.phone : RIG.fit.desktop;
    const k = phone
      ? (vw * fit) / RIG.baseW
      : Math.min((vw * fit) / RIG.baseW, (vh * 0.5) / (RIG.screenH + RIG.bezel * 2));
    geo.current = { vw, vh, phone, k };
  };

  /** Screen + frame rects, measured once per size in the flat pre-push pose. */
  const measureScreen = (g: Geo) => {
    const P = parts.current;
    const st = stage();
    if (!P.persp || !P.rig || !P.lid || !P.screen || !st) return;
    const prev = [P.persp.style.transform, P.rig.style.transform, P.lid.style.transform];
    poseOpen(g, 1, 0, 0);
    const sr = st.getBoundingClientRect();
    const r = P.screen.getBoundingClientRect();
    g.screen = { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
    const target = st.querySelector<HTMLElement>("[data-frame-target]")?.getBoundingClientRect();
    if (target && target.width > 0)
      g.frame = {
        x: target.left - sr.left,
        y: target.top - sr.top,
        w: target.width,
        h: target.height,
      };
    [P.persp.style.transform, P.rig.style.transform, P.lid.style.transform] = prev;
  };

  /**
   * Flight endpoints in the screen's own px. From the solve beat on, the screen faces the
   * camera flat, so its rects scale uniformly and a ratio converts them.
   */
  const measureFlight = (g: Geo) => {
    const P = parts.current;
    const chip = P["ac-chip"]?.getBoundingClientRect();
    const cell = P.heatmap?.querySelector("[role=img] > :last-child")?.getBoundingClientRect();
    if (!P.screen || !chip || !cell) return;
    const r = P.screen.getBoundingClientRect();
    const u = P.screen.offsetWidth / r.width;
    g.flight = {
      ax: (chip.left + chip.width / 2 - r.left) * u,
      ay: (chip.top + chip.height / 2 - r.top) * u,
      bx: (cell.left + cell.width / 2 - r.left) * u,
      by: (cell.top + cell.height / 2 - r.top) * u,
      size: cell.width * u,
    };
  };

  const rigY = (g: Geo, e: number) => {
    const drop = g.phone ? CAMERA.restDrop.phone : CAMERA.restDrop.desktop;
    const rest = (g.vh * drop) / (g.k * CAMERA.restScale);
    const open = RIG.screenH * 0.5 + RIG.bezel - (g.phone ? 0 : g.vh * 0.03) / g.k;
    return lerp(rest, open, e);
  };

  /** The open, flat pose with a given camera (scale factor over k·dolly, translation). */
  const poseOpen = (g: Geo, c: number, tx: number, ty: number) => {
    const P = parts.current;
    P.persp!.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${g.k * CAMERA.dolly * c})`;
    P.rig!.style.transform = `translateY(${rigY(g, 1)}px) rotateX(${-CAMERA.tiltOpen}deg)`;
    P.lid!.style.transform = `rotateX(${CAMERA.lidOpen - 90}deg)`;
  };

  const render = (v: number) => {
    const g = geo.current;
    const P = parts.current;
    const st = stage();
    if (!g || !st || !P.persp || !P.rig || !P.lid) return;

    // Server-rendered layers: headline, glance head, page colour.
    const lift = easeOut(seg(v, [BEATS.open[0], BEATS.open[0] + 0.08]));
    for (const el of page.current.copy) {
      put(el, "opacity", o(1 - lift));
      put(el, "transform", `translateY(${px(-70 * lift)}px)`);
      put(el, "visibility", lift >= 1 ? "hidden" : "");
    }
    const glance = page.current.glance;
    if (glance) {
      const t = easeOut(seg(v, [MOMENTS.glance, MOMENTS.glance + 0.06]));
      put(glance, "opacity", o(t));
      put(glance, "transform", `translateY(${px(24 * (1 - t))}px)`);
      put(glance, "visibility", t <= 0 ? "hidden" : "visible");
    }
    const hand = easeInOut(seg(v, BEATS.handoff));
    put(
      page.current.bg,
      "opacity",
      o(easeInOut(seg(v, [BEATS.handoff[0] + 0.03, BEATS.handoff[1] - 0.02]))),
    );

    // Laptop: open the lid, flatten the tilt, dolly in.
    const open = easeInOut(seg(v, BEATS.open));
    const tilt = lerp(CAMERA.tiltClosed, CAMERA.tiltOpen, open);
    const lid = lerp(CAMERA.lidClosed, CAMERA.lidOpen, easeInOut(seg(v, CAMERA.lidRange)));
    put(P.rig, "transform", `translateY(${px(rigY(g, open))}px) rotateX(${px(-tilt)}deg)`);
    put(P.lid, "transform", `rotateX(${px(lid - 90)}deg)`);

    // Camera: dolly while opening, push into the screen, then settle into the frame.
    let cam = `scale(${(g.k * lerp(CAMERA.restScale, CAMERA.dolly, open)).toFixed(4)})`;
    const push = easeInOut(seg(v, BEATS.push));
    if (v >= BEATS.push[0] && !g.screen) measureScreen(g);
    if (g.screen && v >= BEATS.push[0]) {
      const sc = g.screen;
      const dx = sc.x + sc.w / 2 - g.vw / 2;
      const dy = sc.y + sc.h / 2 - g.vh / 2;
      const f = g.phone
        ? Math.min(g.vw / sc.w, g.vh / sc.h) * 0.98
        : Math.max(g.vw / sc.w, g.vh / sc.h) * CAMERA.pushMargin;
      let c = lerp(1, f, push);
      let tx = -dx * c * push;
      let ty = -dy * c * push;
      if (g.frame && hand > 0) {
        const fr = g.frame;
        const cf = fr.w / sc.w;
        const fx = fr.x + fr.w / 2 - g.vw / 2 - dx * cf;
        const fy = fr.y + fr.h / 2 - g.vh / 2 - dy * cf;
        c = lerp(f, cf, hand);
        tx = lerp(-dx * f, fx, hand);
        ty = lerp(-dy * f, fy, hand);
      }
      cam = `translate3d(${px(tx)}px, ${px(ty)}px, 0) scale(${(g.k * CAMERA.dolly * c).toFixed(4)})`;
    }
    put(P.persp, "transform", cam);

    // Power on, light spill, reflection.
    const on = seg(v, MOMENTS.powerOn);
    put(P["screen-off"], "opacity", o(1 - seg(v, [MOMENTS.powerOn[0] + 0.02, MOMENTS.powerOn[1]])));
    put(P["screen-glow"], "opacity", o(Math.sin(Math.PI * on) * 0.85));
    const lit = on * seg(lid, [40, CAMERA.lidOpen]);
    put(P.spill, "opacity", o(lit * 0.9));
    put(P.reflect, "transform", `translateX(${(-45 * (lid / CAMERA.lidOpen)).toFixed(1)}%)`);

    // Problem page → dashboard.
    const dis = easeInOut(seg(v, BEATS.dissolve));
    put(P["ui-problem"], "opacity", o(1 - dis));
    put(P["ui-dash"], "opacity", o(dis));
    put(P["ui-dash"], "transform", `scale(${lerp(1.03, 1, dis).toFixed(4)})`);

    // The body falls away while we're inside the screen; the frame takes over.
    const body = 1 - seg(v, [BEATS.handoff[0], BEATS.handoff[0] + 0.04]);
    for (const n of ["bezel", "base", "edge", "lid-back"] as const) put(P[n], "opacity", o(body));
    put(P.frame, "opacity", o(hand));
    // Rounded like the product frame (~22 px on screen once settled). The radius is set once
    // when the hand-off starts, not per frame: an animated clip-path repaints the screen.
    const r = (22 * RIG.screenW) / (g.frame?.w ?? RIG.screenW);
    put(P.screen, "clipPath", hand > 0 ? `inset(0 round ${r.toFixed(1)}px)` : "");

    // The pixel flight: Accepted chip → today's cell, along a curve.
    if (P.pixel) {
      const t = seg(v, BEATS.flight);
      if (t > 0 && !g.flight) measureFlight(g);
      const fl = g.flight;
      if (fl && t > 0 && t < 1) {
        const e = easeInOut(t);
        const cx = (fl.ax + fl.bx) / 2 + 60;
        const cy = Math.min(fl.ay, fl.by) - 140;
        const x = (1 - e) ** 2 * fl.ax + 2 * (1 - e) * e * cx + e ** 2 * fl.bx;
        const y = (1 - e) ** 2 * fl.ay + 2 * (1 - e) * e * cy + e ** 2 * fl.by;
        const size = lerp(12, fl.size, e);
        put(P.pixel, "opacity", "1");
        put(
          P.pixel,
          "transform",
          `translate3d(${px(x - size / 2)}px, ${px(y - size / 2)}px, 0) scale(${(size / 12).toFixed(3)})`,
        );
      } else put(P.pixel, "opacity", "0");
    }

    // The pill's clock, from scroll (so scrolling back rewinds it). A text change re-lays
    // out the pill, so it's written only when the shown time changes.
    const time = clock(timerAt(v));
    if (P.clock && (time !== shownTime.current || P.clock.textContent !== time)) {
      shownTime.current = time;
      P.clock.textContent = time;
    }

    if (debug.current) debug.current.textContent = `p ${v.toFixed(3)}`;
  };

  useMotionValueEvent(p, "change", (v) => {
    render(v);
    const next = stateAt(v);
    if (!sameState(next, state.current)) {
      state.current = next;
      setS(next);
    }
  });

  // Parts re-mount when the story's state changes: re-collect, re-render this frame.
  useLayoutEffect(() => {
    collect();
    render(p.get());
  });

  useEffect(() => {
    const st = stage();
    if (!st) return;
    page.current = {
      copy: [...st.querySelectorAll<HTMLElement>("[data-hero-copy]")],
      glance: st.querySelector<HTMLElement>("[data-glance]"),
      bg: st.querySelector<HTMLElement>("[data-part=page-bg]"),
    };
    // Progress from scrollY alone. The pin's place on the page is measured on resize only,
    // so a scroll event reads no layout (re-measuring per event forced a style pass right
    // after each frame's writes). The viewport is the layout viewport (clientHeight), which
    // doesn't change when a phone's address bar slides away.
    let top = 0;
    let range = 1;
    const measurePin = () => {
      const el = pin.current;
      if (!el) return;
      top = el.getBoundingClientRect().top + window.scrollY;
      range = Math.max(1, el.offsetHeight - document.documentElement.clientHeight);
    };
    const progress = () => Math.min(1, Math.max(0, (window.scrollY - top) / range));
    const onScroll = () => raw.set(progress());
    measurePin();
    raw.set(progress());
    p.jump(progress());

    collect();
    measureBase();
    render(p.get());
    root.current!.dataset.shown = "";
    const ro = new ResizeObserver(() => {
      measurePin();
      onScroll();
      measureBase();
      render(p.get());
    });
    ro.observe(st);
    if (pin.current) ro.observe(pin.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Captions are server-rendered; mark the scene live so CSS switches them to one-at-a-time.
    st.dataset.live = "";
    // GPU layers (will-change, in globals.css) only while the stage is on screen.
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) st.dataset.active = "";
      else delete st.dataset.active;
    });
    if (pin.current) io.observe(pin.current);
    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Captions: one at a time, the rest stay in the DOM for screen readers.
  useEffect(() => {
    const st = stage();
    st?.querySelectorAll<HTMLElement>("[data-caption]").forEach((li, i) => {
      if (i === s.caption) li.dataset.on = "";
      else delete li.dataset.on;
    });
  }, [s.caption]);

  const goTo = (at: number) => {
    const el = pin.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = top + at * (el.offsetHeight - document.documentElement.clientHeight);
    const lenis = (window as Window & { __lenis?: { scrollTo: (y: number, o?: object) => void } })
      .__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div
      ref={root}
      className="absolute inset-0 opacity-0 transition-opacity duration-500 data-[shown]:opacity-100"
    >
      <Laptop
        className="absolute inset-0"
        screen={
          <>
            <div data-part="ui-problem" className="absolute inset-0">
              <ScreenProblem s={s} />
            </div>
            <div data-part="ui-dash" className="absolute inset-0 opacity-0">
              <ScreenDashboard
                landed={s.landed}
                num={(n) => <NumberTicker value={n} roll={false} />}
              />
            </div>
            <span data-part="pixel" className="lt-pixel" />
          </>
        }
      />
      <nav
        aria-label="Intro steps"
        className="absolute z-20 flex gap-2 max-sm:inset-x-0 max-sm:bottom-3 max-sm:justify-center sm:top-1/2 sm:right-5 sm:-translate-y-1/2 sm:flex-col"
      >
        {RAIL.map((r, i) => (
          <button
            key={r.short}
            type="button"
            aria-label={r.label}
            aria-current={s.beat === i ? "step" : undefined}
            onClick={() => goTo(r.at)}
            className="group grid size-6 place-items-center"
          >
            <span
              className={cn(
                "block rounded-full transition-[height,width,background-color] duration-300 max-sm:h-[3px] sm:w-[3px]",
                s.beat === i
                  ? "bg-white max-sm:w-6 sm:h-6"
                  : "bg-white/25 group-hover:bg-white/50 max-sm:w-3 sm:h-3",
              )}
            />
          </button>
        ))}
      </nav>
      {showDebug && (
        <span
          ref={debug}
          className="fixed top-20 left-3 z-[70] rounded bg-black/80 px-2 py-1 font-mono text-[11px] text-white"
        />
      )}
    </div>
  );
}

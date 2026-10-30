// The hero scroll story ("The 1 a.m. desk"). Every timing and tuning knob lives here, so
// re-pacing the scene is a one-file change. `p` is scroll progress through the pinned
// section, 0..1. Documented in design/LANDING-V3.md.

/** Beat ranges. */
export const BEATS = {
  intro: [0, 0.12], // headline over a closed laptop
  open: [0.12, 0.3], // headline lifts, lid opens, screen powers on, tilt flattens
  solve: [0.3, 0.55], // problem page, timer, tab switch, WA, AC, honest question
  push: [0.55, 0.7], // camera pushes into the screen
  dissolve: [0.6, 0.68], // problem page → dashboard, during the push
  flight: [0.64, 0.76], // the lime pixel flies from Accepted to today's cell
  handoff: [0.82, 0.95], // pull back into the framed product shot, stage → page colour
} as const;

/** Moments inside the solve beat. */
export const MOMENTS = {
  powerOn: [0.18, 0.27], // screen: black → glow → content
  typing: [0.3, 0.4], // editor lines appear
  tabAway: [0.36, 0.41], // switched tabs: the pill reads paused · idle
  wrong: 0.43, // Submit → Wrong Answer
  fix: 0.455, // the off-by-one gets fixed
  accepted: 0.48, // Submit again → Accepted
  honest: 0.51, // the pill asks Solo · Hint · Saw solution
  solo: 0.535, // Solo picked
  landed: 0.76, // pixel lands: 411 → 412, 46 → 47, revision gains Koko
  glance: 0.91, // "Your prep, at a glance." fades in, once the frame has nearly settled
} as const;

/** The pill's clock, in seconds, as a function of p (pauses while you're on another tab). */
export const TIMER = {
  awayAt: 6 * 60 + 10, // shown while paused
  endAt: 18 * 60 + 42, // shown from Accepted on
} as const;

export const CAMERA = {
  /** Rig tilt (degrees looking down onto the desk): closed → open. */
  tiltClosed: 58,
  tiltOpen: 12,
  /** Lid angle relative to the base: closed → open. 90 + tiltOpen makes the screen face us. */
  lidClosed: 0,
  lidOpen: 102,
  /** Camera: starts pulled back (rest), dollies in while the lid opens. */
  restScale: 0.82,
  dolly: 1.08,
  /** Hinge position at p=0, as a share of the stage height below centre (desktop / phone). */
  restDrop: { desktop: 0.21, phone: 0.2 },
  /** Lid opening runs over this part of the open beat (it leads the tilt a little). */
  lidRange: [0.13, 0.27] as [number, number],
  /** Push-in margin past the viewport edges (so the bezel slides off). */
  pushMargin: 1.02,
  /** Scroll smoothing (motion useSpring). Lenis already smooths the wheel on desktop. */
  spring: { stiffness: 380, damping: 52, restDelta: 0.0004 },
} as const;

/** Laptop geometry in nominal px; the whole rig is scaled to the viewport. */
export const RIG = {
  screenW: 960,
  screenH: 600,
  bezel: 18,
  baseW: 1060,
  baseD: 700,
  /** Rig fits inside this share of the viewport (desktop / phone). */
  fit: { desktop: 0.72, phone: 0.92 },
} as const;

/** Pinned section heights (also in globals.css as the scene variant heights). */
export const PIN = { desktop: "500vh", phone: "320vh" } as const;

export const CAPTIONS = [
  {
    at: BEATS.open[0] + 0.03,
    until: BEATS.solve[0],
    eyebrow: "01 · Open",
    line: "Open any problem.",
  },
  {
    at: BEATS.solve[0],
    until: MOMENTS.tabAway[0],
    eyebrow: "02 · Time",
    line: "The timer starts itself.",
  },
  {
    at: MOMENTS.tabAway[0],
    until: MOMENTS.accepted,
    eyebrow: "03 · Pause",
    line: "Switch tabs, it pauses. No fake hours.",
  },
  {
    at: MOMENTS.accepted,
    until: BEATS.push[0] + 0.04,
    eyebrow: "04 · Honest",
    line: "Accepted? One honest question.",
  },
  {
    at: BEATS.flight[0],
    until: BEATS.handoff[0],
    eyebrow: "05 · Land",
    line: "Then it lands where it matters.",
  },
] as const;

/** Rail ticks: each is active from `from`, and its button scrolls to `at`. */
export const RAIL = [
  { label: "Open the laptop", short: "Open", from: BEATS.open[0], at: 0.24 },
  { label: "Solve a problem", short: "Solve", from: BEATS.solve[0], at: 0.47 },
  { label: "Watch it land on the dashboard", short: "Land", from: BEATS.push[0], at: 0.77 },
  { label: "Your prep at a glance", short: "Glance", from: BEATS.handoff[0], at: 1 },
] as const;

/** Example numbers (labelled "example" on screen). */
export const DEMO = { solved: 411, streak: 46, due: 5 } as const;

// ---------------------------------------------------------------- maths

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Local 0..1 progress of p inside [a, b]. */
export const seg = (p: number, [a, b]: readonly [number, number]) => clamp((p - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** The pill's seconds at p: counts while solving, holds while you're away. */
export function timerAt(p: number): number {
  const [s, e] = [BEATS.solve[0], MOMENTS.accepted];
  const [away, back] = MOMENTS.tabAway;
  if (p <= s) return 0;
  if (p < away) return Math.round(lerp(0, TIMER.awayAt, (p - s) / (away - s)));
  if (p < back) return TIMER.awayAt;
  if (p < e) return Math.round(lerp(TIMER.awayAt, TIMER.endAt, (p - back) / (e - back)));
  return TIMER.endAt;
}

export const clock = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

/** Discrete state of the story at p. React re-renders only when this changes. */
export type SceneState = {
  lines: number;
  away: boolean;
  verdict: "none" | "wa" | "ac";
  fixed: boolean;
  honest: "none" | "ask" | "solo";
  landed: boolean;
  caption: number;
  beat: number;
};

export function stateAt(p: number): SceneState {
  const typed = seg(p, MOMENTS.typing);
  return {
    lines: Math.round(typed * 8),
    away: p >= MOMENTS.tabAway[0] && p < MOMENTS.tabAway[1],
    verdict: p >= MOMENTS.accepted ? "ac" : p >= MOMENTS.wrong ? "wa" : "none",
    fixed: p >= MOMENTS.fix,
    honest: p >= MOMENTS.solo ? "solo" : p >= MOMENTS.honest ? "ask" : "none",
    landed: p >= MOMENTS.landed,
    caption: CAPTIONS.findIndex((c) => p >= c.at && p < c.until),
    beat: RAIL.reduce((n, r, i) => (p >= r.from ? i : n), -1),
  };
}

export const sameState = (a: SceneState, b: SceneState) =>
  (Object.keys(a) as (keyof SceneState)[]).every((k) => a[k] === b[k]);

// DsaKaro

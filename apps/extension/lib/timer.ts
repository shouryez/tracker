// Pure timer state machine (PLAN.md §5.2). No browser APIs, so it's unit-tested.
//
//   armed ──(10 s visible+focused, or first input)──▶ active
//   active ◀──▶ paused   (tab hidden, window blurred, 3 min without input, or manual pause)
//   any ──accepted──▶ solved
//
// Time is stored as totals plus the last tick, never as a running counter,
// so a sleeping laptop or a throttled background tab can't inflate it.

export const IDLE_AFTER_MS = 3 * 60_000;
export const ARM_AFTER_MS = 10_000;
/** Ticks further apart than this (sleep, throttling) only count the first part as active. */
export const MAX_TICK_MS = 5_000;

export type TimerStatus = "armed" | "active" | "paused" | "solved";

export type TimerState = {
  status: TimerStatus;
  manualPause: boolean;
  /** Focused time spent while armed; counts towards active once started. */
  armedMs: number;
  startedAt: number | null;
  activeMs: number;
  idleMs: number;
  lastTickAt: number;
};

export type Signals = {
  visible: boolean;
  focused: boolean;
  /** Last keyboard/mouse/scroll activity on the page. */
  lastInputAt: number;
};

export function newTimer(now: number): TimerState {
  return {
    status: "armed",
    manualPause: false,
    armedMs: 0,
    startedAt: null,
    activeMs: 0,
    idleMs: 0,
    lastTickAt: now,
  };
}

function start(s: TimerState, now: number): TimerState {
  return { ...s, status: "active", startedAt: now - s.armedMs, activeMs: s.armedMs + s.activeMs };
}

export function tick(s: TimerState, now: number, sig: Signals): TimerState {
  const dt = Math.max(0, now - s.lastTickAt);
  const counted = Math.min(dt, MAX_TICK_MS);
  const overflow = dt - counted;
  const next = { ...s, lastTickAt: now };

  if (s.status === "solved") return next;

  if (s.status === "armed") {
    if (!(sig.visible && sig.focused)) return next;
    next.armedMs += counted;
    return next.armedMs >= ARM_AFTER_MS ? start({ ...next, armedMs: next.armedMs }, now) : next;
  }

  const engaged =
    !s.manualPause && sig.visible && sig.focused && now - sig.lastInputAt < IDLE_AFTER_MS;
  if (engaged) {
    next.status = "active";
    if (s.status === "active") {
      next.activeMs += counted;
      next.idleMs += overflow;
    } else {
      // Coming back from a pause (another tab, a throttled background tab): the gap since the
      // last tick was time away, so none of it counts as solving.
      next.idleMs += dt;
    }
  } else {
    next.status = "paused";
    next.idleMs += dt;
  }
  return next;
}

/** Typing or clicking starts an armed timer straight away. */
export function onInput(s: TimerState, now: number): TimerState {
  return s.status === "armed" ? start({ ...s, lastTickAt: now }, now) : s;
}

export function setManualPause(s: TimerState, paused: boolean, now: number): TimerState {
  if (s.status === "solved") return s;
  const started = s.status === "armed" && !paused ? start(s, now) : s;
  return { ...started, manualPause: paused, status: paused ? "paused" : "active", lastTickAt: now };
}

export function solve(s: TimerState, now: number): TimerState {
  const started = s.status === "armed" ? start(s, now) : s;
  return { ...started, status: "solved", lastTickAt: now };
}

/** A resumed session shouldn't count the time the page was closed. */
export function resume(s: TimerState, now: number): TimerState {
  return { ...s, lastTickAt: now };
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// DsaKaro

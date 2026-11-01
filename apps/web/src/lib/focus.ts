import type { ActiveFocus } from "./daily-data";

/** How long a study session has run, without its pauses. Client-safe. */
export function focusElapsed(f: ActiveFocus, now: number) {
  return Math.max(0, (f.pausedAt ?? now) - f.startedAt - f.pausedMs);
}

/** Extension totals for the whole session: banked at earlier pauses plus the live segment. */
export function focusTotals(
  f: ActiveFocus,
  live: { focusMs: number; awayMs: number; switches: number; tracking: boolean } | null,
) {
  const on = live?.tracking ?? false;
  return {
    focusMs: f.banked.focusMs + (on ? live!.focusMs : 0),
    awayMs: f.banked.awayMs + (on ? live!.awayMs : 0),
    switches: f.banked.switches + (on ? live!.switches : 0),
    tracking: f.banked.tracked || on,
  };
}

export type FocusMode = "stopwatch" | "pomodoro-25" | "pomodoro-50";
export const POMODORO: Record<Exclude<FocusMode, "stopwatch">, { work: number; rest: number }> = {
  "pomodoro-25": { work: 25, rest: 5 },
  "pomodoro-50": { work: 50, rest: 10 },
};

/**
 * Where in a pomodoro we are (null for the stopwatch). Only focus blocks run on the clock:
 * a break never starts by itself. When a block ends you're asked to take one, and taking it
 * pauses the session, so break time never counts as focus. Pure.
 */
export function focusPhase(mode: string, elapsedMs: number) {
  if (!(mode in POMODORO)) return null;
  const { work, rest } = POMODORO[mode as keyof typeof POMODORO];
  const block = work * 60_000;
  const into = elapsedMs % block;
  return {
    left: block - into,
    length: block,
    round: Math.floor(elapsedMs / block) + 1,
    restMs: rest * 60_000,
  };
}

/**
 * A pomodoro session that's paused is on a break: the suggested break's length and what's
 * left of it (negative once it's over; it never resumes by itself). Null otherwise. Pure.
 */
export function breakState(f: ActiveFocus, now: number) {
  if (!f.pausedAt || !(f.mode in POMODORO)) return null;
  const length = POMODORO[f.mode as keyof typeof POMODORO].rest * 60_000;
  return { length, left: length - (now - f.pausedAt) };
}

/** "mm:ss", or "h:mm:ss" from an hour. */
export function focusClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

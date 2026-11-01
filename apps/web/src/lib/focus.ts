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

/** Where in a pomodoro cycle we are (null for the stopwatch). Pure. */
export function focusPhase(mode: string, elapsedMs: number) {
  if (!(mode in POMODORO)) return null;
  const { work, rest } = POMODORO[mode as keyof typeof POMODORO];
  const cycle = (work + rest) * 60_000;
  const into = elapsedMs % cycle;
  const working = into < work * 60_000;
  const left = working ? work * 60_000 - into : cycle - into;
  const length = (working ? work : rest) * 60_000;
  return { working, left, length, round: Math.floor(elapsedMs / cycle) + 1 };
}

/** "mm:ss", or "h:mm:ss" from an hour. */
export function focusClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

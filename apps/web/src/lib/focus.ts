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

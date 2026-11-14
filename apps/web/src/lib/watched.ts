import type { Independence } from "@upsolve/core";

// Watched it? Prove it (FINAL-FEATURES A1). If you watched the problem's explanation video in
// the app's player shortly before an Accepted, that solve counts as "saw the solution",
// whatever was answered. The revision ladder then books a solo re-solve for tomorrow.

/** A watch this long has seen the idea; shorter is a peek at the intro. */
export const WATCH_MIN_MS = 90_000;
/** A watch this long before the solve still counts as having seen it. */
export const WATCH_WINDOW_MS = 48 * 3_600_000;

export type Watch = { at: number; watchedMs: number };

/** The watch that makes a solve at `at` a saw-the-solution one, if any. */
export function watchBefore(at: number, watches: Watch[]): Watch | null {
  let hit: Watch | null = null;
  for (const w of watches) {
    if (w.watchedMs < WATCH_MIN_MS || w.at > at || at - w.at > WATCH_WINDOW_MS) continue;
    if (!hit || w.at > hit.at) hit = w;
  }
  return hit;
}

/** The honest answer after taking watched videos into account. */
export function effectiveIndependence(
  at: number,
  answered: Independence | null,
  watches: Watch[],
): Independence | null {
  return watches.length && watchBefore(at, watches) ? "solution" : answered;
}

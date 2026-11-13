import { useSyncExternalStore } from "react";

// Session goal (FEATURES-PLAN F8): "aim for N problems" for one study session. Per browser,
// a convenience only, so it lives in localStorage keyed by the session id.

const key = (id: string) => `dsakaro:goal:${id}`;
const EVENT = "dsakaro:goal";

/** The goals the notch cycles through; null is "no goal". */
export const GOAL_STEPS = [null, 1, 2, 3, 4, 5, 6, 8] as const;

export function readGoal(id: string): number | null {
  try {
    const n = Number(localStorage.getItem(key(id)));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setGoal(id: string, n: number | null) {
  try {
    if (n) localStorage.setItem(key(id), String(n));
    else localStorage.removeItem(key(id));
  } catch {
    // Storage blocked: no goal.
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useSessionGoal(id: string | null): number | null {
  return useSyncExternalStore(
    subscribe,
    () => (id ? readGoal(id) : null),
    () => null,
  );
}

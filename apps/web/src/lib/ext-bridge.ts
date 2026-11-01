// Web page ↔ extension bridge (window.postMessage). Must match
// apps/extension/entrypoints/web-bridge.content.ts. Client-side only.

const WEB = "upsolve-web";
const EXT = "upsolve-ext";

export type LabTotals = { focusMs: number; awayMs: number; switches: number; tracking: boolean };

/** What the active tab is right now, from the extension (shown live, never stored). */
export type LabActivity = {
  cat: "focus" | "away";
  /** False when no browser window has focus (another app). */
  known: boolean;
  kind: "video" | "problem" | "dsakaro" | "page" | null;
  /** Video or problem title; for off-task tabs only the site. */
  label: string | null;
};

/** labStatus reply. Older extensions send only the totals. */
export type LabLive = LabTotals & {
  now?: LabActivity | null;
  /** The extension paused the session (a while on a non-study tab). */
  autoPaused?: boolean;
  autoPauseOn?: boolean;
};

/** Sends a message and waits for one reply of `replyType`; null when the extension isn't there. */
export function askExtension<T = Record<string, unknown>>(
  type: string,
  payload: Record<string, unknown>,
  replyType: string,
  timeoutMs = 1200,
): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(e: MessageEvent) {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data as Record<string, unknown> | null;
      if (d?.source !== EXT || d.type !== replyType) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(d as T);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: WEB, type, ...payload }, window.location.origin);
  });
}

/** Tell the extension a focus session started (it starts tab tracking). */
export function labStart(focusId: string, startedAt: number) {
  return askExtension<LabTotals>("lab-start", { focusId, startedAt }, "lab-totals");
}

/** Current totals while running. */
export function labStatus(focusId: string) {
  return askExtension<LabLive>("lab-status", { focusId }, "lab-totals", 800);
}

/** Stop tracking and return the final totals. */
export function labStop(focusId: string) {
  return askExtension<LabTotals>("lab-stop", { focusId }, "lab-totals", 1500);
}


"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Code2, Monitor, Play, TriangleAlert } from "lucide-react";
import { cn } from "@upsolve/ui";
import { labStatus, type LabLive } from "@/lib/ext-bridge";

/**
 * What the extension sees for a study session, every few seconds: totals, the active tab
 * (shown live, never stored) and whether it auto-paused the session. Polls while paused too,
 * so an auto-resume shows up. Null without the extension.
 */
export function useLabLive(focusId: string | null) {
  const [live, setLive] = useState<{ id: string; v: LabLive | null } | null>(null);
  useEffect(() => {
    if (!focusId) return;
    let alive = true;
    const poll = async () => {
      const v = await labStatus(focusId);
      if (alive) setLive({ id: focusId, v });
    };
    void poll();
    const id = window.setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [focusId]);
  return live && live.id === focusId ? live.v : null;
}

/**
 * Re-reads the session from the server when the extension paused or resumed it on its own
 * (the page still shows the old state). At most every 5 s.
 */
export function useAutoPauseSync(paused: boolean | null, live: LabLive | null) {
  const router = useRouter();
  const last = useRef(0);
  useEffect(() => {
    if (paused === null || !live) return;
    const changed = (live.autoPaused && !paused) || (live.tracking && paused);
    if (!changed || Date.now() - last.current < 5000) return;
    last.current = Date.now();
    router.refresh();
  }, [paused, live, router]);
}

/** One line on what you're on right now, from the extension. */
export function ActivityLine({
  live,
  paused,
  className,
}: {
  live: LabLive | null;
  paused: boolean;
  className?: string;
}) {
  if (!live) return null;
  if (paused && live.autoPaused)
    return (
      <p className={cn("flex items-center gap-2 text-medium", className)}>
        <TriangleAlert size={14} aria-hidden="true" className="shrink-0" />
        <span className="truncate">Auto-paused · open a study tab to resume</span>
      </p>
    );
  const now = live.now;
  if (!now || paused) return null;
  if (!now.known)
    return (
      <p className={cn("flex items-center gap-2 text-white/50", className)}>
        <Monitor size={14} aria-hidden="true" className="shrink-0" />
        <span className="truncate">In another app · counts as study</span>
      </p>
    );
  if (now.cat === "away")
    return (
      <p className={cn("flex items-center gap-2 text-medium", className)}>
        <TriangleAlert size={14} aria-hidden="true" className="shrink-0" />
        <span className="truncate">
          {now.label ?? "Off-task tab"}
          {" · off-task, not counted"}
        </span>
      </p>
    );
  return (
    <p className={cn("flex min-w-0 items-center gap-2 text-white/70", className)}>
      {now.kind === "video" ? (
        <Play size={13} aria-hidden="true" className="shrink-0 fill-current text-[#ff4d6a]" />
      ) : (
        <Code2 size={14} aria-hidden="true" className="shrink-0 text-success" />
      )}
      <span className="truncate">
        {now.kind === "video" ? "Watching" : now.kind === "dsakaro" ? "On" : "Working on"}{" "}
        <span className="text-white/90">{now.label}</span>
      </span>
    </p>
  );
}

type PipApi = {
  requestWindow: (o: { width: number; height: number }) => Promise<Window>;
};
const pipApi = () =>
  (window as Window & { documentPictureInPicture?: PipApi }).documentPictureInPicture;

const noop = () => () => {};
/** Whether this browser can float a mini window over other tabs (Chrome and Edge, desktop). */
export function useCanPopout() {
  return useSyncExternalStore(
    noop,
    () => Boolean(pipApi()),
    () => false,
  );
}

// ---------------------------------------------------------------- the one pop-out

/** The pop-out window, shared by every timer on the page (the study bar renders into it). */
let sharedPip: Window | null = null;
const pipSubs = new Set<() => void>();
function setSharedPip(w: Window | null) {
  sharedPip = w;
  pipSubs.forEach((f) => f());
}
export function useSharedPip() {
  return useSyncExternalStore(
    (cb) => {
      pipSubs.add(cb);
      return () => pipSubs.delete(cb);
    },
    () => sharedPip,
    () => null,
  );
}
export function closePopout() {
  sharedPip?.close();
  setSharedPip(null);
}

/**
 * Floats the study timer over other tabs (or brings it forward if it's open). Must run from
 * a click, or within a few seconds of one: browsers only open it on a user action.
 */
export async function popoutTimer() {
  if (sharedPip && !sharedPip.closed) {
    sharedPip.focus();
    return sharedPip;
  }
  const win = await openPopout();
  if (!win) return null;
  win.addEventListener("pagehide", () => {
    if (sharedPip === win) setSharedPip(null);
  });
  setSharedPip(win);
  return win;
}

/** "Pop out automatically" (on unless turned off): open it when a session starts or resumes. */
const AUTO_KEY = "dsakaro:auto-popout";
const autoSubs = new Set<() => void>();
export function autoPopoutOn() {
  try {
    return localStorage.getItem(AUTO_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setAutoPopout(on: boolean) {
  try {
    localStorage.setItem(AUTO_KEY, on ? "on" : "off");
  } catch {}
  autoSubs.forEach((f) => f());
}
export function useAutoPopout() {
  return useSyncExternalStore(
    (cb) => {
      autoSubs.add(cb);
      return () => autoSubs.delete(cb);
    },
    autoPopoutOn,
    () => true,
  );
}
/** After a start/resume click: pop out if the browser can and the person wants it. */
export function maybeAutoPopout() {
  if (pipApi() && autoPopoutOn()) void popoutTimer();
}

/**
 * Opens an always-on-top mini window (Document Picture-in-Picture) styled like the page.
 * Must run in a click handler. Null when the browser can't.
 */
export async function openPopout(): Promise<Window | null> {
  const api = pipApi();
  if (!api) return null;
  let win: Window;
  try {
    // A slim widget that covers little of the screen; resize it for the stacked layout.
    win = await api.requestWindow({ width: 380, height: 148 });
  } catch {
    return null;
  }
  const doc = win.document;
  // The window starts at about:blank: resolve /_next/... (fonts, CSS) against the site.
  const base = doc.createElement("base");
  base.href = location.origin;
  doc.head.append(base);
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = doc.createElement("style");
      style.textContent = [...sheet.cssRules].map((r) => r.cssText).join("\n");
      doc.head.append(style);
    } catch {
      if (sheet.href) {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        doc.head.append(link);
      }
    }
  }
  doc.documentElement.className = document.documentElement.className;
  doc.documentElement.dataset.theme = "dark";
  doc.title = "DsaKaro · study timer";
  return win;
}

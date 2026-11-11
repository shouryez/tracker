"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { BookOpenCheck, Maximize2, Pause, PictureInPicture2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button, cn } from "@upsolve/ui";
import {
  getStudySummary,
  pauseFocus,
  resumeFocus,
  startFocus,
  stopFocus,
} from "@/app/actions/daily";
import { burst } from "@/components/dashboard/celebrate";
import { Modal } from "@/components/fx/overlay";
import type { ActiveFocus } from "@/lib/daily-data";
import { focusElapsed, focusPhase, focusTotals } from "@/lib/focus";
import { labStart, labStop, type LabTotals } from "@/lib/ext-bridge";
import type { StudyContents } from "@/lib/study-data";
import {
  closePopout,
  maybeAutoPopout,
  popoutTimer,
  useAutoPauseSync,
  useCanPopout,
  useLabLive,
  useSharedPip,
} from "./focus-live";
import { FocusPopout } from "./focus-popout";
import { FocusScreen, enterFullscreen } from "./focus-screen";
import { SessionReceipt } from "./session-receipt";

const mins = (ms: number) => `${Math.round(ms / 60_000)}m`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export type StudyEnd = {
  wall: number;
  totals: LabTotals | null;
  contents: StudyContents | null;
  /** The session's name, printed on the receipt. */
  label?: string | null;
  /** When it ended (ms). */
  at?: number;
};

/** What a study session added up to, with Save / Discard. Shared by the Lab and the study bar. */
export function StudySummaryModal({
  summary,
  pending,
  onSave,
  onClose,
}: {
  summary: StudyEnd | null;
  pending: boolean;
  onSave: (discard: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={summary !== null}
      onClose={onClose}
      title={
        <>
          Nice <em className="font-display font-normal">session.</em>
        </>
      }
      description="Keep it, or throw it away if the timer ran by mistake."
    >
      {summary && (
        <div className="flex flex-col gap-5">
          <SessionReceipt
            label={summary.label ?? null}
            at={summary.at ?? summary.wall}
            wall={summary.wall}
            focusMs={summary.totals?.focusMs ?? null}
            awayMs={summary.totals?.awayMs ?? null}
            switches={summary.totals?.switches ?? null}
            contents={summary.contents}
          />
          {summary.totals && summary.totals.awayMs > 10 * 60_000 && (
            <p className="text-13 text-ink-2">
              You were away for {mins(summary.totals.awayMs)}. Away time never counts as focus.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => onSave(true)}>
              Discard
            </Button>
            <Button variant="signal" loading={pending} onClick={() => onSave(false)}>
              <Pause size={14} aria-hidden="true" /> Save session
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Ends a study session: asks the extension for its totals (added to those banked at earlier
 * pauses) and the server for what you did. Paused time is left out of the wall clock.
 */
export async function endStudy(active: ActiveFocus): Promise<StudyEnd> {
  const [t, contents] = await Promise.all([
    active.pausedAt ? Promise.resolve(null) : labStop(active.id),
    getStudySummary(active.id),
  ]);
  const totals = focusTotals(active, t);
  const wall = focusElapsed(active, Date.now());
  // The extension only reports what it saw. Running time it didn't see (another app such as
  // notes or an IDE, or the extension asleep or reconnecting) is study time too: only what
  // it saw as an off-task tab counts as away.
  const unseen = Math.max(0, wall - totals.focusMs - totals.awayMs);
  return {
    wall,
    totals: totals.tracking ? { ...totals, focusMs: totals.focusMs + unseen } : null,
    contents,
    label: active.label,
    at: Date.now(),
  };
}

/**
 * Pauses: the extension stops tracking and its totals so far are banked on the session.
 * Returns what was banked (or null) when it worked, false when it didn't.
 */
export async function pauseStudy(active: ActiveFocus) {
  const t = await labStop(active.id);
  const add = t?.tracking ? { focusMs: t.focusMs, awayMs: t.awayMs, switches: t.switches } : null;
  const res = await pauseFocus(active.id, add);
  if (!res.ok) {
    toast.error(res.error);
    return false;
  }
  return { add };
}

/** Resumes: the server adds the pause to the paused time, the extension starts tracking again. */
export async function resumeStudy(active: ActiveFocus) {
  const res = await resumeFocus(active.id);
  if (!res.ok) {
    toast.error(res.error);
    return false;
  }
  void labStart(active.id, Date.now());
  return true;
}

/** Saves (or discards) an ended study session. */
export async function saveStudy(active: ActiveFocus, end: StudyEnd, discard: boolean) {
  const r = end.totals;
  const res = await stopFocus(
    active.id,
    r ? { focusMs: r.focusMs, awayMs: r.awayMs, switches: r.switches } : null,
    discard,
  );
  if (!res.ok) {
    toast.error(res.error);
    return false;
  }
  if (!discard) {
    void burst({ small: true });
    toast.success("Session saved", {
      description: `${mins(r?.focusMs ?? end.wall)} of focus · see it in Recent study sessions`,
    });
  }
  return true;
}

/** Starts a study session from anywhere (a sheet, Today); everything you do then is logged. */
export function StartStudyButton({
  label,
  active,
}: {
  label: string | null;
  active: ActiveFocus | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (active) return null;
  return (
    <Button
      variant="signal"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await startFocus("stopwatch", label);
          if (!res.ok) return void toast.error(res.error);
          if (res.existing) {
            toast("You already have a study session", {
              description: "Picked it up here instead of starting a second one.",
            });
            router.refresh();
            return;
          }
          const ext = await labStart(res.id, res.startedAt);
          maybeAutoPopout();
          toast.success("Study session started", {
            description: ext
              ? "Videos you watch here, problems you solve and items you tick are logged."
              : "Videos and ticks are logged; install the extension to time problems too.",
          });
          router.refresh();
        })
      }
    >
      <BookOpenCheck size={14} aria-hidden="true" /> Start study session
    </Button>
  );
}

/**
 * Floating bar on every page while a study session runs: elapsed time and Stop. Hidden on
 * Sessions, which has the full timer.
 */
// The sidebar streams in separately, so watch for its dock to appear (or go, when collapsed).
const watchDom = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.body, { childList: true, subtree: true });
  return () => mo.disconnect();
};
/** The sidebar's dock for the running session (desktop); null on phones and on the server. */
function useSidebarSlot() {
  return useSyncExternalStore(
    watchDom,
    () => document.getElementById("sidebar-live"),
    () => null,
  );
}

export function StudyBar({ active }: { active: ActiveFocus | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [now, setNow] = useState(() => active?.startedAt ?? 0);
  const [end, setEnd] = useState<StudyEnd | null>(null);
  const [full, setFull] = useState(false);
  const pip = useSharedPip();
  const [pending, start] = useTransition();
  const canPopout = useCanPopout();
  const slot = useSidebarSlot();
  // Sessions has its own timer (and its own polling), but the pop-out is drawn from here.
  const onSessions = pathname === "/dashboard/sessions";
  const live = useLabLive(active && (!onSessions || pip) ? active.id : null);
  useAutoPauseSync(active && !onSessions ? active.pausedAt !== null : null, live);

  useEffect(() => {
    if (!active || active.pausedAt) return;
    void labStart(active.id, active.startedAt); // re-attach the extension after a reload
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // The session ended: close the floating window with it.
  useEffect(() => {
    if (!active && pip) closePopout();
  }, [active, pip]);

  // Chrome can float the timer by itself when you switch tabs (automatic picture-in-picture),
  // where it allows it for the page. Harmless elsewhere.
  const activeId = active?.id;
  useEffect(() => {
    if (!activeId) return;
    const ms = navigator.mediaSession as
      (MediaSession & { setActionHandler(a: string, h: (() => void) | null): void }) | undefined;
    try {
      ms?.setActionHandler("enterpictureinpicture", () => void popoutTimer());
    } catch {}
    return () => {
      try {
        ms?.setActionHandler("enterpictureinpicture", null);
      } catch {}
    };
  }, [activeId]);

  const popout = async () => {
    setFull(false);
    await popoutTimer();
  };

  if (!active) return null;
  const paused = active.pausedAt !== null;
  const elapsed = focusElapsed(active, now || active.startedAt);
  const togglePause = () =>
    start(async () => {
      const resuming = paused;
      if ((await (paused ? resumeStudy(active) : pauseStudy(active))) === false) return;
      if (resuming) maybeAutoPopout();
      router.refresh();
    });
  const stop = () => start(async () => setEnd(await endStudy(active)));

  const floating = pip && (
    <FocusPopout
      win={pip}
      active={active}
      live={live}
      pending={pending}
      onTogglePause={togglePause}
      onStop={() => {
        closePopout();
        window.focus();
        stop();
      }}
    />
  );
  if (onSessions) return floating || null;

  return (
    <>
      {floating}
      {slot &&
        createPortal(
          <SidebarLive
            active={active}
            elapsed={elapsed}
            paused={paused}
            pending={pending}
            onTogglePause={togglePause}
            onOpen={() => {
              enterFullscreen();
              setFull(true);
            }}
            onStop={stop}
          />,
          slot,
        )}
      <div
        className={cn(
          "fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6",
          slot && "lg:hidden",
        )}
      >
        <div className="flex max-w-full items-center gap-3 rounded-full border border-line-2 bg-surface-3/95 py-1.5 pr-1.5 pl-4 shadow-e2 backdrop-blur-xl">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              paused ? "bg-medium" : "pulse-ring bg-success text-success",
            )}
          />
          <span className="min-w-0 truncate text-13">
            <span className="font-[600]">{paused ? "Paused" : "Studying"}</span>
            {active.label && <span className="text-ink-3"> · {active.label}</span>}
          </span>
          <span
            className={cn("num font-mono text-15", paused && "text-ink-3")}
            suppressHydrationWarning
          >
            {clock(elapsed)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Focus mode (full screen)"
            title="Focus mode"
            onClick={() => {
              enterFullscreen();
              setFull(true);
            }}
          >
            <Maximize2 size={13} aria-hidden="true" />
          </Button>
          {canPopout && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Pop out: float the timer over other tabs"
              title="Pop out over other tabs"
              onClick={() => void popout()}
            >
              <PictureInPicture2 size={13} aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            aria-label={paused ? "Resume study session" : "Pause study session"}
            onClick={togglePause}
          >
            {paused ? (
              <Play size={12} className="fill-current" aria-hidden="true" />
            ) : (
              <Pause size={12} className="fill-current" aria-hidden="true" />
            )}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="danger" size="sm" loading={pending && !end} onClick={stop}>
            <Square size={12} className="fill-current" aria-hidden="true" /> Stop
          </Button>
        </div>
      </div>
      {full && (
        <FocusScreen
          active={active}
          live={live}
          onPopout={canPopout ? () => void popout() : undefined}
          pending={pending}
          onTogglePause={togglePause}
          onStop={() => {
            setFull(false);
            stop();
          }}
          onClose={() => setFull(false)}
        />
      )}
      <StudySummaryModal
        summary={end}
        pending={pending}
        onClose={() => setEnd(null)}
        onSave={(discard) =>
          start(async () => {
            if (end && (await saveStudy(active, end, discard))) {
              setEnd(null);
              router.refresh();
            }
          })
        }
      />
    </>
  );
}

/**
 * The running session, docked at the bottom of the sidebar: a ring for the pomodoro block
 * (or the hour), the clock, and Pause, Open (focus mode) and Stop.
 */
function SidebarLive({
  active,
  elapsed,
  paused,
  pending,
  onTogglePause,
  onOpen,
  onStop,
}: {
  active: ActiveFocus;
  elapsed: number;
  paused: boolean;
  pending: boolean;
  onTogglePause: () => void;
  onOpen: () => void;
  onStop: () => void;
}) {
  const phase = focusPhase(active.mode, elapsed);
  const frac = phase ? 1 - phase.left / phase.length : (elapsed % 3_600_000) / 3_600_000;
  const C = 2 * Math.PI * 18;
  const tone = paused ? "var(--ink-3)" : "var(--amber)";
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-line-2 bg-[radial-gradient(160px_90px_at_0%_0%,var(--color-primary-soft),transparent_70%),var(--surface-2)] p-3">
      <div className="flex items-center gap-2.5">
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="shrink-0">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line-2)" strokeWidth="3" />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={tone}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
            transform="rotate(-90 22 22)"
          />
          <circle cx="22" cy="22" r="3" fill={tone} />
        </svg>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="label-mono" style={{ color: paused ? undefined : "var(--amber)" }}>
            {paused ? "Paused" : phase ? `Focus · round ${phase.round}` : "Focus"}
          </span>
          <span
            className="font-mono text-[20px] font-[600] tracking-[-0.02em]"
            suppressHydrationWarning
          >
            {phase && !paused ? clock(phase.left) : clock(elapsed)}
          </span>
        </div>
      </div>
      {active.label && <p className="truncate text-12 text-ink-3">{active.label}</p>}
      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          disabled={pending}
          onClick={onTogglePause}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={onOpen}>
          Open
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Stop and save the session"
          disabled={pending}
          onClick={onStop}
        >
          <Square size={12} className="fill-current" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

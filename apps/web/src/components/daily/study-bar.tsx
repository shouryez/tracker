"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BookOpenCheck, Maximize2, Pause, Play, Square } from "lucide-react";
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
import { focusElapsed, focusTotals } from "@/lib/focus";
import { labStart, labStop, type LabTotals } from "@/lib/ext-bridge";
import type { StudyContents } from "@/lib/study-data";
import { FocusScreen, enterFullscreen } from "./focus-screen";
import { StudyContentsList, studyCounts } from "./study-session";

const mins = (ms: number) => `${Math.round(ms / 60_000)}m`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export type StudyEnd = { wall: number; totals: LabTotals | null; contents: StudyContents | null };

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
          <div className="grid grid-cols-3 gap-2">
            {[
              [
                "Focus",
                summary.totals ? mins(summary.totals.focusMs) : mins(summary.wall),
                "text-success",
              ],
              ["Away", summary.totals ? mins(summary.totals.awayMs) : "—", "text-medium"],
              ["Switches", summary.totals ? String(summary.totals.switches) : "—", "text-ink"],
            ].map(([k, v, c]) => (
              <div key={k} className="surface-inset rounded-[14px] p-3 text-center">
                <p className="label-mono">{k}</p>
                <p className={cn("num mt-1 text-24", c)}>{v}</p>
              </div>
            ))}
          </div>
          {summary.contents && (
            <div className="flex flex-col gap-2">
              <p className="label-mono">
                In this session
                {studyCounts(summary.contents).length
                  ? ` · ${studyCounts(summary.contents).join(" · ")}`
                  : ""}
              </p>
              <StudyContentsList
                contents={summary.contents}
                className="max-h-[40vh] overflow-y-auto"
              />
            </div>
          )}
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
  return {
    wall: focusElapsed(active, Date.now()),
    totals: totals.tracking ? totals : null,
    contents,
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
          const ext = await labStart(res.id, res.startedAt);
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
export function StudyBar({ active }: { active: ActiveFocus | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [now, setNow] = useState(() => active?.startedAt ?? 0);
  const [end, setEnd] = useState<StudyEnd | null>(null);
  const [full, setFull] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!active || active.pausedAt) return;
    void labStart(active.id, active.startedAt); // re-attach the extension after a reload
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active || pathname === "/dashboard/sessions") return null;
  const paused = active.pausedAt !== null;
  const elapsed = focusElapsed(active, now || active.startedAt);
  const togglePause = () =>
    start(async () => {
      if ((await (paused ? resumeStudy(active) : pauseStudy(active))) !== false) router.refresh();
    });
  const stop = () => start(async () => setEnd(await endStudy(active)));

  return (
    <>
      <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-6">
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

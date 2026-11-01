"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Coffee, Maximize2, Pause, PictureInPicture2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button, ProgressRing, SegmentedControl, Tag, inputClasses } from "@upsolve/ui";
import { startFocus } from "@/app/actions/daily";
import { burst } from "@/components/dashboard/celebrate";
import { StudyBuddy } from "@/components/study-buddy";
import { buddyLevel, LEVEL_LABEL } from "@/lib/buddies";
import { labStart } from "@/lib/ext-bridge";
import type { ActiveFocus } from "@/lib/daily-data";
import {
  breakState,
  focusClock,
  focusElapsed,
  focusPhase,
  focusTotals,
  type FocusMode,
} from "@/lib/focus";
import {
  closePopout,
  maybeAutoPopout,
  popoutTimer,
  setAutoPopout,
  useAutoPauseSync,
  useAutoPopout,
  useCanPopout,
  useLabLive,
  useSharedPip,
} from "./focus-live";
import { FocusScreen, enterFullscreen } from "./focus-screen";
import {
  StudySummaryModal,
  endStudy,
  pauseStudy,
  resumeStudy,
  saveStudy,
  type StudyEnd,
} from "./study-bar";

type Mode = FocusMode;
const clock = focusClock;
const mins = (ms: number) => `${Math.round(ms / 60_000)}m`;
const phase = focusPhase;

/**
 * Lab mode: a YPT-style study timer. With the extension, time on coding sites counts as
 * focus and other tabs as away (only totals are stored, never which sites). Without it,
 * the wall-clock time counts.
 */
export function LabTimer({
  active,
  buddy = null,
}: {
  active: ActiveFocus | null;
  /** Your study buddy (Settings); it levels up as the session runs. */
  buddy?: string | null;
}) {
  const [running, setRunning] = useState<ActiveFocus | null>(active);
  const [mode, setMode] = useState<Mode>((active?.mode as Mode) ?? "pomodoro-25");
  const [label, setLabel] = useState("");
  const [now, setNow] = useState(() => active?.startedAt ?? 0);
  const [summary, setSummary] = useState<StudyEnd | null>(null);
  const [full, setFull] = useState(false);
  const pip = useSharedPip();
  const [pending, start] = useTransition();
  const lastRound = useRef<number | null>(null);
  const breakNow = useRef<() => void>(() => {});
  const canPopout = useCanPopout();
  const autoPopout = useAutoPopout();
  const router = useRouter();

  // The server's copy changed (a refresh after the extension paused or resumed it): use it.
  const [seenActive, setSeenActive] = useState(active);
  if (active !== seenActive) {
    setSeenActive(active);
    setRunning(active);
  }

  // Tick once a second while running, and on a pomodoro break (its countdown).
  useEffect(() => {
    if (!running) return;
    const onBreak = running.pausedAt && running.mode !== "stopwatch";
    if (running.pausedAt && !onBreak) return;
    if (!running.pausedAt) void labStart(running.id, running.startedAt); // re-attach after a reload
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running]);

  const paused = Boolean(running?.pausedAt);
  const live = useLabLive(running?.id ?? null);
  useAutoPauseSync(running ? paused : null, live);
  const totals = !paused && live?.tracking ? live : null;

  // The session ended: close the floating window with it.
  useEffect(() => {
    if (!running && pip) closePopout();
  }, [running, pip]);

  // The pop-out itself is drawn by the study bar (in the layout), shared by every page.
  async function popout() {
    setFull(false);
    await popoutTimer();
  }

  const elapsed = running ? focusElapsed(running, now || running.startedAt) : 0;
  const brk = running ? breakState(running, now || running.pausedAt || running.startedAt) : null;
  const shown = running ? focusTotals(running, totals) : null;
  const p = running ? phase((running.mode as Mode) ?? "stopwatch", elapsed) : null;

  // A focus block ended: confetti, and an offer to take a break (it never starts by itself).
  const round = p && !paused ? p.round : null;
  useEffect(() => {
    if (round === null) return;
    if (lastRound.current !== null && round > lastRound.current) {
      void burst({ small: true });
      toast("Focus block done", {
        description: "Take a break? The timer keeps counting focus until you do.",
        action: { label: "Take a break", onClick: () => breakNow.current() },
        duration: 15_000,
      });
    }
    lastRound.current = round;
  }, [round]);

  function begin() {
    start(async () => {
      const res = await startFocus(mode, label || null);
      if (!res.ok) return void toast.error(res.error);
      const f: ActiveFocus = {
        id: res.id,
        startedAt: res.startedAt,
        mode,
        label: label || null,
        pausedAt: null,
        pausedMs: 0,
        banked: { focusMs: 0, awayMs: 0, switches: 0, tracked: false },
      };
      setNow(Date.now());
      setRunning(f);
      const t = await labStart(res.id, res.startedAt);
      maybeAutoPopout();
      // The study bar (which draws the pop-out) learns about the session from the server.
      router.refresh();
      if (!t)
        toast("Timer started", {
          description: "Install the extension to separate focus from other tabs.",
        });
    });
  }

  function end() {
    if (!running) return;
    start(async () => setSummary(await endStudy(running)));
  }

  /** Pause banks the extension totals so far; resume starts a fresh tracking segment. */
  function togglePause() {
    if (!running) return;
    start(async () => {
      if (running.pausedAt) {
        if (!(await resumeStudy(running))) return;
        maybeAutoPopout();
        const t = Date.now();
        setRunning({
          ...running,
          pausedAt: null,
          pausedMs: running.pausedMs + (t - running.pausedAt),
        });
        setNow(t);
      } else {
        const res = await pauseStudy(running);
        if (res === false) return;
        const b = running.banked;
        setRunning({
          ...running,
          pausedAt: Date.now(),
          banked: res.add
            ? {
                focusMs: b.focusMs + res.add.focusMs,
                awayMs: b.awayMs + res.add.awayMs,
                switches: b.switches + res.add.switches,
                tracked: true,
              }
            : b,
        });
      }
    });
  }

  // The toast's button pauses (a break) with whatever state is current.
  useEffect(() => {
    breakNow.current = () => {
      if (running && !running.pausedAt) togglePause();
    };
  });

  function save(discard: boolean) {
    if (!running || !summary) return;
    start(async () => {
      if (!(await saveStudy(running, summary, discard))) return;
      setRunning(null);
      setSummary(null);
    });
  }

  if (!running) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="Timer mode"
            value={mode}
            onChange={setMode}
            items={[
              { value: "pomodoro-25", label: "25 / 5" },
              { value: "pomodoro-50", label: "50 / 10" },
              { value: "stopwatch", label: "Stopwatch" },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="lab-label" className="sr-only">
            What are you working on?
          </label>
          <input
            id="lab-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="What are you working on? (optional)"
            className={inputClasses({ className: "min-w-[220px] flex-1" })}
          />
          <Button variant="signal" size="lg" loading={pending} onClick={begin}>
            <Play size={16} className="fill-current" aria-hidden="true" /> Start focus
          </Button>
        </div>
        {canPopout && (
          <label className="flex w-fit cursor-pointer items-center gap-2 text-13 text-ink-2">
            <input
              type="checkbox"
              checked={autoPopout}
              onChange={(e) => setAutoPopout(e.target.checked)}
              className="size-4 accent-[var(--signal)]"
            />
            Pop out the timer when I start or resume, so it floats over other tabs
          </label>
        )}
        <p className="text-12 text-ink-3">
          With the extension, time on LeetCode, GFG, Codeforces, takeUforward and DSA videos counts
          as focus; any other tab counts as away. Only totals are saved, never which sites.
        </p>
      </div>
    );
  }

  const ring = brk
    ? {
        total: brk.length,
        value: Math.min(brk.length, brk.length - brk.left),
        color: "var(--info)",
      }
    : p
      ? { total: p.length, value: p.length - p.left, color: "var(--signal-mark)" }
      : { total: 60 * 60_000, value: elapsed % (60 * 60_000), color: "var(--signal-mark)" };

  const level = buddyLevel(paused ? "paused" : "studying", elapsed);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <StudyBuddy buddy={buddy} level={level} size={112} />
        <span className="text-11 text-ink-3">{LEVEL_LABEL[level]}</span>
      </div>
      <ProgressRing
        total={ring.total}
        size={176}
        stroke={12}
        segments={[{ label: "Progress", value: ring.value, color: ring.color }]}
        aria-label={`Focus timer ${clock(elapsed)}`}
      >
        <span className="tnum num text-36">
          {brk ? clock(Math.max(0, brk.left)) : clock(p ? p.left : elapsed)}
        </span>
        <span className="mt-1 text-11 text-ink-3">
          {brk
            ? brk.left > 0
              ? "break left"
              : "break over · resume"
            : p
              ? `focus · round ${p.round}`
              : "elapsed"}
        </span>
      </ProgressRing>
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {brk ? (
            <Tag tone="info">
              <Coffee size={11} aria-hidden="true" /> On a break
            </Tag>
          ) : paused ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-medium-soft px-2.5 py-1 text-12 font-[600] text-medium">
              <Pause size={11} className="fill-current" aria-hidden="true" /> Paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-success-line bg-success-soft px-2.5 py-1 text-12 font-[600] text-success">
              <span className="pulse-ring size-2 rounded-full bg-success text-success" /> In Lab
            </span>
          )}
          {running.label && <Tag>{running.label}</Tag>}
        </div>
        <p className="num text-30">
          {clock(elapsed)}
          <small className="ml-1.5 font-display text-[.5em] font-normal text-ink-3 italic">
            total
          </small>
        </p>
        {shown?.tracking ? (
          <div className="flex flex-wrap gap-2 text-12">
            <Tag tone="success">Focus {mins(shown.focusMs)}</Tag>
            <Tag tone="medium">Away {mins(shown.awayMs)}</Tag>
            <Tag>{shown.switches} tab switches</Tag>
          </div>
        ) : (
          <p className="text-12 text-ink-3">
            {brk
              ? "On a break: it doesn't count as focus, and the timer waits for you to resume."
              : paused
                ? "Paused: nothing counts until you resume."
                : "Counting wall-clock time (extension not detected)."}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pending} onClick={togglePause}>
            {paused ? (
              <Play size={14} className="fill-current" aria-hidden="true" />
            ) : (
              <Pause size={14} className="fill-current" aria-hidden="true" />
            )}
            {paused ? (brk ? "End break" : "Resume") : p ? "Take a break" : "Pause"}
          </Button>
          <Button variant="danger" disabled={pending} onClick={end}>
            <Square size={14} className="fill-current" aria-hidden="true" /> Stop
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              enterFullscreen();
              setFull(true);
            }}
          >
            <Maximize2 size={14} aria-hidden="true" /> Focus mode
          </Button>
          {canPopout && (
            <Button variant="ghost" onClick={() => void popout()}>
              <PictureInPicture2 size={14} aria-hidden="true" /> Pop out
            </Button>
          )}
        </div>
      </div>

      {full && (
        <FocusScreen
          active={running}
          live={live}
          onPopout={canPopout ? () => void popout() : undefined}
          pending={pending}
          onTogglePause={togglePause}
          onStop={() => {
            setFull(false);
            end();
          }}
          onClose={() => setFull(false)}
        />
      )}
      <StudySummaryModal
        summary={summary}
        pending={pending}
        onClose={() => setSummary(null)}
        onSave={save}
      />
    </div>
  );
}

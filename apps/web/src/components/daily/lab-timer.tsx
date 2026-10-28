"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Coffee, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button, ProgressRing, SegmentedControl, Tag, cn, inputClasses } from "@upsolve/ui";
import { startFocus, stopFocus } from "@/app/actions/daily";
import { burst } from "@/components/dashboard/celebrate";
import { Modal } from "@/components/fx/overlay";
import { labStart, labStatus, labStop, type LabTotals } from "@/lib/ext-bridge";
import type { ActiveFocus } from "@/lib/daily-data";

type Mode = "stopwatch" | "pomodoro-25" | "pomodoro-50";
const CYCLE: Record<Exclude<Mode, "stopwatch">, { work: number; rest: number }> = {
  "pomodoro-25": { work: 25, rest: 5 },
  "pomodoro-50": { work: 50, rest: 10 },
};

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const mins = (ms: number) => `${Math.round(ms / 60_000)}m`;

/** Where in a pomodoro cycle we are. Pure. */
function phase(mode: Mode, elapsedMs: number) {
  if (mode === "stopwatch") return null;
  const { work, rest } = CYCLE[mode];
  const cycle = (work + rest) * 60_000;
  const into = elapsedMs % cycle;
  const working = into < work * 60_000;
  const left = working ? work * 60_000 - into : cycle - into;
  const length = (working ? work : rest) * 60_000;
  return { working, left, length, round: Math.floor(elapsedMs / cycle) + 1 };
}

/**
 * Lab mode: a YPT-style study timer. With the extension, time on coding sites counts as
 * focus and other tabs as away (only totals are stored, never which sites). Without it,
 * the wall-clock time counts.
 */
export function LabTimer({ active }: { active: ActiveFocus | null }) {
  const [running, setRunning] = useState<ActiveFocus | null>(active);
  const [mode, setMode] = useState<Mode>((active?.mode as Mode) ?? "pomodoro-25");
  const [label, setLabel] = useState("");
  const [now, setNow] = useState(() => active?.startedAt ?? 0);
  const [totals, setTotals] = useState<LabTotals | null>(null);
  const [summary, setSummary] = useState<{ wall: number; totals: LabTotals | null } | null>(null);
  const [pending, start] = useTransition();
  const lastPhase = useRef<boolean | null>(null);

  // Tick once a second while running; poll the extension's totals every 5 s.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    let alive = true;
    const poll = async () => {
      const t = await labStatus(running.id);
      if (alive) setTotals(t?.tracking ? t : null);
    };
    void labStart(running.id, running.startedAt); // re-attach after a reload
    void poll();
    const pollId = window.setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
      clearInterval(pollId);
    };
  }, [running]);

  const elapsed = running ? Math.max(0, now - running.startedAt) : 0;
  const p = running ? phase((running.mode as Mode) ?? "stopwatch", elapsed) : null;

  // A small chime of confetti when a work block ends.
  useEffect(() => {
    if (!p) return;
    if (lastPhase.current === true && !p.working) {
      void burst({ small: true });
      toast("Break time", { description: "Stand up, drink water. The timer keeps running." });
    }
    lastPhase.current = p.working;
  }, [p?.working, p]);

  function begin() {
    start(async () => {
      const res = await startFocus(mode, label || null);
      if (!res.ok) return void toast.error(res.error);
      const f = { id: res.id, startedAt: res.startedAt, mode, label: label || null };
      setNow(Date.now());
      setRunning(f);
      const t = await labStart(res.id, res.startedAt);
      if (!t)
        toast("Timer started", {
          description: "Install the extension to separate focus from other tabs.",
        });
    });
  }

  async function end() {
    if (!running) return;
    const t = await labStop(running.id);
    setSummary({ wall: Date.now() - running.startedAt, totals: t?.tracking ? t : null });
  }

  function save(discard: boolean) {
    if (!running) return;
    const r = summary?.totals;
    start(async () => {
      const res = await stopFocus(
        running.id,
        r ? { focusMs: r.focusMs, awayMs: r.awayMs, switches: r.switches } : null,
        discard,
      );
      if (!res.ok) return void toast.error(res.error);
      setRunning(null);
      setTotals(null);
      setSummary(null);
      if (!discard) {
        void burst({ small: true });
        toast.success("Session saved", {
          description: `${mins(r?.focusMs ?? summary?.wall ?? 0)} of focus`,
        });
      }
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
        <p className="text-12 text-ink-3">
          With the extension, time on LeetCode, GFG, Codeforces, takeUforward and DSA videos counts
          as focus; any other tab counts as away. Only totals are saved, never which sites.
        </p>
      </div>
    );
  }

  const ring = p
    ? {
        total: p.length,
        value: p.length - p.left,
        color: p.working ? "var(--signal-mark)" : "var(--info)",
      }
    : { total: 60 * 60_000, value: elapsed % (60 * 60_000), color: "var(--signal-mark)" };

  return (
    <div className="flex flex-wrap items-center gap-6">
      <ProgressRing
        total={ring.total}
        size={176}
        stroke={12}
        segments={[{ label: "Progress", value: ring.value, color: ring.color }]}
        aria-label={`Focus timer ${clock(elapsed)}`}
      >
        <span className="tnum num text-36">{clock(p ? p.left : elapsed)}</span>
        <span className="mt-1 text-11 text-ink-3">
          {p ? (p.working ? `focus · round ${p.round}` : "break") : "elapsed"}
        </span>
      </ProgressRing>
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-success-line bg-success-soft px-2.5 py-1 text-12 font-[600] text-success">
            <span className="pulse-ring size-2 rounded-full bg-success text-success" /> In Lab
          </span>
          {running.label && <Tag>{running.label}</Tag>}
          {p && !p.working && (
            <Tag tone="info">
              <Coffee size={11} aria-hidden="true" /> Break
            </Tag>
          )}
        </div>
        <p className="num text-30">
          {clock(elapsed)}
          <small className="ml-1.5 font-display text-[.5em] font-normal text-ink-3 italic">
            total
          </small>
        </p>
        {totals ? (
          <div className="flex flex-wrap gap-2 text-12">
            <Tag tone="success">Focus {mins(totals.focusMs)}</Tag>
            <Tag tone="medium">Away {mins(totals.awayMs)}</Tag>
            <Tag>{totals.switches} tab switches</Tag>
          </div>
        ) : (
          <p className="text-12 text-ink-3">Counting wall-clock time (extension not detected).</p>
        )}
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => void end()}>
            <Square size={14} className="fill-current" aria-hidden="true" /> Stop
          </Button>
        </div>
      </div>

      <Modal
        open={summary !== null}
        onClose={() => setSummary(null)}
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
            {summary.totals && summary.totals.awayMs > 10 * 60_000 && (
              <p className="text-13 text-ink-2">
                You were away for {mins(summary.totals.awayMs)}. Away time never counts as focus.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={pending} onClick={() => save(true)}>
                Discard
              </Button>
              <Button variant="signal" loading={pending} onClick={() => save(false)}>
                <Pause size={14} aria-hidden="true" /> Save session
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

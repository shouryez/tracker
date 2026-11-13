"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Briefcase, Check, ExternalLink, Flag, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardHeader, CardSub, CardTitle, DifficultyTag, cn } from "@upsolve/ui";
import { startFocus } from "@/app/actions/daily";
import { drawInterviewSet, interviewReport, type InterviewResult } from "@/app/actions/interview";
import { burst } from "@/components/dashboard/celebrate";
import { endStudy, saveStudy } from "@/components/daily/study-bar";
import { maybeAutoPopout } from "@/components/daily/focus-live";
import { SplitFlapCountdown } from "@/components/fx/split-flap";
import { SignalType } from "@/components/fx/signal-type";
import type { ActiveFocus } from "@/lib/daily-data";
import { labStart } from "@/lib/ext-bridge";
import { feel } from "@/lib/feel";
import { INTERVIEW_PRESETS, type InterviewPresetId, type InterviewProblem } from "@/lib/interview";

type Phase =
  | { at: "setup" }
  | { at: "ready"; preset: InterviewPresetId; problems: InterviewProblem[] }
  | {
      at: "running";
      preset: InterviewPresetId;
      problems: InterviewProblem[];
      startedAt: number;
      focusId: string | null; // null: an existing session was reused; we won't stop it
      opened: Set<string>;
      over: boolean;
    }
  | {
      at: "report";
      preset: InterviewPresetId;
      problems: InterviewProblem[];
      startedAt: number;
      results: InterviewResult[];
    };

const mins = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} min`;

/** One line, the way an interviewer would put it. */
function verdict(problems: InterviewProblem[], results: InterviewResult[]) {
  const solved = results.filter((r) => r.solved);
  const slow = results.find((r) => r.solved && r.medianMs && r.activeMs! > r.medianMs * 1.5);
  const leaned = solved.some((r) => r.independence === "solution");
  if (solved.length === results.length) {
    if (leaned)
      return "Everything out, but you saw a solution: an interviewer would probe that one again.";
    if (slow) {
      const p = problems.find((x) => x.id === slow.problemId);
      return `Hire signal: all solved. Watch the clock on ${p?.title ?? "the slow one"} — pace is the last gap.`;
    }
    return "Strong hire signal: everything solved, on your own, inside the clock.";
  }
  if (solved.length > 0)
    return `Mixed round: ${solved.length} of ${results.length}. Interviews reward a clean partial — write up what blocked the rest.`;
  const tried = results.filter((r) => r.attempted).length;
  return tried
    ? "No accepts this time. That's a normal mock — drill the patterns these needed and rerun the same mix."
    : "Nothing attempted reached the judge. Open the problems from here next time so the timer can see them.";
}

/**
 * Mock interview room (FEATURES-PLAN F1): draw a hidden set, run it on the clock with the
 * extension timing each problem, then get the scorecard. Sessions land in Sessions like any
 * study session.
 */
export function InterviewRoom() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ at: "setup" });
  const [pending, start] = useTransition();
  const [, tick] = useState(0);
  const over = useRef(false);

  // The clock: re-render each second while running; mark time-up once.
  useEffect(() => {
    if (phase.at !== "running") return;
    const end = phase.startedAt + INTERVIEW_PRESETS[phase.preset].minutes * 60_000;
    const id = window.setInterval(() => {
      tick((n) => n + 1);
      if (!over.current && Date.now() >= end) {
        over.current = true;
        feel.soft();
        setPhase((p) => (p.at === "running" ? { ...p, over: true } : p));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const draw = (preset: InterviewPresetId) =>
    start(async () => {
      const res = await drawInterviewSet(preset);
      if (!res.ok) return void toast.error(res.error);
      feel.tick();
      setPhase({ at: "ready", preset, problems: res.problems });
    });

  const begin = () =>
    start(async () => {
      if (phase.at !== "ready") return;
      const label = `Mock interview · ${INTERVIEW_PRESETS[phase.preset].label}`;
      const res = await startFocus("stopwatch", label);
      if (!res.ok) return void toast.error(res.error);
      if (!res.existing) {
        await labStart(res.id, res.startedAt);
        maybeAutoPopout();
      } else {
        toast("Using your running study session", {
          description: "It keeps timing; the countdown here is the interview clock.",
        });
      }
      over.current = false;
      feel.success();
      setPhase({
        at: "running",
        preset: phase.preset,
        problems: phase.problems,
        startedAt: Date.now(),
        focusId: res.existing ? null : res.id,
        opened: new Set(),
        over: false,
      });
    });

  const finish = () =>
    start(async () => {
      if (phase.at !== "running") return;
      const results = await interviewReport(
        phase.problems.map((p) => p.id),
        phase.startedAt,
      );
      if (!results) return void toast.error("Couldn't read the round. Try again.");
      // Close the session we opened (an inherited one stays yours to stop).
      if (phase.focusId) {
        const active: ActiveFocus = {
          id: phase.focusId,
          startedAt: phase.startedAt,
          mode: "stopwatch",
          label: `Mock interview · ${INTERVIEW_PRESETS[phase.preset].label}`,
          pausedAt: null,
          pausedMs: 0,
          banked: { focusMs: 0, awayMs: 0, switches: 0, tracked: false },
        };
        await saveStudy(active, await endStudy(active), false);
      }
      if (results.every((r) => r.solved)) {
        void burst();
        feel.milestone();
      }
      setPhase({
        at: "report",
        preset: phase.preset,
        problems: phase.problems,
        startedAt: phase.startedAt,
        results,
      });
      router.refresh();
    });

  if (phase.at === "setup")
    return (
      <div className="grid gap-3.5 sm:grid-cols-2">
        {(Object.keys(INTERVIEW_PRESETS) as InterviewPresetId[]).map((id) => {
          const p = INTERVIEW_PRESETS[id];
          return (
            <Card key={id} interactive className="flex flex-col gap-3">
              <CardHeader className="mb-0">
                <CardTitle icon={<Briefcase size={15} />}>{p.label}</CardTitle>
                <CardSub>{p.minutes} min</CardSub>
              </CardHeader>
              <p className="flex flex-wrap gap-1.5">
                {p.mix.map((d, i) => (
                  <DifficultyTag key={i} difficulty={d} />
                ))}
              </p>
              <p className="text-13 text-ink-2">
                {id === "screen" &&
                  "The warm-up round: one easy to settle in, one medium to prove it."}
                {id === "phone" && "The classic phone screen: two mediums, clean and quick."}
                {id === "onsite" &&
                  "A real onsite block: a medium, then a hard with time pressure."}
                {id === "final" && "The long round: three problems, pacing is the whole game."}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-auto self-start"
                loading={pending}
                onClick={() => draw(id)}
              >
                Draw my set
              </Button>
            </Card>
          );
        })}
      </div>
    );

  const preset = INTERVIEW_PRESETS[phase.preset];

  if (phase.at === "ready")
    return (
      <Card className="flex flex-col gap-5">
        <CardHeader className="mb-0">
          <CardTitle icon={<Briefcase size={15} />}>{preset.label} · set drawn</CardTitle>
          <CardSub>{preset.minutes} min</CardSub>
        </CardHeader>
        <ul className="grid gap-2 sm:grid-cols-3">
          {phase.problems.map((p, i) => (
            <li
              key={p.id}
              className="surface-inset flex flex-col gap-2 rounded-[16px] p-4"
              aria-label={`Problem ${i + 1}: ${p.difficulty}, hidden until you start`}
            >
              <span className="text-13 font-[650]">Problem {i + 1}</span>
              <span className="font-mono text-15 tracking-[.2em] text-ink-3" aria-hidden="true">
                ████████
              </span>
              <DifficultyTag difficulty={p.difficulty} />
            </li>
          ))}
        </ul>
        <p className="text-13 text-ink-2">
          Titles stay hidden until the clock starts. Open each problem from here so the extension
          times it; no notes, no peeking at your ladder.
        </p>
        <div className="flex gap-2">
          <Button variant="signal" loading={pending} onClick={begin}>
            <Play size={14} className="fill-current" aria-hidden="true" /> Start the clock
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setPhase({ at: "setup" })}>
            Different round
          </Button>
        </div>
      </Card>
    );

  if (phase.at === "running") {
    const end = phase.startedAt + preset.minutes * 60_000;
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle icon={<Briefcase size={15} />}>
            {preset.label} · {phase.over ? "time" : "running"}
          </CardTitle>
          <SplitFlapCountdown to={end} />
        </div>
        {phase.over && (
          <p className="rounded-[14px] bg-primary-soft px-4 py-3 text-13 font-[600] text-primary">
            Time. In a real round you&apos;d be summarising now — get your scorecard.
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {phase.problems.map((p, i) => {
            const opened = phase.opened.has(p.id);
            return (
              <li
                key={p.id}
                className="surface-inset flex flex-wrap items-center gap-3 rounded-[16px] px-4 py-3"
              >
                <span className="text-13 font-[650] text-ink-3">#{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-14 font-[600]">
                  {opened ? (
                    p.title
                  ) : (
                    <span className="font-mono tracking-[.2em] text-ink-3">████████</span>
                  )}
                </span>
                <DifficultyTag difficulty={p.difficulty} />
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    setPhase((ph) =>
                      ph.at === "running" ? { ...ph, opened: new Set(ph.opened).add(p.id) } : ph,
                    )
                  }
                  className="glass-control inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[600] text-ink hover:-translate-y-px"
                >
                  {opened ? "Reopen" : "Open"} <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3">
          <Button variant="signal" loading={pending} onClick={finish}>
            <Flag size={14} aria-hidden="true" /> Finish · scorecard
          </Button>
          <span className="text-12 text-ink-3">
            Solve on the platform as usual; Accepted lands here by itself.
          </span>
        </div>
      </Card>
    );
  }

  // Report
  const solved = phase.results.filter((r) => r.solved).length;
  return (
    <Card className="flex flex-col gap-5">
      <CardHeader className="mb-0">
        <CardTitle icon={<Briefcase size={15} />}>
          <SignalType
            text={`${solved} of ${phase.results.length} solved`}
            trigger="mount"
            glowColor={solved === phase.results.length ? "var(--signal)" : "var(--amber)"}
            interference={0}
            clickCycle={false}
          />
        </CardTitle>
        <CardSub>{preset.label}</CardSub>
      </CardHeader>
      <ul className="flex flex-col gap-2">
        {phase.problems.map((p) => {
          const r = phase.results.find((x) => x.problemId === p.id)!;
          const pace =
            r.solved && r.activeMs && r.medianMs
              ? r.activeMs <= r.medianMs
                ? "faster than the median"
                : `${(r.activeMs / r.medianMs).toFixed(1)}× the median`
              : null;
          return (
            <li
              key={p.id}
              className="surface-inset flex flex-wrap items-center gap-3 rounded-[16px] px-4 py-3"
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  r.solved ? "bg-[var(--signal-mark)] text-signal-ink" : "bg-bad-soft text-bad",
                )}
              >
                {r.solved ? <Check size={13} /> : <X size={13} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-14 font-[600]">{p.title}</span>
              <DifficultyTag difficulty={p.difficulty} />
              <span className="tnum text-12 text-ink-2">
                {r.activeMs
                  ? `${mins(r.activeMs)}${pace ? ` · ${pace}` : ""}`
                  : r.attempted
                    ? "attempted"
                    : "not opened"}
                {r.independence && r.independence !== "solo" && ` · ${r.independence}`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="rounded-[14px] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] px-4 py-3 text-13 leading-relaxed text-ink-2">
        <span className="font-[650] text-ink">Interviewer&apos;s note: </span>
        {verdict(phase.problems, phase.results)}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setPhase({ at: "setup" })}>
          Another round
        </Button>
      </div>
    </Card>
  );
}

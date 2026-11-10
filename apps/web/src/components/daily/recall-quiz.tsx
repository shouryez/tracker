"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Check, RotateCcw, Timer, X } from "lucide-react";
import { Button, ButtonArrow, DifficultyTag, cn } from "@upsolve/ui";
import { recordRecall } from "@/app/actions/daily";
import { burst } from "@/components/dashboard/celebrate";
import type { RecallCard } from "@/lib/daily-data";

// Read the wall clock from event handlers only (never during render).
const clock = () => Date.now();
const LIMIT_MS = 2 * 60_000;

/**
 * 2-minute recall: for each of your solved problems, name the pattern, then see the key
 * idea and your own takeaway. Active recall in the time it takes to wait for a lift.
 */
export function RecallQuiz({ cards, round }: { cards: RecallCard[]; round: number }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  // Per card: true = right, false = missed (for the progress pips).
  const [results, setResults] = useState<boolean[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [, start] = useTransition();
  const card = cards[i];
  const finished = i >= cards.length;

  useEffect(() => {
    if (startedAt === null || finished) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt, finished]);

  useEffect(() => {
    if (finished && score === cards.length && cards.length > 0) void burst();
  }, [finished, score, cards.length]);

  const left = startedAt === null ? LIMIT_MS : Math.max(0, LIMIT_MS - (now - startedAt));

  function next() {
    setPicked(null);
    setI((n) => n + 1);
  }

  // Keys 1–4 pick an answer, Enter goes to the next card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (!card) return;
      const n = Number(e.key);
      if (!picked && n >= 1 && n <= card.options.length) answer(card.options[n - 1]!.id);
      else if (picked && e.key === "Enter") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function answer(id: string) {
    if (!card || picked) return;
    if (startedAt === null) {
      const t = clock();
      setStartedAt(t);
      setNow(t);
    }
    setPicked(id);
    const correct = id === card.answer;
    if (correct) setScore((s) => s + 1);
    setResults((r) => [...r, correct]);
    start(async () => {
      await recordRecall(card.problemId, correct);
    });
  }

  if (cards.length === 0) {
    return (
      <p className="text-14 text-ink-2">
        Solve a few problems first. The quiz is built from your own solved problems.
      </p>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="num text-[64px]">
          {score}
          <span className="text-ink-3">/{cards.length}</span>
        </p>
        <p className="text-16 text-ink-2">
          {score === cards.length
            ? "Perfect recall."
            : score >= cards.length - 1
              ? "Almost there."
              : "The misses are now fresher in your memory. That's the point."}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/recall?round=${round + 1}`}
            className="inline-flex h-[42px] items-center gap-2 rounded-full bg-signal px-[18px] text-14 font-[550] text-signal-ink transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-glow-signal"
          >
            <RotateCcw size={14} aria-hidden="true" /> Another round
          </Link>
          <Link
            href="/dashboard/today"
            className="inline-flex h-[42px] items-center gap-2 rounded-full border border-line-2 px-[18px] text-14 font-[550] hover:bg-surface-2"
          >
            Back to today <ButtonArrow />
          </Link>
        </div>
      </div>
    );
  }

  const correct = picked === card!.answer;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="flex flex-1 gap-1.5" aria-label={`Card ${i + 1} of ${cards.length}`}>
          {cards.map((c, k) => (
            <span
              key={c.problemId}
              className="h-1 flex-1 rounded-full transition-colors duration-[var(--dur-base)]"
              style={{
                background:
                  k < results.length
                    ? results[k]
                      ? "var(--signal)"
                      : "var(--rose)"
                    : k === i
                      ? "var(--ink)"
                      : "var(--surface-4)",
              }}
            />
          ))}
        </div>
        <span
          className={cn(
            "tnum inline-flex items-center gap-1.5 font-mono text-13",
            left < 20_000 ? "text-hard" : "text-ink-3",
          )}
        >
          <Timer size={14} aria-hidden="true" />
          {Math.floor(left / 60_000)}:{String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}
        </span>
      </div>

      <div
        key={card!.problemId}
        className="flex animate-[slide-in-r_var(--dur-slow)_var(--ease-out)] flex-col gap-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-mono">
            Card {i + 1} of {cards.length}
          </span>
          <span className="ml-auto">
            {card!.difficulty && <DifficultyTag difficulty={card!.difficulty} />}
          </span>
        </div>
        <h2 className="text-[28px] leading-tight font-[620] tracking-[-0.03em]">{card!.title}</h2>

        <fieldset className="m-0 grid gap-2.5 border-0 p-0 sm:grid-cols-2">
          <legend className="mb-2.5 label-mono">Which idea?</legend>
          {card!.options.map((o, k) => {
            const isAnswer = o.id === card!.answer;
            const isPicked = o.id === picked;
            return (
              <button
                key={o.id}
                type="button"
                disabled={Boolean(picked)}
                onClick={() => answer(o.id)}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-[14px] border px-4 text-left text-15 font-[550] transition-[background-color,border-color,transform] active:scale-[.98]",
                  !picked && "border-line bg-surface-2 hover:border-line-3 hover:bg-surface-3",
                  picked && isAnswer && "border-signal bg-signal-soft",
                  picked && isPicked && !isAnswer && "border-hard-line bg-hard-soft",
                  picked && !isPicked && !isAnswer && "border-line opacity-50",
                )}
              >
                <span className="font-mono text-12 text-ink-3">{k + 1}</span>
                <span className="flex-1">{o.label}</span>
                {picked && isPicked && (
                  <span className={cn("text-12", isAnswer ? "text-signal-text" : "text-hard")}>
                    Your pick
                  </span>
                )}
                {picked && isAnswer && !isPicked && (
                  <Check size={16} className="text-signal-text" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </fieldset>

        {picked && (
          <div
            className={cn(
              "flex animate-[rise-in_var(--dur-slow)_var(--ease-out)] flex-wrap items-center gap-3 rounded-[14px] px-4 py-3.5",
              correct ? "bg-signal-soft" : "bg-hard-soft",
            )}
          >
            {correct ? (
              <Check size={20} className="shrink-0 text-signal-text" aria-hidden="true" />
            ) : (
              <X size={20} className="shrink-0 text-hard" aria-hidden="true" />
            )}
            <div className="min-w-[240px] flex-1 text-[13.5px]">
              <p>
                {correct ? "Right. " : "Not quite. "}
                {card!.reveal.idea}
              </p>
              {card!.reveal.takeaway && (
                <p className="mt-1.5 text-ink-2">
                  <span className="text-ink-3">You wrote: </span>
                  {card!.reveal.takeaway}
                </p>
              )}
            </div>
            <Button variant="signal" onClick={next}>
              {i + 1 === cards.length ? "See score" : "Next card"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-12 text-ink-3">
        <span>Keys 1–{card!.options.length} pick an answer · Enter for next</span>
        <Link href={`/dashboard/problems/${card!.problemId}`} className="hover:text-ink">
          Open my notes
        </Link>
      </div>
    </div>
  );
}

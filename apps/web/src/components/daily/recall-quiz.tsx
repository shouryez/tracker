"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Check, RotateCcw, Timer, X } from "lucide-react";
import { Button, ButtonArrow, DifficultyTag, LinearProgress, cn } from "@upsolve/ui";
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
        <LinearProgress
          value={i + (picked ? 1 : 0)}
          max={cards.length}
          height={6}
          color="var(--violet)"
          aria-label="Quiz progress"
          className="flex-1"
        />
        <span
          className={cn(
            "tnum inline-flex items-center gap-1.5 text-13",
            left < 20_000 ? "text-hard" : "text-ink-3",
          )}
        >
          <Timer size={14} aria-hidden="true" />
          {Math.floor(left / 60_000)}:{String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}
        </span>
      </div>

      <div key={card!.problemId} className="animate-[slide-in-r_var(--dur-slow)_var(--ease-out)]">
        <p className="label-mono">
          Card {i + 1} of {cards.length} · which pattern solves it?
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-24 font-[600] tracking-[-0.02em]">
          {card!.title}
          {card!.difficulty && <DifficultyTag difficulty={card!.difficulty} />}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {card!.options.map((o) => {
            const isAnswer = o.id === card!.answer;
            const isPicked = o.id === picked;
            return (
              <button
                key={o.id}
                type="button"
                disabled={Boolean(picked)}
                onClick={() => answer(o.id)}
                className={cn(
                  "flex h-14 items-center justify-between rounded-[14px] border px-4 text-left text-15 font-[550] transition-[background-color,border-color,transform] active:scale-[.98]",
                  !picked && "border-line-2 bg-surface-2 hover:border-line-3 hover:bg-surface-3",
                  picked && isAnswer && "border-success-line bg-success-soft text-success",
                  picked && isPicked && !isAnswer && "border-hard-line bg-hard-soft text-hard",
                  picked && !isPicked && !isAnswer && "border-line opacity-50",
                )}
              >
                {o.label}
                {picked && isAnswer && <Check size={18} aria-hidden="true" />}
                {picked && isPicked && !isAnswer && <X size={18} aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-5 flex animate-[rise-in_var(--dur-slow)_var(--ease-out)] flex-col gap-3">
            <div className="surface-inset rounded-[14px] p-4">
              <p className="label-mono">{correct ? "Right. The key idea" : "The key idea"}</p>
              <p className="mt-1.5 text-14">{card!.reveal.idea}</p>
              {card!.reveal.takeaway && (
                <p className="mt-3 text-14">
                  <span className="mr-1.5 text-signal-text">→ you wrote:</span>
                  {card!.reveal.takeaway}
                </p>
              )}
              {card!.reveal.note && !card!.reveal.takeaway && (
                <p className="mt-3 line-clamp-3 text-13 whitespace-pre-line text-ink-2">
                  {card!.reveal.note}
                </p>
              )}
            </div>
            <Button
              variant="signal"
              className="self-end"
              onClick={() => {
                setPicked(null);
                setI((n) => n + 1);
              }}
            >
              {i + 1 === cards.length ? "See score" : "Next card"} <ButtonArrow />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// DsaKaro

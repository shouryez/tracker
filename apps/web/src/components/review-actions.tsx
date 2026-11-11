"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, Clock3, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { Button, cn } from "@upsolve/ui";
import { logReview, undoReview, type ReviewActionName } from "@/app/actions/learning";
import { burstFrom } from "@/components/dashboard/celebrate";

const MANUAL: {
  action: ReviewActionName;
  label: string;
  hint: string;
  Icon: typeof Check;
  tone: string;
}[] = [
  {
    action: "remembered",
    label: "Remembered",
    hint: "You could still solve it. Next review further out.",
    Icon: Check,
    tone: "text-easy data-[on]:bg-easy data-[on]:text-[#04201d] hover:bg-easy-soft",
  },
  {
    action: "shaky",
    label: "Shaky",
    hint: "Partly. Same interval again.",
    Icon: Minus,
    tone: "text-medium data-[on]:bg-medium data-[on]:text-[#241600] hover:bg-medium-soft",
  },
  {
    action: "forgot",
    label: "Forgot",
    hint: "Back to tomorrow.",
    Icon: X,
    tone: "text-hard data-[on]:bg-hard data-[on]:text-white hover:bg-hard-soft",
  },
];

/**
 * "I revised it without the extension": a 3-way segmented self-grade
 * (Remembered teal ✓ · Shaky amber ~ · Forgot rose ✕). The chosen segment flashes its colour.
 * Manual reviews are graded more cautiously than a re-solve the extension saw (max 16 days).
 */
export function ManualReview({ problemId, className }: { problemId: string; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<ReviewActionName | null>(null);
  const run = (action: ReviewActionName, el: HTMLElement) =>
    startTransition(async () => {
      setDone(action);
      if (action === "remembered") void burstFrom(el);
      await logReview(problemId, action);
      toast.success(
        action === "remembered"
          ? "Nice. Next review moved further out"
          : action === "shaky"
            ? "Same interval again"
            : "Back tomorrow",
        {
          action: {
            label: "Undo",
            onClick: () => {
              setDone(null);
              void undoReview(problemId, action);
            },
          },
        },
      );
    });

  return (
    <div
      role="group"
      aria-label="Grade yourself (revised without the extension)"
      className={cn(
        "inline-flex rounded-full border border-line-2 bg-surface-inset p-[3px] shadow-inset",
        className,
      )}
    >
      {MANUAL.map((m) => (
        <button
          key={m.action}
          type="button"
          disabled={pending}
          title={m.hint}
          aria-pressed={done === m.action}
          data-on={done === m.action || undefined}
          onClick={(e) => run(m.action, e.currentTarget)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-12 font-[600] transition-[background-color,color,transform] duration-[var(--dur-fast)] active:scale-95 disabled:opacity-60",
            "data-[on]:animate-[pop-in_var(--dur-slow)_var(--ease-spring)]",
            m.tone,
          )}
        >
          <m.Icon size={13} strokeWidth={2.5} aria-hidden="true" />
          <span className="hidden sm:inline">{m.label}</span>
          <span className="sr-only sm:hidden">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Takes a problem out of the revision queue, or puts it back. */
export function RetireButton({ problemId, retired }: { problemId: string; retired: boolean }) {
  const [pending, startTransition] = useTransition();
  const Icon = retired ? ArchiveRestore : Archive;
  const label = retired ? "Back into revision" : "Stop revising this";
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      title={label}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          const action = retired ? "restore" : "retire";
          await logReview(problemId, action);
          toast.success(retired ? "Back in your revision queue" : "Removed from revision", {
            action: { label: "Undo", onClick: () => void undoReview(problemId, action) },
          });
        })
      }
      className="h-[30px] px-2"
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {retired && <span className="text-[12.5px]">Restore</span>}
    </Button>
  );
}

/** "Not today": a due revision comes back tomorrow, on the same rung. Undo from the toast. */
export function SnoozeButton({ problemId }: { problemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      title="Not today: bring it back tomorrow"
      onClick={() =>
        startTransition(async () => {
          await logReview(problemId, "snooze");
          toast("Back tomorrow, same rung", {
            action: { label: "Undo", onClick: () => void undoReview(problemId, "snooze") },
          });
        })
      }
      className="h-[30px] px-2.5"
    >
      <Clock3 size={14} strokeWidth={1.75} aria-hidden="true" />
      <span className="text-[12.5px]">Not today</span>
    </Button>
  );
}

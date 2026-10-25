"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button, cn } from "@upsolve/ui";
import { logReview, type ReviewActionName } from "@/app/actions/learning";

const MANUAL: { action: ReviewActionName; label: string; hint: string }[] = [
  {
    action: "remembered",
    label: "Remembered",
    hint: "You could still solve it. Next review further out.",
  },
  { action: "shaky", label: "Shaky", hint: "Partly. Same interval again." },
  { action: "forgot", label: "Forgot", hint: "Back to tomorrow." },
];

/**
 * "I revised it without the extension" buttons. Manual reviews are graded more
 * cautiously than a re-solve the extension saw (they can't go past 16 days).
 */
export function ManualReview({ problemId, className }: { problemId: string; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<ReviewActionName | null>(null);
  const run = (action: ReviewActionName) =>
    startTransition(async () => {
      setDone(action);
      await logReview(problemId, action);
    });

  return (
    <div
      role="group"
      aria-label="Mark revised without the extension"
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      {MANUAL.map((m) => (
        <Button
          key={m.action}
          size="sm"
          variant={done === m.action ? "secondary" : "ghost"}
          disabled={pending}
          title={m.hint}
          onClick={() => run(m.action)}
          className="h-[30px] px-2.5 text-[12.5px]"
        >
          {m.label}
        </Button>
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
      disabled={pending}
      title={label}
      aria-label={label}
      onClick={() =>
        startTransition(async () => {
          await logReview(problemId, retired ? "restore" : "retire");
        })
      }
      className="h-[30px] px-2"
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {retired && <span className="text-[12.5px]">Restore</span>}
    </Button>
  );
}

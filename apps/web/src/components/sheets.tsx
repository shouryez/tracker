"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button, cn } from "@upsolve/ui";
import { setSheetFollowed, setSheetItemDone } from "@/app/actions/sheets";

export function FollowButton({ sheetId, following }: { sheetId: string; following: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(following);
  return (
    <Button
      size="sm"
      variant={optimistic ? "secondary" : "indigo"}
      disabled={pending}
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setSheetFollowed(sheetId, !optimistic);
        })
      }
    >
      {optimistic ? (
        <>
          <Check size={14} aria-hidden="true" /> Following
        </>
      ) : (
        "Follow"
      )}
    </Button>
  );
}

/** The tick mark; draws itself (stroke-dashoffset) when `on` flips to true. */
function TickMark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="16"
        strokeDashoffset={on ? 0 : 16}
        className="transition-[stroke-dashoffset] duration-[var(--dur-slow)] ease-[var(--ease-out)]"
      />
    </svg>
  );
}

/** Square tick for one sheet item. Auto-solved items are read-only. */
export function ItemTick({
  sheetId,
  itemKey,
  status,
  title,
}: {
  sheetId: string;
  itemKey: string;
  status: "auto" | "manual" | null;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);

  if (optimistic === "auto") {
    return (
      <span
        title="Solved on a connected platform"
        className="grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-ink text-bg"
      >
        <TickMark on />
        <span className="sr-only">Solved</span>
      </span>
    );
  }

  const done = optimistic === "manual";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`Mark "${title}" ${done ? "not done" : "done"}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(done ? null : "manual");
          await setSheetItemDone(sheetId, itemKey, !done);
          if (!done) toast.success("Marked done", { description: title });
        })
      }
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] transition-[background-color,border-color,transform] duration-[var(--dur-base)] ease-[var(--ease-spring)] active:scale-90",
        done
          ? "scale-100 bg-ink-2 text-bg"
          : "hatch border border-line-2 hover:scale-110 hover:border-ink-3",
      )}
    >
      <TickMark on={done} />
    </button>
  );
}

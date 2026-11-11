"use client";

import { useOptimistic, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, CheckDraw, cn } from "@upsolve/ui";
import { setSheetFollowed, setSheetItemDone } from "@/app/actions/sheets";
import { burstFrom } from "@/components/dashboard/celebrate";
import { SHEET_TICK, type SheetTick } from "@/components/sheet-progress";
import { flyTo, visible } from "@/lib/fly";

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
          <CheckDraw size={14} className="text-success" /> Following
        </>
      ) : (
        <>
          <Plus size={14} aria-hidden="true" data-nudge="plus" /> Follow
        </>
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
  step,
}: {
  sheetId: string;
  itemKey: string;
  status: "auto" | "manual" | null;
  title: string;
  /** The item's step, so live counts on the page can update at once. */
  step?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(status);

  if (optimistic === "auto") {
    return (
      <span
        data-ticked=""
        title="Solved on a connected platform"
        className="grid size-5 shrink-0 place-items-center rounded-[6px] bg-success text-[#06210f] shadow-[0_0_10px_-4px_var(--success)]"
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
      data-ticked={done ? "" : undefined}
      aria-label={`Mark "${title}" ${done ? "not done" : "done"}`}
      disabled={pending}
      onClick={(e) => {
        const el = e.currentTarget;
        if (step)
          window.dispatchEvent(
            new CustomEvent<SheetTick>(SHEET_TICK, { detail: { step, delta: done ? -1 : 1 } }),
          );
        // The tick flies into the sheet's progress bar (header, or the floating strip).
        if (!done) flyTo(el, visible("[data-sheet-progress]"));
        startTransition(async () => {
          setOptimistic(done ? null : "manual");
          if (!done) void burstFrom(el);
          await setSheetItemDone(sheetId, itemKey, !done);
          if (!done) toast.success("Marked done", { description: title });
        });
      }}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[6px] relative before:absolute before:-inset-2.5 before:content-[''] transition-[background-color,border-color,transform,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-spring)] active:scale-90",
        done
          ? "animate-[pop-in_var(--dur-slow)_var(--ease-spring)] bg-success text-[#06210f] shadow-[0_0_10px_-4px_var(--success)]"
          : "border-[1.5px] border-line-3 bg-surface-2 hover:scale-110 hover:border-ink-3",
      )}
    >
      <TickMark on={done} />
    </button>
  );
}

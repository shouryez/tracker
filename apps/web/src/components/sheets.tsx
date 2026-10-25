"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
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
        className="grid size-[18px] shrink-0 place-items-center rounded-[4px] bg-ink text-bg"
      >
        <Check size={12} strokeWidth={3} aria-label="Solved" />
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
        })
      }
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[4px] transition-colors duration-[240ms]",
        done ? "bg-ink-3 text-bg" : "hatch border border-line-2 hover:border-ink-3",
      )}
    >
      {done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

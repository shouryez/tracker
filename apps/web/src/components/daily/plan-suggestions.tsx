"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ArrowUpRight, ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, DifficultyTag, Tag, cn } from "@upsolve/ui";
import { addSheetItemsToPlan, addSuggestionsToPlan, type AddResult } from "@/app/actions/daily";
import type { PlanSuggestion, SheetPick } from "@/lib/plan";
import { KIND } from "./today-plan";

function report(res: AddResult) {
  if (res.ok) toast.success(res.added === 1 ? "Added to today" : `Added ${res.added} to today`);
  else toast.error(res.error);
}

function AddButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-full border border-line-2 text-ink-2 transition-[color,background-color,border-color,transform] duration-[var(--dur-base)] hover:border-signal-2 hover:bg-signal hover:text-signal-ink active:scale-95 disabled:opacity-40"
    >
      <Plus size={15} aria-hidden="true" />
    </button>
  );
}

/** Today's suggestions, beside the to-do list: add one, or all at once. */
export function PlanSuggestions({ suggestions }: { suggestions: PlanSuggestion[] }) {
  const [pending, start] = useTransition();
  const [shown, hide] = useOptimistic(suggestions, (state, keys: string[]) =>
    state.filter((s) => !keys.includes(s.key)),
  );

  function add(keys: string[]) {
    start(async () => {
      hide(keys);
      report(await addSuggestionsToPlan(keys));
    });
  }

  if (shown.length === 0) {
    return (
      <p className="text-13 text-ink-3">
        Nothing new to suggest. Everything worth doing today is already on your list.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1">
        {shown.map((s) => (
          <li
            key={s.key}
            className="flex items-center gap-2.5 rounded-[12px] px-2 py-1.5 transition-colors hover:bg-surface-2/60"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                {s.problemId ? (
                  <Link
                    href={`/dashboard/problems/${s.problemId}`}
                    className="truncate text-13 font-[550] hover:underline"
                  >
                    {s.title}
                  </Link>
                ) : (
                  <span className="truncate text-13 font-[550]">{s.title}</span>
                )}
                {s.difficulty && (
                  <DifficultyTag difficulty={s.difficulty} className="hidden 2xl:inline-flex" />
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag tone={KIND[s.kind].tone} className="h-[18px] px-1.5 text-[10.5px]">
                  {KIND[s.kind].label}
                </Tag>
                <span className="truncate text-11 text-ink-3">{s.detail}</span>
              </span>
            </span>
            <AddButton
              label={`Add ${s.title} to today`}
              disabled={pending}
              onClick={() => add([s.key])}
            />
          </li>
        ))}
      </ul>
      {shown.length > 1 && (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => add(shown.map((s) => s.key))}
        >
          <ListPlus size={14} aria-hidden="true" /> Add all {shown.length}
        </Button>
      )}
    </div>
  );
}

/** The next unfinished items of each followed sheet, one tap to add, or pick more on the sheet. */
export function SheetPicks({ picks }: { picks: SheetPick[] }) {
  const [pending, start] = useTransition();
  const [shown, hide] = useOptimistic(picks, (state, key: string) =>
    state.filter((p) => `${p.sheetId}:${p.itemKey}` !== key),
  );

  if (picks.length === 0) {
    return (
      <p className="text-13 text-ink-3">
        Follow a sheet and its next problems show up here.{" "}
        <Link href="/dashboard/sheets" className="text-ink-2 underline-offset-4 hover:underline">
          Browse sheets
        </Link>
      </p>
    );
  }

  const sheets = [...new Map(picks.map((p) => [p.sheetId, p])).values()];
  return (
    <div className="flex flex-col gap-4">
      {sheets.map((sheet) => {
        const items = shown.filter((p) => p.sheetId === sheet.sheetId);
        return (
          <div key={sheet.sheetId} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="truncate label-mono">{sheet.sheet}</span>
              <Link
                href={`/dashboard/sheets/${sheet.slug}?pick=1`}
                className="inline-flex shrink-0 items-center gap-1 text-12 text-ink-3 transition-colors hover:text-ink"
              >
                Pick more <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="px-2 text-12 text-ink-3">Added. Pick more from the sheet.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((p) => (
                  <li
                    key={p.itemKey}
                    className="flex items-center gap-2.5 rounded-[12px] px-2 py-1.5 transition-colors hover:bg-surface-2/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-[550]">{p.title}</span>
                      <span className={cn("block truncate text-11 text-ink-3")}>{p.step}</span>
                    </span>
                    <AddButton
                      label={`Add ${p.title} to today`}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          hide(`${p.sheetId}:${p.itemKey}`);
                          report(await addSheetItemsToPlan(p.sheetId, [p.itemKey]));
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

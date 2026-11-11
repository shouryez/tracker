"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@upsolve/ui";
import { setMainSheet } from "@/app/actions/sheets";
import { BookCover } from "@/components/sheet-identity";

export type PickableSheet = {
  id: string;
  slug: string;
  name: string;
  author: string | null;
  total: number;
  done: number;
};

/**
 * "Which sheet are you on?": one tap follows it and makes it your main sheet, so Today's
 * picks and Continue start there. You can follow more later.
 */
export function MainSheetPicker({
  sheets,
  initialMain,
}: {
  sheets: PickableSheet[];
  initialMain: string | null;
}) {
  const [main, setMain] = useState(initialMain);
  const [pending, start] = useTransition();
  return (
    <div
      role="radiogroup"
      aria-label="Main sheet"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {sheets.map((s) => {
        const on = main === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={pending}
            onClick={() => {
              const prev = main;
              setMain(s.id);
              start(async () => {
                const r = await setMainSheet(s.id);
                if (!r.ok) {
                  setMain(prev);
                  toast("Couldn't save that. Try again.");
                }
              });
            }}
            className={cn(
              "group/book relative rounded-[18px] p-1.5 text-left transition-[box-shadow,transform] duration-[var(--dur-base)] hover:-translate-y-0.5",
              on
                ? "shadow-[0_0_0_2px_var(--signal)]"
                : "shadow-[0_0_0_1px_var(--line-2)] hover:shadow-[0_0_0_1px_var(--line-3)]",
            )}
          >
            <BookCover
              slug={s.slug}
              name={s.name}
              author={s.author}
              done={s.done}
              total={s.total}
              main={on}
            />
            {on && (
              <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-signal text-signal-ink shadow-e2">
                <Check size={13} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

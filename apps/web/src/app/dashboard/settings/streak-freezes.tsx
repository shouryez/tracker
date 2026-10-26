"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { addStreakFreeze, removeStreakFreeze } from "@/app/actions/social";

type Freeze = { id: string; start: string; end: string };

const fmt = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** Plan exam-week freezes: frozen days neither break nor extend your streak. */
export function StreakFreezes({ freezes, today }: { freezes: Freeze[]; today: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const upcoming = freezes.filter((f) => f.end >= today);
  const past = freezes.filter((f) => f.end < today).slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      {upcoming.length > 0 && (
        <ul>
          {upcoming.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
            >
              <span className="text-[13.5px]">
                {fmt(f.start)} – {fmt(f.end)}
                <span className="ml-2 font-mono text-[11px] text-ink-3">
                  {f.start <= today ? "active now" : "planned"}
                </span>
              </span>
              {f.start > today && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await removeStreakFreeze(f.id);
                      setError(res.ok ? null : res.error);
                    })
                  }
                  className="font-mono text-[11px] text-ink-3 hover:text-ink"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await addStreakFreeze(start, end);
            setError(res.ok ? null : res.error);
            if (res.ok) {
              setStart("");
              setEnd("");
              toast.success("Streak freeze planned");
            }
          });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="flex flex-col gap-1 text-[12px] text-ink-3">
          From
          <input
            type="date"
            value={start}
            min={today}
            onChange={(e) => setStart(e.target.value)}
            className="h-[34px] rounded-full border border-line-2 bg-surface-2 px-3 text-[13px] text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-ink-3">
          To
          <input
            type="date"
            value={end}
            min={start || today}
            onChange={(e) => setEnd(e.target.value)}
            className="h-[34px] rounded-full border border-line-2 bg-surface-2 px-3 text-[13px] text-ink"
          />
        </label>
        <Button type="submit" size="sm" variant="secondary" disabled={pending || !start || !end}>
          {pending ? "Saving…" : "Freeze these days"}
        </Button>
      </form>
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
      <p className="text-[12px] leading-relaxed text-ink-3">
        Up to 14 days each, two planned at a time, and only for today or later, so a missed day
        can&apos;t be patched after the fact.
        {past.length > 0 &&
          ` Recent: ${past.map((f) => `${fmt(f.start)}–${fmt(f.end)}`).join(", ")}.`}
      </p>
    </div>
  );
}

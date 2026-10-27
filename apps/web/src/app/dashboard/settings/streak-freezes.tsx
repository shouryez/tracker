"use client";

import { useState, useTransition } from "react";
import { Snowflake, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Tag } from "@upsolve/ui";
import { addStreakFreeze, removeStreakFreeze } from "@/app/actions/social";
import { DateRangePicker } from "@/components/fx/date-range";

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
  const planned = upcoming.filter((f) => f.start > today).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Tag tone={planned >= 2 ? "overdue" : "neutral"}>{planned} of 2 planned</Tag>
        <Tag>up to 14 days each</Tag>
        <Tag>today or later</Tag>
      </div>

      {upcoming.length > 0 && (
        <ul className="flex flex-col gap-2">
          {upcoming.map((f) => (
            <li
              key={f.id}
              className="surface-inset flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5"
            >
              <span className="flex items-center gap-2.5 text-13">
                <Snowflake size={15} aria-hidden="true" className="text-info" />
                <span className="tnum font-[550]">
                  {fmt(f.start)} – {fmt(f.end)}
                </span>
                <Tag tone={f.start <= today ? "info" : "neutral"} className="h-5 px-1.5 text-11">
                  {f.start <= today ? "active now" : "planned"}
                </Tag>
              </span>
              {f.start > today && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove freeze ${fmt(f.start)} to ${fmt(f.end)}`}
                  disabled={pending}
                  className="hover:text-bad"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await removeStreakFreeze(f.id);
                      setError(res.ok ? null : res.error);
                    })
                  }
                >
                  <X size={14} aria-hidden="true" />
                </Button>
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
        className="flex flex-wrap items-center gap-2"
      >
        <DateRangePicker
          start={start}
          end={end}
          min={today}
          maxDays={14}
          label="Choose exam-week dates"
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        <Button type="submit" variant="secondary" loading={pending} disabled={!start || !end}>
          <Snowflake size={14} aria-hidden="true" /> Freeze these days
        </Button>
      </form>
      {error && <p className="text-13 text-bad">{error}</p>}
      <p className="text-12 leading-relaxed text-ink-3">
        Frozen days neither break nor extend your streak. Only today or later, so a missed day
        can&apos;t be patched after the fact.
        {past.length > 0 &&
          ` Recent: ${past.map((f) => `${fmt(f.start)}–${fmt(f.end)}`).join(", ")}.`}
      </p>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, inputClasses } from "@upsolve/ui";
import { saveWeeklyGoals } from "@/app/actions/daily";

/** Next week's targets and a short reflection. */
export function GoalsForm({
  weekStart,
  initial,
}: {
  weekStart: string;
  initial: { mediums: number; focusHours: number; revisions: number; reflection: string | null };
}) {
  const [v, setV] = useState({ ...initial, reflection: initial.reflection ?? "" });
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const num = (k: "mediums" | "focusHours" | "revisions", max: number) => (
    <label className="flex flex-col gap-1.5 text-13 font-[550] text-ink-2">
      {k === "mediums" ? "Medium problems" : k === "focusHours" ? "Focus hours" : "Revisions"}
      <input
        type="number"
        min={0}
        max={max}
        value={v[k]}
        onChange={(e) =>
          setV({ ...v, [k]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })
        }
        className={inputClasses({ className: "tnum" })}
      />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveWeeklyGoals({ weekStart, ...v, reflection: v.reflection || null });
          if (res.ok) {
            setDone(true);
            toast.success("Targets saved");
            setTimeout(() => setDone(false), 1800);
          } else toast.error(res.error);
        });
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {num("mediums", 200)}
        {num("focusHours", 100)}
        {num("revisions", 300)}
      </div>
      <label className="flex flex-col gap-1.5 text-13 font-[550] text-ink-2">
        One thing to do differently this week
        <textarea
          rows={3}
          maxLength={2000}
          value={v.reflection}
          onChange={(e) => setV({ ...v, reflection: e.target.value })}
          placeholder="e.g. Do revisions before new problems; stop at 1am."
          className={inputClasses({ className: "h-auto resize-y py-2.5" })}
        />
      </label>
      <Button type="submit" variant="signal" loading={pending} done={done} className="self-end">
        Save this week&apos;s targets
      </Button>
    </form>
  );
}

// DsaKaro

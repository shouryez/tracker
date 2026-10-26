"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@upsolve/ui";
import { saveLearningSettings } from "@/app/actions/learning";
import { REVIEW_CAPS } from "@/lib/profile-options";

type Values = { reviewCap: number; weeklyEmail: boolean };

/** Daily revision cap and the weekly email switch. Saves on change. */
export function LearningSettings({ initial }: { initial: Values }) {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useOptimistic(initial);
  const save = (next: Values) =>
    startTransition(async () => {
      setValues(next);
      const res = await saveLearningSettings(next);
      if (res.ok) toast.success("Saved");
      else toast.error("Couldn't save. Try again.");
    });

  return (
    <div className="flex flex-col divide-y divide-dashed divide-line-2">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5">
        <div className="min-w-0">
          <label htmlFor="review-cap" className="text-[13.5px] font-medium">
            Reviews per day
          </label>
          <p className="text-[12.5px] text-ink-3">
            The rest wait for the next day, oldest and weakest first.
          </p>
        </div>
        <select
          id="review-cap"
          value={values.reviewCap}
          disabled={pending}
          onChange={(e) => save({ ...values, reviewCap: Number(e.target.value) })}
          className="h-[34px] rounded-full border border-line-2 bg-surface-2 px-3 text-[13px]"
        >
          {REVIEW_CAPS.map((n) => (
            <option key={n} value={n}>
              {n} a day
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5">
        <div className="min-w-0">
          <p id="weekly-email-label" className="text-[13.5px] font-medium">
            Weekly email
          </p>
          <p className="text-[12.5px] text-ink-3">
            Monday morning: last week&apos;s numbers, your weakest topic, what&apos;s due.{" "}
            <a
              href="/api/email/weekly/preview"
              target="_blank"
              className="underline hover:text-ink"
            >
              Preview
            </a>
          </p>
        </div>
        <Switch
          checked={values.weeklyEmail}
          labelledBy="weekly-email-label"
          disabled={pending}
          onCheckedChange={(weeklyEmail) => save({ ...values, weeklyEmail })}
        />
      </div>
    </div>
  );
}

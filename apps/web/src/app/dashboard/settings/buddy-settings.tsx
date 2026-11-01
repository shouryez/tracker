"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@upsolve/ui";
import { saveStudyPrefs } from "@/app/actions/daily";
import { Select } from "@/components/fx/select";
import { StudyBuddy } from "@/components/study-buddy";
import { BUDDIES, DEFAULT_BUDDY, LEVEL_LABEL, type BuddyLevel } from "@/lib/buddies";

type Values = { avatar: string | null; dayResetHour: number };

const hourLabel = (h: number) =>
  h === 0 ? "12:00 am (midnight)" : `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "am" : "pm"}`;
const PREVIEW: BuddyLevel[] = ["idle", 1, 2, 3, 4];

/** Pick a study buddy (shown to your groups and on your timer) and when your day ends. */
export function BuddySettings({ initial }: { initial: Values }) {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useOptimistic(initial);
  const [preview, setPreview] = useState<BuddyLevel>(1);
  const chosen = values.avatar ?? DEFAULT_BUDDY;
  const save = (next: Values) =>
    startTransition(async () => {
      setValues(next);
      const res = await saveStudyPrefs(next);
      if (res.ok) toast.success("Saved");
      else toast.error("Couldn't save. Try again.");
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-14 font-[550]">Your study buddy</p>
          <p className="text-13 text-ink-3">
            Your groups see it in the study hall. It sits down when you start a session, gets a
            lightning bolt at 1 hour and catches fire at 2.
          </p>
        </div>
        {(["boys", "girls"] as const).map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <p className="label-mono">{group}</p>
            <div
              role="radiogroup"
              aria-label={`Study buddies: ${group}`}
              className="flex flex-wrap gap-2.5"
            >
              {BUDDIES.filter((b) => b.group === group).map((b) => {
                const on = b.id === chosen;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={b.label}
                    disabled={pending}
                    onClick={() => save({ ...values, avatar: b.id })}
                    className={cn(
                      "grid size-[96px] place-items-center rounded-[18px] border transition-[border-color,background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5",
                      on
                        ? "border-signal-2 bg-signal/[.07] shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_14%,transparent)]"
                        : "border-line bg-surface-2/50 hover:border-line-3",
                    )}
                  >
                    <StudyBuddy buddy={b.id} level={on ? preview : 1} size={72} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-12 text-ink-3">Preview levels:</span>
          {PREVIEW.map((l) => (
            <button
              key={String(l)}
              type="button"
              onClick={() => setPreview(l)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-12 transition-colors",
                preview === l
                  ? "border-signal-2 bg-signal/10 text-ink"
                  : "border-line text-ink-3 hover:text-ink",
              )}
            >
              {LEVEL_LABEL[l]}
              {typeof l === "number" && l > 1 && <span className="ml-1 text-ink-4">{l - 1}h+</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-line" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-14 font-[550]">Day resets at</p>
          <p className="max-w-[440px] text-13 text-ink-3">
            Today&apos;s focus total starts over at this time. Study late? Pick 4 am, and a 1 am
            session still counts for today.
          </p>
        </div>
        <Select
          label="Day resets at"
          value={String(values.dayResetHour)}
          onChange={(v) => save({ ...values, dayResetHour: Number(v) })}
          options={Array.from({ length: 24 }, (_, h) => ({
            value: String(h),
            label: hourLabel(h),
          }))}
          className="sm:w-[220px]"
        />
      </div>
    </div>
  );
}

"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { SwitchField } from "@upsolve/ui";
import { saveReminderSettings } from "@/app/actions/daily";
import { Select } from "@/components/fx/select";

type Values = {
  remindersOn: boolean;
  dailyEmail: boolean;
  reminderHour: number | null;
  contestReminders: boolean;
};

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "am" : "pm"}`;

/**
 * Daily reminders (a browser notification from the extension, and an email) at one hour,
 * plus contest alerts. Saves on change.
 */
export function ReminderSettings({ initial, best }: { initial: Values; best: number }) {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useOptimistic(initial);
  const save = (next: Values) =>
    startTransition(async () => {
      setValues(next);
      const res = await saveReminderSettings(next);
      if (res.ok) toast.success("Saved");
      else toast.error("Couldn't save. Try again.");
    });

  return (
    <div className="flex flex-col gap-5">
      <SwitchField
        title="Daily reminder email"
        description="One email a day with the revisions due and what's left on today's list. Skipped on days with nothing waiting."
        checked={values.dailyEmail}
        disabled={pending}
        onCheckedChange={(dailyEmail) => save({ ...values, dailyEmail })}
      />
      <SwitchField
        title="Daily browser notification"
        description="The same reminder as a notification from the DsaKaro extension."
        checked={values.remindersOn}
        disabled={pending}
        onCheckedChange={(remindersOn) => save({ ...values, remindersOn })}
      />
      {(values.remindersOn || values.dailyEmail) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-14 font-[550]">Remind me at</p>
            <p className="text-13 text-ink-3">
              Auto picks the hour you usually solve: {hourLabel(best)} right now.
            </p>
          </div>
          <Select
            label="Reminder hour"
            value={values.reminderHour === null ? "auto" : String(values.reminderHour)}
            onChange={(v) => save({ ...values, reminderHour: v === "auto" ? null : Number(v) })}
            options={[
              { value: "auto", label: `Auto (${hourLabel(best)})` },
              ...Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) })),
            ]}
            className="sm:w-[200px]"
          />
        </div>
      )}
      <div className="h-px bg-line" />
      <SwitchField
        title="Contest alerts"
        description="A heads-up 30 minutes before LeetCode, Codeforces, CodeChef and AtCoder contests."
        checked={values.contestReminders}
        disabled={pending}
        onCheckedChange={(contestReminders) => save({ ...values, contestReminders })}
      />
      <p className="text-12 text-ink-3">
        Browser notifications and contest alerts come from the DsaKaro extension, so they need it
        installed and connected. Emails go to the address you sign in with.
      </p>
    </div>
  );
}

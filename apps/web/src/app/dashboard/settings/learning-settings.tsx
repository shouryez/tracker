"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button, SegmentedControl, SwitchField } from "@upsolve/ui";
import { saveLearningSettings } from "@/app/actions/learning";
import { Modal } from "@/components/fx/overlay";
import { REVIEW_CAPS } from "@/lib/profile-options";

type Values = { reviewCap: number; weeklyEmail: boolean };

/** Daily revision cap and the weekly email switch. Saves on change. */
export function LearningSettings({ initial }: { initial: Values }) {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useOptimistic(initial);
  const [preview, setPreview] = useState(false);
  const save = (next: Values) =>
    startTransition(async () => {
      setValues(next);
      const res = await saveLearningSettings(next);
      if (res.ok) toast.success("Saved");
      else toast.error("Couldn't save. Try again.");
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-14 font-[550]">Reviews per day</p>
          <p className="text-13 text-ink-3">
            The rest wait for the next day, oldest and weakest first.
          </p>
        </div>
        <SegmentedControl
          label="Reviews per day"
          value={String(values.reviewCap)}
          onChange={(v) => !pending && save({ ...values, reviewCap: Number(v) })}
          items={REVIEW_CAPS.map((n) => ({ value: String(n), label: String(n) }))}
          className="w-full max-w-md"
        />
      </div>
      <div className="h-px bg-line" />
      <SwitchField
        title="Weekly email"
        description="Monday morning: last week's numbers, your weakest topic, what's due."
        checked={values.weeklyEmail}
        disabled={pending}
        onCheckedChange={(weeklyEmail) => save({ ...values, weeklyEmail })}
      />
      <Button variant="secondary" size="sm" className="self-start" onClick={() => setPreview(true)}>
        <Mail size={14} aria-hidden="true" /> Preview this week&apos;s email
      </Button>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Weekly email preview"
        description="What lands in your inbox on Monday."
        className="w-[min(720px,calc(100vw-32px))]"
      >
        {preview && (
          <iframe
            src="/api/email/weekly/preview"
            title="Weekly email preview"
            className="h-[60vh] w-full rounded-[14px] border border-line bg-white"
          />
        )}
      </Modal>
    </div>
  );
}

// DsaKaro

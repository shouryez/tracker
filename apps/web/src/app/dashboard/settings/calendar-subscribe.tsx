"use client";

import { CalendarPlus, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@upsolve/ui";
import { feel } from "@/lib/feel";

/**
 * "Subscribe in your calendar" (FEATURES-PLAN F4): your revision load and contests on your
 * platforms, in Google Calendar, Apple Calendar or Outlook. The link is private to you.
 */
export function CalendarSubscribe({ url }: { url: string | null }) {
  if (!url) return null;
  const webcal = url.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-4 shadow-[inset_0_0_0_1px_var(--line)]">
      <div>
        <p className="text-14 font-[550]">Subscribe in your calendar</p>
        <p className="mt-0.5 text-13 text-ink-3">
          How many revisions are due each day (never which problems), plus contests on the platforms
          you use, with a 30-minute alert. Updates every few hours.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={google}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          <CalendarPlus size={14} aria-hidden="true" /> Add to Google Calendar
        </a>
        <a href={webcal} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Apple / Outlook
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              feel.tick();
              toast.success("Calendar link copied", {
                description: "Keep it private: anyone with it can see your revision counts.",
              });
            } catch {
              toast.error("Couldn't copy. Select the link instead.");
            }
          }}
        >
          <Copy size={14} aria-hidden="true" /> Copy link
        </Button>
      </div>
    </div>
  );
}

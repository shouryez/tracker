"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Snowflake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@upsolve/ui";
import { addStreakFreeze } from "@/app/actions/social";

const KEY = "dsakaro:rest-day-dismissed";
const WEEK = 7 * 86_400_000;
const subscribe = () => () => {};
const dismissedRecently = () => {
  try {
    return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < WEEK;
  } catch {
    return false;
  }
};

/**
 * Rest-day guard (FEATURES-PLAN F8): a long streak while focus has dropped three days in a
 * row. One quiet card offering a planned freeze tomorrow (frozen days neither break nor
 * extend a streak). Never a pop-up; "Not now" hides it for a week.
 */
export function RestDayCard({ streak, tomorrow }: { streak: number; tomorrow: string }) {
  const router = useRouter();
  const hiddenStored = useSyncExternalStore(subscribe, dismissedRecently, () => true);
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden || hiddenStored) return null;
  return (
    <div className="surface-inset flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] px-4 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--sky)_16%,transparent)] text-info">
        <Snowflake size={16} aria-hidden="true" />
      </span>
      <div className="min-w-[min(100%,240px)] flex-1">
        <p className="text-14 font-[600]">A rest day might do more than a push.</p>
        <p className="text-13 text-ink-3">
          {streak} days straight, and your focus has dipped three days running. Freeze tomorrow and
          the streak holds while you recharge.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            try {
              localStorage.setItem(KEY, String(Date.now()));
            } catch {
              // Storage blocked: hidden for this visit only.
            }
            setHidden(true);
          }}
        >
          Not now
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await addStreakFreeze(tomorrow, tomorrow);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Tomorrow is a rest day", {
                description: "Your streak is safe. Change it in Settings, Streak freezes.",
              });
              setHidden(true);
              router.refresh();
            })
          }
        >
          <Snowflake size={13} aria-hidden="true" /> Freeze tomorrow
        </Button>
      </div>
    </div>
  );
}

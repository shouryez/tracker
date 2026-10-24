"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@upsolve/ui";
import { setProfilePublic } from "@/app/actions/profile";

export function PublicToggle({ isPublic }: { isPublic: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isPublic);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label="Public profile"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setProfilePublic(!optimistic);
        })
      }
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors duration-[240ms]",
        optimistic ? "border-transparent bg-signal" : "border-line-2 bg-surface-3",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] size-[18px] rounded-full transition-[left,background-color] duration-[240ms] ease-spring",
          optimistic ? "left-[23px] bg-signal-ink" : "left-[3px] bg-ink-2",
        )}
      />
    </button>
  );
}

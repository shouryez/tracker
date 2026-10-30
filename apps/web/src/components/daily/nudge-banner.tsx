"use client";

import { useState, useTransition } from "react";
import { Hand, X } from "lucide-react";
import { markNudgesSeen } from "@/app/actions/daily";

/** "Asha nudged you" banner on the Overview; dismissing marks the nudges seen. */
export function NudgeBanner({ nudges }: { nudges: { id: string; from: string; group: string }[] }) {
  const [open, setOpen] = useState(nudges.length > 0);
  const [, start] = useTransition();
  if (!open || nudges.length === 0) return null;
  const names = [...new Set(nudges.map((n) => n.from))];
  const who =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return (
    <div
      role="status"
      className="flex animate-[rise-in_var(--dur-slow)_var(--ease-out)] items-center gap-3 rounded-[16px] border border-medium-line bg-medium-soft px-4 py-3"
    >
      <span className="grid size-9 shrink-0 animate-[wave_1.6s_ease-in-out_2] place-items-center rounded-full bg-medium text-[#241600]">
        <Hand size={16} aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-14">
        <span className="font-[600]">{who}</span> nudged you in {nudges[0]!.group}. One problem
        today keeps the group going.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setOpen(false);
          start(async () => {
            await markNudgesSeen();
          });
        }}
        className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

// DsaKaro

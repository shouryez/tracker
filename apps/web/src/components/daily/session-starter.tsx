"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, cn } from "@upsolve/ui";
import { startFocus } from "@/app/actions/daily";
import { labStart } from "@/lib/ext-bridge";
import { maybeAutoPopout } from "./focus-live";

const MODES = [
  { id: "stopwatch", label: "Solo" },
  { id: "pomodoro-25", label: "Pomodoro 25/5" },
  { id: "pomodoro-50", label: "Pomodoro 50/10" },
] as const;

/** Pick how the next session runs, then start it (labelled with what you'll work on). */
export function SessionStarter({ label, cta }: { label: string | null; cta: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("pomodoro-25");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="Mode"
        className="inline-flex flex-wrap self-start rounded-[10px] border border-line bg-surface-2 p-[3px]"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "h-7 rounded-[7px] px-2.5 text-[12.5px] font-[550] transition-colors",
              mode === m.id
                ? "bg-surface-4 text-ink shadow-[0_1px_3px_rgba(0,0,0,.25)]"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {label && (
        <p className="truncate text-13">
          <span className="text-ink-3">First up: </span>
          {label}
        </p>
      )}
      <p className="text-12 text-ink-3">
        The extension starts the clock when you open a problem and pauses it on non-study tabs.
      </p>
      <Button
        variant="signal"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await startFocus(mode, label);
            if (!res.ok) return void toast.error(res.error);
            if (!res.existing) {
              await labStart(res.id, res.startedAt);
              maybeAutoPopout();
              toast.success("Session started");
            }
            router.refresh();
          })
        }
      >
        {cta}
      </Button>
    </div>
  );
}

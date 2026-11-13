"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button, SegmentedControl, inputClasses } from "@upsolve/ui";
import { logManualSolve } from "@/app/actions/manual-solve";
import { burst } from "@/components/dashboard/celebrate";
import { Modal } from "@/components/fx/overlay";

type How = "solo" | "hint" | "solution";

const LOG_SOLVE_EVENT = "dsakaro:log-solve";
/** Opens the "Log a solve" dialog on the current problem page (the command palette uses it). */
export function openLogSolve() {
  window.dispatchEvent(new Event(LOG_SOLVE_EVENT));
}

/**
 * "Log a solve" (FEATURES-PLAN F5): for a solve the extension couldn't see. Minutes, how you
 * solved it, today or yesterday; it then counts everywhere like a tracked solve.
 */
export function LogSolveButton({ problemId, title }: { problemId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("25");
  const [how, setHow] = useState<How>("solo");
  const [when, setWhen] = useState<"now" | "yesterday">("now");
  const [pending, start] = useTransition();
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(LOG_SOLVE_EVENT, onOpen);
    return () => window.removeEventListener(LOG_SOLVE_EVENT, onOpen);
  }, []);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <PenLine size={14} aria-hidden="true" /> Log a solve
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log a solve"
        description={`Solved ${title} where the extension couldn't see? Log it and it counts like any other solve.`}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await logManualSolve({
                problemId,
                minutes: Number(minutes),
                independence: how,
                when,
              });
              if (!res.ok) return void toast.error(res.error);
              void burst({ small: true });
              toast.success("Solve logged", {
                description: "Your ladder, streak and stats include it now.",
              });
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1.5 text-13 font-[600]">
            Minutes spent
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              required
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputClasses({ className: "h-[38px] w-32" })}
            />
          </label>
          <div className="flex flex-col gap-1.5 text-13 font-[600]">
            How did you solve it?
            <SegmentedControl<How>
              label="How you solved it"
              value={how}
              onChange={setHow}
              items={[
                { value: "solo", label: "Solo" },
                { value: "hint", label: "Hint" },
                { value: "solution", label: "Saw solution" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5 text-13 font-[600]">
            When
            <SegmentedControl<"now" | "yesterday">
              label="When"
              size="sm"
              className="w-[220px]"
              value={when}
              onChange={setWhen}
              items={[
                { value: "now", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
              ]}
            />
          </div>
          <p className="text-12 text-ink-3">
            Be honest: a solve you saw the solution for comes back tomorrow, just like a tracked
            one.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="signal" type="submit" loading={pending}>
              Log it
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

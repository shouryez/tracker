import { Check } from "lucide-react";
import { cn } from "@upsolve/ui";

const STEPS = ["About you", "Your goal", "Connect platforms"] as const;

/** Three labelled nodes on a line that fills as you go; the current node glows. */
export function OnboardingSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Onboarding progress" className="mb-10">
      <ol className="relative grid grid-cols-3">
        <span
          aria-hidden="true"
          className="absolute top-4 right-[16.6%] left-[16.6%] h-[3px] rounded-full bg-surface-3"
        >
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,var(--violet),var(--signal))] transition-[width] duration-[var(--dur-slower)] ease-[var(--ease-out)]"
            style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
          />
        </span>
        {STEPS.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li
              key={s}
              aria-current={now ? "step" : undefined}
              className="relative flex flex-col items-center gap-2 text-center"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2 text-12 font-[700] transition-[background-color,border-color,box-shadow] duration-[var(--dur-slow)]",
                  done
                    ? "border-transparent bg-violet text-white"
                    : now
                      ? "border-signal bg-signal text-signal-ink shadow-glow-signal"
                      : "border-line-2 bg-surface text-ink-3",
                )}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("text-12", now ? "font-[600] text-ink" : "text-ink-3")}>{s}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

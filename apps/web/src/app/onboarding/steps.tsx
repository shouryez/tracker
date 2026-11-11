import { cn } from "@upsolve/ui";

const STEPS = ["About you", "Your goal", "Platforms and sheet"] as const;

/** Three bars that fill mint as you go, each labelled with its step. */
export function OnboardingSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Onboarding progress" className="mb-10">
      <ol className="flex gap-2">
        {STEPS.map((s, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li
              key={s}
              aria-current={now ? "step" : undefined}
              className="flex flex-1 flex-col gap-2"
            >
              <span
                className={cn(
                  "h-[3px] rounded-full transition-colors duration-[var(--dur-slow)]",
                  done || now ? "bg-signal" : "bg-line-2",
                )}
              />
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "tnum text-12 font-[650]",
                    done || now ? "text-signal-text" : "text-ink-3",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("text-[13.5px] font-[550]", now ? "text-ink" : "text-ink-3")}>
                  {s}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

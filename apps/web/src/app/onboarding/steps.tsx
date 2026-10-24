import { cn } from "@upsolve/ui";

const STEPS = ["About you", "Your goal", "Connect platforms"] as const;

/** Segmented progress bar: solid = done, signal = current, hatched = to do. */
export function OnboardingSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="mb-10">
      <div className="mb-2.5 grid h-2 grid-cols-3 gap-1">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "rounded-[2px]",
              i < current ? "bg-ink" : i === current ? "bg-signal" : "hatch",
            )}
          />
        ))}
      </div>
      <p className="font-mono text-[11px] tracking-[.08em] text-ink-3 uppercase">
        Step {current + 1} of {STEPS.length} · {STEPS[current]}
      </p>
    </div>
  );
}

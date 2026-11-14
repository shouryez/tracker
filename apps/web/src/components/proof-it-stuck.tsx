import { cn } from "@upsolve/ui";
import type { Independence } from "@upsolve/core";
import type { StuckProof } from "@/lib/proof";

const HOW: Record<Independence, string> = {
  solo: "solo",
  hint: "with a hint",
  solution: "after the solution",
};
const DATE = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
const mins = (ms: number) => Math.max(1, Math.round(ms / 60_000));

const VERDICT = {
  stuck: { label: "It stuck", cls: "text-signal-text", bar: "var(--signal)" },
  held: { label: "It held", cls: "text-info", bar: "var(--sky)" },
  slipped: { label: "It slipped", cls: "text-medium", bar: "var(--amber)" },
} as const;

/**
 * Proof it stuck (FINAL-FEATURES A4): your first solve next to your latest re-solve, two
 * bars to scale, so the payoff of revising is something you can see.
 */
export function ProofItStuck({ proof, className }: { proof: StuckProof; className?: string }) {
  const v = VERDICT[proof.verdict];
  const max = Math.max(proof.first.activeMs, proof.latest.activeMs);
  const rows = [
    { label: "First solve", s: proof.first, color: "var(--line-3)" },
    { label: `${proof.days} days later`, s: proof.latest, color: v.bar },
  ];
  const saved = proof.first.activeMs - proof.latest.activeMs;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-13 text-ink-2">
        <span className={cn("font-[650]", v.cls)}>{v.label}.</span>{" "}
        {proof.verdict === "slipped"
          ? "You needed more help this time. It's back on the ladder sooner."
          : saved >= 60_000
            ? `${mins(saved)} min faster than the first time.`
            : proof.latest.independence === "solo"
              ? "Solved on your own again."
              : "About as fast as the first time."}
      </p>
      <ul className="flex flex-col gap-2.5">
        {rows.map(({ label, s, color }) => (
          <li key={label} className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between gap-2 text-12">
              <span className="text-ink-2">
                {label} <span className="text-ink-4">· {DATE.format(s.at)}</span>
              </span>
              <span className="tnum font-[600]">
                {mins(s.activeMs)} min
                <span className="font-[400] text-ink-3">
                  {s.independence ? `, ${HOW[s.independence]}` : ""}
                </span>
              </span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(6, (s.activeMs / max) * 100)}%`, background: color }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

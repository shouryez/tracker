import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, CheckDraw, cn } from "@upsolve/ui";

export type StartStep = { key: string; label: string; hint: string; href: string; done: boolean };

/**
 * "Getting started" for new users (FRONTEND-PLAN §8 Today 5, B13): five steps worked out
 * from what you've already done. Finished steps draw a check; the card goes away once all
 * five are done. A thin mint bar fills with progress.
 */
export function GettingStarted({ steps }: { steps: StartStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="mb-0">
        <CardTitle>Getting started</CardTitle>
        <CardSub>
          {done} of {steps.length}
        </CardSub>
      </CardHeader>
      <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
        <span
          className="block h-full origin-left animate-[grow-x_900ms_var(--ease-out)_backwards] rounded-full bg-[var(--signal-mark)]"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Link
              href={s.href}
              aria-label={`${s.label}${s.done ? " (done)" : ""}`}
              className={cn(
                "group flex h-full flex-col gap-2 rounded-[16px] p-3.5 transition-[background-color,box-shadow] duration-[var(--dur-base)]",
                s.done
                  ? "bg-mint-soft"
                  : s === next
                    ? "bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] shadow-[inset_0_0_0_1.5px_var(--signal-mark)]"
                    : "bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-3)]",
              )}
            >
              <span className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-12 font-[700]",
                    s.done
                      ? "bg-[var(--signal-mark)] text-signal-ink"
                      : "text-ink-3 shadow-[inset_0_0_0_1.5px_var(--line-2)]",
                  )}
                >
                  {s.done ? <CheckDraw size={13} /> : i + 1}
                </span>
                {!s.done && (
                  <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                    className="text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-13 font-[600]",
                  s.done && "text-ink-3 line-through decoration-ink-4",
                )}
              >
                {s.label}
              </span>
              {!s.done && <span className="text-12 text-ink-3">{s.hint}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

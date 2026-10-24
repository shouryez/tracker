import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import {
  CircleCheck,
  Clock,
  Flame,
  ListChecks,
  Plug,
  Puzzle,
  RotateCcw,
  Target,
  Grid3x3,
} from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, PixelHeatmap, Stat, Tag, cn } from "@upsolve/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { Greeting, GreetingSkeleton } from "./_components/greeting";

export const metadata: Metadata = { title: "Overview" };

const icon = (Icon: typeof Clock) => <Icon size={13} strokeWidth={2} />;

const SETUP_STEPS = [
  { label: "Create your account", detail: "Done. Welcome aboard.", done: true },
  {
    label: "Connect LeetCode and Codeforces",
    detail: "Enter your handles and verify with a bio code.",
    done: false,
    phase: "Phase 1",
  },
  {
    label: "Install the Chrome extension",
    detail: "Times every problem you open and catches every verdict.",
    done: false,
    phase: "Phase 2",
  },
] as const;

export default function DashboardPage() {
  const doneCount = SETUP_STEPS.filter((s) => s.done).length;

  return (
    <div className="flex flex-col gap-5">
      {!isSupabaseConfigured && (
        <p className="rounded-md border border-dashed border-line-2 bg-surface p-3.5 font-mono text-xs leading-relaxed text-ink-2">
          Demo mode: Supabase isn&apos;t configured, so this shell shows without signing in. Fill in{" "}
          <code className="text-ink">apps/web/.env.local</code> to turn on auth.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-5">
        <Suspense fallback={<GreetingSkeleton />}>
          <Greeting />
        </Suspense>
      </div>

      <div className="grid grid-cols-12 gap-3.5">
        <Kpi
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Solved"
          icon={icon(CircleCheck)}
          value="0"
          unit="problems"
          foot="Across all your platforms"
        />
        <Kpi
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Solo rate"
          icon={icon(Target)}
          value="—"
          foot="Solved without hints"
        />
        <Kpi
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Streak"
          icon={<Flame size={13} strokeWidth={2} className="text-ember" />}
          value="0"
          unit="days"
          foot="Solve one today to start"
        />
        <Kpi
          className="col-span-12 sm:col-span-6 xl:col-span-3"
          title="Focus this week"
          icon={icon(Clock)}
          value="0"
          unit="h"
          foot="Tracked by the extension"
        />

        <Card className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={icon(Plug)}>Get set up</CardTitle>
            <CardSub>
              {doneCount} / {SETUP_STEPS.length}
            </CardSub>
          </CardHeader>
          <div
            className="mb-2 grid h-3 gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${SETUP_STEPS.length}, minmax(0, 1fr))` }}
            role="img"
            aria-label={`${doneCount} of ${SETUP_STEPS.length} setup steps done`}
          >
            {SETUP_STEPS.map((s) => (
              <span key={s.label} className={cn("rounded-[2px]", s.done ? "bg-ink" : "hatch")} />
            ))}
          </div>
          <ol>
            {SETUP_STEPS.map((step, i) => (
              <li
                key={step.label}
                className="flex items-center gap-3 border-t border-dashed border-line-2 py-3 first:border-t-0"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px]",
                    step.done ? "bg-signal text-signal-ink" : "border border-line-2 text-ink-3",
                  )}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[13.5px] font-medium",
                      step.done && "text-ink-3 line-through",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="block font-mono text-[11px] text-ink-3">{step.detail}</span>
                </span>
                {"phase" in step && <Tag mono>{step.phase}</Tag>}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={icon(RotateCcw)}>Revision queue</CardTitle>
            <Tag mono>0 due</Tag>
          </CardHeader>
          <EmptyState
            title={
              <>
                <span className="text-ink-3">Nothing to revise yet.</span> Solve a few first.
              </>
            }
            body="Problems you solve with a hint or after reading the solution come back here on a spaced schedule."
          />
        </Card>

        <Card className="col-span-12 xl:col-span-8">
          <CardHeader>
            <CardTitle icon={icon(Grid3x3)}>Activity</CardTitle>
            <CardSub>last 26 weeks</CardSub>
          </CardHeader>
          <PixelHeatmap weeks={26} label="Activity heatmap: no activity yet" />
          <p className="mt-3 text-[12.5px] text-ink-3">
            Nothing here yet. Solve one to light this up.
          </p>
        </Card>

        <Card className="col-span-12 xl:col-span-4">
          <CardHeader>
            <CardTitle icon={icon(ListChecks)}>Sheets</CardTitle>
            <Tag mono>Phase 3</Tag>
          </CardHeader>
          <EmptyState
            title={
              <>
                <span className="text-ink-3">Your sheets,</span> ticked for you.
              </>
            }
            body="Striver A2Z, NeetCode 150 and Blind 75 tick themselves when you solve on any platform."
            icon={<Puzzle size={16} strokeWidth={1.75} />}
          />
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  title,
  icon,
  value,
  unit,
  foot,
  className,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  unit?: string;
  foot: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="mb-0">
        <CardTitle icon={icon}>{title}</CardTitle>
      </CardHeader>
      <Stat value={value} unit={unit} className="mt-1.5 mb-2.5" />
      <p className="text-xs text-ink-3">{foot}</p>
    </Card>
  );
}

function EmptyState({ title, body, icon }: { title: ReactNode; body: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-line-2 p-4">
      <span
        aria-hidden="true"
        className="hatch grid h-10 w-full place-items-center rounded-sm text-ink-3"
      >
        {icon}
      </span>
      <p className="text-[15px] font-[550] tracking-[-0.01em]">{title}</p>
      <p className="text-[13px] text-ink-2">{body}</p>
    </div>
  );
}

import type { ReactNode } from "react";
import { Flame, RotateCcw } from "lucide-react";
import { PixelHeatmap, cn } from "@upsolve/ui";
import { StreakFlame } from "@/components/fx/decor";
import { BrowserChrome } from "./screen-problem";
import { DEMO } from "./scene";

/** Deterministic "random" activity so the example heatmap looks lived-in. */
function demoLevels(days: number, seed: number): number[] {
  let x = seed;
  return Array.from({ length: days }, (_, i) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    const r = x / 2147483648;
    const recent = i / days;
    const p = 0.35 + recent * 0.45;
    return r > p ? 0 : Math.min(3, 1 + Math.floor((r / p) * 3 * (0.6 + recent)));
  });
}
const WEEKS = 22;
const LEVELS = demoLevels(WEEKS * 7, 11);

/**
 * The DsaKaro dashboard as it appears on the laptop screen and in the hand-off frame.
 * Example numbers only. `landed` is the moment the solve arrives: today's cell lights,
 * Solved and Streak tick up, and Koko joins the revision queue.
 */
export function ScreenDashboard({
  landed,
  num = (n) => n,
}: {
  landed: boolean;
  /** How to render a changing number (the scene passes a rolling ticker). */
  num?: (n: number) => ReactNode;
}) {
  const levels = [...LEVELS.slice(0, -1), landed ? 4 : 0];
  return (
    <div className="lt-ui absolute inset-0 flex flex-col bg-bg-2 text-ink">
      <BrowserChrome
        tabs={["Overview · DsaKaro"]}
        active={0}
        url="dsakaro.site/dashboard"
        right={
          <span className="font-mono text-[9.5px] tracking-[.08em] text-ink-3 uppercase">
            example
          </span>
        }
      />
      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_1fr] gap-2.5 p-3">
        <Kpi label="Solved · all platforms" className="col-span-4">
          {num(DEMO.solved + (landed ? 1 : 0))}
          <small className="ml-1 text-[.4em] font-normal text-ink-3">problems</small>
        </Kpi>
        <Kpi
          label="Streak"
          className="col-span-4"
          icon={<Flame size={11} className="text-ember" />}
        >
          <span className="flex items-end justify-between">
            <span>
              {num(DEMO.streak + (landed ? 1 : 0))}
              <small className="ml-1 text-[.4em] font-normal text-ink-3">days</small>
            </span>
            <span className={cn("-mb-1", landed && "lt-flicker")}>
              <StreakFlame streak={DEMO.streak} size={34} />
            </span>
          </span>
        </Kpi>
        <Kpi label="Due for revision" className="col-span-4">
          {DEMO.due}
          <small className="ml-1 text-[.4em] font-normal text-ink-3">today</small>
        </Kpi>
        <div className="col-span-8 flex min-h-0 flex-col rounded-[14px] border border-line bg-surface p-3.5">
          <span className="mb-2.5 flex items-center justify-between">
            <span className="text-[12.5px] font-[600]">Activity</span>
            <span className="font-mono text-[10px] text-ink-3">
              last {WEEKS} weeks · all platforms
            </span>
          </span>
          <div data-part="heatmap">
            <PixelHeatmap levels={levels} weeks={WEEKS} label="Example activity heatmap" />
          </div>
          <span className="mt-auto pt-2 font-mono text-[10px] text-ink-3">
            {landed ? "today · 1 solved · 18m 42s" : "today · nothing yet"}
          </span>
        </div>
        <div className="col-span-4 flex min-h-0 flex-col gap-1.5 overflow-hidden rounded-[14px] border border-line bg-surface p-3.5">
          <span className="mb-1 flex items-center gap-1.5 text-[12.5px] font-[600]">
            <RotateCcw size={12} className="text-primary" aria-hidden="true" /> Revision queue
          </span>
          <ReviewRow title="Course Schedule II" due="2d overdue" overdue />
          <ReviewRow title="Coin Change" due="today" />
          <ReviewRow title="Longest Substring" due="today" />
          {/* Reserved slot, so the list doesn't shift when Koko arrives. */}
          <ReviewRow
            title="Koko Eating Bananas"
            due="in 1 day"
            className={cn("lt-row", !landed && "lt-row-hidden")}
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  icon,
  className,
  children,
}: {
  label: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-[14px] border border-line bg-surface px-3.5 py-3", className)}>
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[.08em] text-ink-3 uppercase">
        {label} {icon}
      </span>
      <span className="num mt-1.5 block text-[30px] leading-none">{children}</span>
    </div>
  );
}

function ReviewRow({
  title,
  due,
  overdue,
  className,
}: {
  title: string;
  due: string;
  overdue?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-between gap-2 rounded-[9px] border border-line bg-surface-inset px-2.5 py-[7px]",
        className,
      )}
    >
      <b className="min-w-0 truncate text-[11.5px] font-[500]">{title}</b>
      <span
        className={cn("shrink-0 font-mono text-[10px]", overdue ? "text-overdue" : "text-ink-3")}
      >
        {due}
      </span>
    </span>
  );
}

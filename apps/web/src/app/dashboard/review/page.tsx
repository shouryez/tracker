import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarRange, NotebookPen, Target, Trophy } from "lucide-react";
import {
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  ProgressRing,
  SkeletonCard,
  cn,
} from "@upsolve/ui";
import { GoalsForm } from "@/components/daily/goals-form";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getWeekReview } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Weekly review" };

const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });

export default function ReviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={4} className="col-span-12 h-[260px] xl:col-span-7" />
            <SkeletonCard lines={4} className="col-span-12 h-[260px] xl:col-span-5" />
          </div>
        }
      >
        <ReviewContent />
      </Suspense>
    </div>
  );
}

async function ReviewContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in for your weekly review.</p>;
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const now = requestNow();
  const [week, learning, targets] = await Promise.all([
    getWeekReview(user.id, tz, now),
    getLearning(user.id),
    getTopicTargets(),
  ]);
  const weakest = masteryOf(learning, targets, now)
    .filter((m) => m.solved > 0)
    .sort((a, b) => a.score - b.score)[0];
  const max = Math.max(1, ...week.days.map((d) => d.solved));
  const focusH = Math.round((week.progress.focusMs / 3_600_000) * 10) / 10;
  const delta = (a: number, b: number) =>
    a === b ? "same as last week" : a > b ? `+${a - b} vs last week` : `${a - b} vs last week`;

  return (
    <>
      <PageHeader
        eyebrow={`Week of ${fmtDay(week.weekStart, { day: "numeric", month: "long" })}`}
        glow={PAGE_GLOW.revision}
        title={
          <>
            Your week, <em>in five minutes.</em>
          </>
        }
        subtitle={
          <>
            <span>{week.progress.solved} new problems</span>
            <Dot />
            <span>{week.progress.revisions} revisions</span>
            <Dot />
            <span>{focusH}h focus</span>
          </>
        }
      />

      <div className="stagger-in grid grid-cols-12 gap-3.5">
        <Card tier="hero" beam className="col-span-12 xl:col-span-7">
          <CardHeader>
            <CardTitle icon={<Target size={14} />} className="text-white">
              Targets
            </CardTitle>
            <span className="text-12 text-white/60">resets every Monday</span>
          </CardHeader>
          <div className="grid grid-cols-3 gap-3">
            {[
              [
                "Mediums",
                week.progress.mediums,
                week.goals.mediums,
                "var(--medium)",
                delta(week.progress.mediums, week.lastWeek.mediums),
              ],
              ["Focus hours", focusH, week.goals.focusHours, "var(--signal)", ""],
              [
                "Revisions",
                week.progress.revisions,
                week.goals.revisions,
                "var(--sky)",
                delta(week.progress.revisions, week.lastWeek.revisions),
              ],
            ].map(([label, value, goal, color, sub]) => (
              <div key={label as string} className="flex flex-col items-center gap-2 text-center">
                <ProgressRing
                  total={Math.max(1, goal as number)}
                  size={104}
                  stroke={10}
                  className="[&_circle:first-of-type]:stroke-white/12"
                  segments={[
                    {
                      label: label as string,
                      value: Math.min(value as number, goal as number),
                      color: color as string,
                    },
                  ]}
                >
                  <span className="num text-24">
                    <NumberTicker
                      value={value as number}
                      decimals={label === "Focus hours" ? 1 : 0}
                    />
                  </span>
                  <span className="text-[10px] text-white/55">of {goal as number}</span>
                </ProgressRing>
                <span className="text-13 font-[600]">{label as string}</span>
                {sub && <span className="text-11 text-white/55">{sub as string}</span>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader>
            <CardTitle icon={<CalendarRange size={14} />} tint="var(--violet)">
              Day by day
            </CardTitle>
            <CardSub>new problems</CardSub>
          </CardHeader>
          <div className="grid h-[140px] grid-cols-7 items-end gap-2">
            {week.days.map((d) => (
              <div key={d.date} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="tnum text-11 text-ink-3">{d.solved || ""}</span>
                <span
                  className={cn(
                    "w-full max-w-9 origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] rounded-[8px]",
                    d.solved ? "bg-violet" : "h-1.5 bg-surface-3",
                    week.bestDay?.date === d.date &&
                      "bg-signal-mark shadow-[0_0_16px_-4px_var(--signal)]",
                  )}
                  style={
                    d.solved ? { height: `${Math.max(10, (d.solved / max) * 100)}%` } : undefined
                  }
                />
                <span className="font-mono text-11 text-ink-3">
                  {fmtDay(d.date, { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
          <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-13">
            {week.bestDay && (
              <li className="flex items-center gap-2">
                <Trophy size={14} className="text-signal-text" aria-hidden="true" />
                Best day: {fmtDay(week.bestDay.date, { weekday: "long" })} ({week.bestDay.solved}{" "}
                solved)
              </li>
            )}
            {week.hardest && (
              <li className="flex flex-wrap items-center gap-2">
                Hardest solve: <span className="font-[600]">{week.hardest.title}</span>
                {week.hardest.difficulty && <DifficultyTag difficulty={week.hardest.difficulty} />}
              </li>
            )}
            {weakest && (
              <li className="text-ink-2">
                Weakest topic: <span className="font-[600] text-ink">{weakest.label}</span> (
                {weakest.score}
                /100). Worth a stretch problem this week.
              </li>
            )}
          </ul>
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle icon={<NotebookPen size={14} />} tint="var(--signal-mark)">
              {week.saved ? "This week's targets" : "Set this week's targets"}
            </CardTitle>
            <CardSub>they show as rings on Today</CardSub>
          </CardHeader>
          <GoalsForm weekStart={week.weekStart} initial={week.goals} />
        </Card>
      </div>
    </>
  );
}

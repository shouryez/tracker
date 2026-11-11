import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type React from "react";
import { Card, CardHeader, CardSub, CardTitle, DifficultyTag, SkeletonCard, cn } from "@upsolve/ui";
import { GoalsForm } from "@/components/daily/goals-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getWeekReview } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { requestNow } from "@/lib/time";
import { INSIGHTS_TABS, SectionTabs } from "@/components/orbit/section-tabs";

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

  const compare = [
    {
      label: "New problems",
      now: week.progress.solved,
      prev: week.lastWeek.solved,
      color: "var(--signal)",
    },
    {
      label: "Mediums",
      now: week.progress.mediums,
      prev: week.lastWeek.mediums,
      color: "var(--medium)",
    },
    {
      label: "Revisions",
      now: week.progress.revisions,
      prev: week.lastWeek.revisions,
      color: "var(--amber)",
    },
  ];
  const notes: { color: string; text: React.ReactNode; href?: string; cta?: string }[] = [];
  if (week.bestDay)
    notes.push({
      color: "var(--signal)",
      text: `Best day: ${fmtDay(week.bestDay.date, { weekday: "long" })}, ${week.bestDay.solved} solved.`,
    });
  if (week.hardest)
    notes.push({
      color: "var(--amber)",
      text: (
        <>
          Hardest solve: <span className="font-[600]">{week.hardest.title}</span>
          {week.hardest.difficulty && (
            <span className="ml-2 inline-block align-middle">
              <DifficultyTag difficulty={week.hardest.difficulty} />
            </span>
          )}
        </>
      ),
    });
  if (weakest)
    notes.push({
      color: "var(--rose)",
      text: `${weakest.label} is your weakest topic (${weakest.score}/100). Worth a stretch problem this week.`,
      href: "/dashboard/today",
      cta: "Practice",
    });
  notes.push({
    color: "var(--sky)",
    text: `${focusH} hours of focus this week against a target of ${week.goals.focusHours}.`,
    href: "/dashboard/sessions",
    cta: "Sessions",
  });
  // Steps 1 and 2 are read-only; step 3 is where you act.
  const step = 3;

  return (
    <div className="flex flex-col gap-5">
      <SectionTabs tabs={INSIGHTS_TABS} />
      <PageHeader
        eyebrow={`Weekly review · week of ${fmtDay(week.weekStart, { day: "numeric", month: "short" })}`}
        title={
          <>
            Your week, <em>in five minutes</em>
          </>
        }
        subtitle="Look back, then set this week's targets. Targets reset every Monday and show as rings on Today."
      />

      <ol className="flex gap-1.5" aria-label="Steps">
        {["Look back", "What stood out", "This week's targets"].map((t, i) => (
          <li key={t} className="flex flex-1 flex-col gap-1.5">
            <span
              className="h-[3px] rounded-full"
              style={{
                background:
                  i + 1 < step ? "var(--signal)" : i + 1 === step ? "var(--ink)" : "var(--line-2)",
              }}
            />
            <span className="text-12 text-ink">
              {i + 1} · {t}
            </span>
          </li>
        ))}
      </ol>

      <Card className="p-[22px]">
        <CardHeader>
          <CardTitle>1 · Look back</CardTitle>
          <CardSub>vs the week before</CardSub>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 max-lg:[&>*:last-child]:col-span-full">
          {compare.map((c) => {
            const top = Math.max(1, c.now, c.prev);
            const d = c.now - c.prev;
            return (
              <div
                key={c.label}
                className="surface-inset flex flex-col gap-2.5 rounded-[16px] p-3.5"
              >
                <span className="text-12 text-ink-2">{c.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="num font-display text-[28px] leading-none">{c.now}</span>
                  <span
                    className={cn(
                      "tnum text-12 font-[600]",
                      d > 0 ? "text-signal-text" : d < 0 ? "text-bad" : "text-ink-3",
                    )}
                  >
                    {d === 0 ? "same" : d > 0 ? `+${d}` : d}
                  </span>
                </span>
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="w-8 text-11 text-ink-3">this</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(c.now / top) * 100}%`, background: c.color }}
                      />
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-8 text-11 text-ink-3">prev</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-line-3"
                        style={{ width: `${(c.prev / top) * 100}%` }}
                      />
                    </span>
                  </span>
                </span>
              </div>
            );
          })}
          <div className="surface-inset flex flex-col gap-2.5 rounded-[16px] p-3.5">
            <span className="text-12 text-ink-2">Focus</span>
            <span className="num font-display text-[28px] leading-none">
              {focusH}
              <small className="ml-0.5 text-[.5em] text-ink-3">h</small>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-8 text-11 text-ink-3">goal</span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-[var(--sky)]"
                  style={{
                    width: `${Math.min(100, (focusH / Math.max(1, week.goals.focusHours)) * 100)}%`,
                  }}
                />
              </span>
            </span>
          </div>
        </div>
        <div className="mt-4 grid h-[110px] grid-cols-7 items-end gap-2 border-t border-line pt-4">
          {week.days.map((d) => (
            <div key={d.date} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="tnum text-11 text-ink-3">{d.solved || ""}</span>
              <span
                className={cn(
                  "w-full max-w-9 origin-bottom animate-[grow-y_700ms_var(--ease-out)_backwards] rounded-[6px]",
                  !d.solved && "h-1",
                )}
                style={{
                  height: d.solved ? `${Math.max(10, (d.solved / max) * 100)}%` : undefined,
                  background: d.solved
                    ? week.bestDay?.date === d.date
                      ? "var(--signal)"
                      : "color-mix(in srgb, var(--signal) 45%, transparent)"
                    : "var(--line-2)",
                }}
              />
              <span className="text-11 text-ink-3">{fmtDay(d.date, { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3.5 xl:grid-cols-2">
        <Card className="p-[22px]">
          <CardHeader>
            <CardTitle>2 · What stood out</CardTitle>
          </CardHeader>
          <ul className="flex flex-col">
            {notes.map((n, i) => (
              <li
                key={i}
                className="flex items-center gap-3 border-t border-line py-3 text-14 first:border-t-0"
              >
                <i className="size-2 shrink-0 rounded-full" style={{ background: n.color }} />
                <span className="flex-1">{n.text}</span>
                {n.href && (
                  <Link href={n.href} className="text-12 text-ink-2 hover:text-ink">
                    {n.cta}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-[22px]">
          <CardHeader>
            <CardTitle>3 · This week&apos;s targets</CardTitle>
            <CardSub>they show as rings on Today</CardSub>
          </CardHeader>
          <GoalsForm weekStart={week.weekStart} initial={week.goals} />
        </Card>
      </div>
    </div>
  );
}

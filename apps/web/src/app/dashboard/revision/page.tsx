import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, History, RotateCcw } from "lucide-react";
import { topicLabel, topicsOf } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Stat,
  buttonClasses,
} from "@upsolve/ui";
import { dueLabel, ResultTag, reviewUrl, StepLadder, UpcomingStrip } from "@/components/learning";
import { PLATFORM_LABEL } from "@/components/platform-meta";
import { ManualReview, RetireButton } from "@/components/review-actions";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import {
  getLearning,
  getTopicTargets,
  masteryOf,
  reviewHistory,
  revisionQueue,
  type QueueEntry,
} from "@/lib/learning";
import { localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Revision" };

const icon = (Icon: typeof RotateCcw) => <Icon size={13} strokeWidth={2} />;

export default function RevisionPage() {
  return (
    <div className="flex flex-col gap-5">
      <Suspense
        fallback={
          <>
            <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
              Revision<span className="block text-ink-3">Loading your queue</span>
            </h1>
            <div className="h-96 animate-pulse rounded-lg bg-surface" />
          </>
        }
      >
        <RevisionContent />
      </Suspense>
    </div>
  );
}

async function RevisionContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your revision queue.</p>;

  const [profile, problems, targets] = await Promise.all([
    getProfile(user.id),
    getLearning(user.id),
    getTopicTargets(),
  ]);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const now = requestNow();
  const { end: endOfToday } = localDay(tz, now);
  const mastery = masteryOf(problems, targets, now);
  const queue = revisionQueue(problems, mastery, { tz, cap: profile?.reviewCap ?? 5, now });
  const history = reviewHistory(problems, 25);
  const retired = problems.filter((p) => p.state.retired);
  const recent = history.filter((h) => h.at > now - 30 * 86_400_000);
  const passRate = recent.length
    ? Math.round((recent.filter((h) => h.result === "pass").length / recent.length) * 100)
    : null;

  const left = queue.today.length;
  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Revision
        <span className="block text-ink-3">
          {problems.length === 0
            ? "Nothing to revise yet"
            : left > 0
              ? `${left} to revise today`
              : queue.reviewedToday > 0
                ? "Done for today"
                : "Nothing due today"}
        </span>
      </h1>

      {problems.length === 0 ? (
        <Card className="flex flex-wrap items-center gap-4">
          <p className="min-w-0 flex-1 text-[15px]">
            <span className="text-ink-3">Solve something first.</span> Every problem you solve on a
            connected platform is scheduled here: tomorrow if you needed the solution, a week out if
            you solved it alone.
          </p>
          <Link href="/dashboard/sheets" className={buttonClasses({ variant: "signal" })}>
            Pick a sheet <ButtonArrow />
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-3.5">
          <Kpi label="Today" value={`${queue.reviewedToday}`} unit={`of ${queue.cap} done`} />
          <Kpi label="Waiting" value={String(queue.backlog)} unit="over today's cap" />
          <Kpi label="This week" value={String(queue.reviewedWeek)} unit="reviews" />
          <Kpi
            label="Pass rate"
            value={passRate === null ? "—" : String(passRate)}
            unit={passRate === null ? "no reviews yet" : "% · last 30 days"}
          />

          <Card className="col-span-12 xl:col-span-8">
            <CardHeader>
              <CardTitle icon={icon(RotateCcw)}>Due today</CardTitle>
              <Link
                href="/dashboard/settings#learning"
                className="font-mono text-[11.5px] text-ink-3 hover:text-ink"
              >
                {queue.cap} a day · change
              </Link>
            </CardHeader>
            {left === 0 ? (
              <p className="text-[13.5px] text-ink-2">
                {queue.reviewedToday > 0
                  ? `You've done ${queue.reviewedToday} today.`
                  : "Nothing due."}{" "}
                {queue.backlog > 0
                  ? `${queue.backlog} more are waiting; they come back tomorrow, oldest and weakest first.`
                  : "Come back tomorrow."}
              </p>
            ) : (
              <ul>
                {queue.today.map((p) => (
                  <ReviewRow key={p.problemId} p={p} now={now} endOfToday={endOfToday} />
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-dashed border-line-2 pt-3 text-[12.5px] leading-relaxed text-ink-3">
              <span className="text-ink-2">Re-solve</span> opens the problem with the extension in
              review mode: a solo Accepted moves it further out (1 → 3 → 7 → 16 → 35 → 90 days), a
              hint moves it back, seeing the solution resets it. No extension? Grade yourself; those
              reviews stop at 16 days.
            </p>
          </Card>

          <Card className="col-span-12 xl:col-span-4">
            <CardHeader>
              <CardTitle icon={icon(CalendarDays)}>Coming up</CardTitle>
              <CardSub>next 14 days</CardSub>
            </CardHeader>
            <UpcomingStrip upcoming={queue.upcoming} now={now} />
            <p className="mt-4 font-mono text-[11px] text-ink-3">
              {problems.length - retired.length} problems scheduled
              {retired.length ? ` · ${retired.length} retired` : ""}
            </p>
          </Card>

          <Card className="col-span-12">
            <CardHeader>
              <CardTitle icon={icon(History)}>History</CardTitle>
              <CardSub>latest reviews</CardSub>
            </CardHeader>
            {history.length === 0 ? (
              <p className="text-[13px] text-ink-2">Your reviews show up here.</p>
            ) : (
              <ul>
                {history.map((h) => (
                  <li
                    key={`${h.problem.problemId}-${h.at}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0"
                  >
                    <Link
                      href={`/dashboard/problems/${h.problem.problemId}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:underline"
                    >
                      {h.problem.title}
                    </Link>
                    <ResultTag entry={h} />
                    <span className="w-16 text-right font-mono text-[11px] text-ink-3">
                      <TimeAgo date={new Date(h.at)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {retired.length > 0 && (
            <Card className="col-span-12">
              <CardHeader>
                <CardTitle>Retired</CardTitle>
                <CardSub>not scheduled</CardSub>
              </CardHeader>
              <ul>
                {retired.map((p) => (
                  <li
                    key={p.problemId}
                    className="flex items-center gap-3 border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
                  >
                    <Link
                      href={`/dashboard/problems/${p.problemId}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] hover:underline"
                    >
                      {p.title}
                    </Link>
                    <RetireButton problemId={p.problemId} retired />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card className="col-span-6 xl:col-span-3">
      <CardSub>{label.toUpperCase()}</CardSub>
      <Stat value={value} unit={unit} className="mt-2 text-[34px]" />
    </Card>
  );
}

function ReviewRow({ p, now, endOfToday }: { p: QueueEntry; now: number; endOfToday: number }) {
  const topics = topicsOf(p.topics).slice(0, 2).map(topicLabel);
  const solves = p.state.history.length + 1;
  return (
    <li className="flex flex-col gap-2.5 border-t border-dashed border-line-2 py-3.5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/problems/${p.problemId}`}
            className="truncate text-[14.5px] font-[550] tracking-[-0.01em] hover:underline"
          >
            {p.title}
          </Link>
          {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-3">
          <StepLadder step={p.state.step} />
          <span>{dueLabel(p.state.dueAt, now, endOfToday)}</span>
          <span>·</span>
          <span>
            last solved <TimeAgo date={new Date(p.state.lastAt)} />
          </span>
          {topics.length > 0 && <span>· {topics.join(", ")}</span>}
          {solves > 1 && <span>· {solves} times</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <a
          href={reviewUrl(p.url)}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({
            variant: "primary",
            size: "sm",
            className: "h-[30px] px-3 text-[12.5px]",
          })}
          title={`Open on ${PLATFORM_LABEL[p.platform]} with the timer in review mode`}
        >
          Re-solve <ButtonArrow />
        </a>
        <ManualReview problemId={p.problemId} />
        <RetireButton problemId={p.problemId} retired={false} />
      </div>
    </li>
  );
}

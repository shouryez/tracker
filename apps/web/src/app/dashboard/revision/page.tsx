import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CircleCheck, CircleX, History, Play, RotateCcw } from "lucide-react";
import { topicLabel, topicsOf } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  EmptyState,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  StrengthLadder,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { CelebrateOnce } from "@/components/dashboard/celebrate";
import { dueLabel, ResultTag, reviewUrl } from "@/components/learning";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { KpiStrip, LadderStairs } from "@/components/dashboard/lamplight";
import { Tabs } from "@/components/tabs";
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
import { localDate, localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Revision" };

const DAY_MS = 86_400_000;
const icon = (Icon: typeof RotateCcw) => <Icon size={14} strokeWidth={2} />;

export default function RevisionPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<RevisionSkeleton />}>
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
  const recent = history.filter((h) => h.at > now - 30 * DAY_MS);
  const passRate = recent.length
    ? Math.round((recent.filter((h) => h.result === "pass").length / recent.length) * 100)
    : null;

  const left = queue.today.length;
  const first = queue.today[0];
  const { end: endToday } = localDay(tz, now);
  const overdueCount = queue.today.filter((p) => now - p.state.dueAt >= DAY_MS).length;
  const dueThisWeek = left + queue.upcoming.slice(0, 6).reduce((n, v) => n + v, 0);
  const heaviestIdx = queue.upcoming
    .slice(0, 6)
    .reduce((best, v, i, arr) => (v > (arr[best] ?? 0) ? i : best), 0);
  const heaviest = queue.upcoming.slice(0, 6).some((v) => v > 0)
    ? new Date(endToday + heaviestIdx * DAY_MS + 3_600_000).toLocaleDateString("en-GB", {
        weekday: "long",
        timeZone: tz,
      })
    : null;
  const scheduled = problems
    .filter((p) => !p.state.retired)
    .sort((a, b) => a.state.dueAt - b.state.dueAt);
  const weekRows = scheduled.filter((p) => p.state.dueAt < now + 7 * DAY_MS);
  const allRows = scheduled;

  // History grouped by week (display only).
  const groups: { label: string; items: typeof history }[] = [];
  for (const h of history) {
    const ago = Math.floor((now - h.at) / DAY_MS);
    const label = ago < 7 ? "This week" : ago < 14 ? "Last week" : "Earlier";
    const g = groups.at(-1);
    if (g?.label === label) g.items.push(h);
    else groups.push({ label, items: [h] });
  }

  return (
    <>
      <PageHeader
        eyebrow="Revision · spaced repetition"
        glow={PAGE_GLOW.revision}
        title="Revision"
        subtitle="Solve it again without notes to move it up a rung. Miss it and it goes back to rung 1."
        actions={
          problems.length > 0 && (
            <>
              <Link
                href="/dashboard/settings#learning"
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                Schedule settings
              </Link>
              {first && (
                <a
                  href={reviewUrl(first.url)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "signal", size: "sm" })}
                >
                  <Play size={13} aria-hidden="true" /> Revise {left} due now
                </a>
              )}
            </>
          )
        }
      />

      {problems.length === 0 ? (
        <Card>
          <EmptyState
            mascot="idle"
            title={
              <>
                Solve something <em>first.</em>
              </>
            }
            action={
              <Link href="/dashboard/sheets" className={buttonClasses({ variant: "signal" })}>
                Pick a sheet <ButtonArrow />
              </Link>
            }
          >
            Every problem you solve on a connected platform is scheduled here: tomorrow if you
            needed the solution, a week out if you solved it alone.
          </EmptyState>
        </Card>
      ) : (
        <div className="stagger-in grid grid-cols-12 gap-3.5">
          {left === 0 && queue.reviewedToday > 0 && (
            <CelebrateOnce id={`queue-${localDate(tz, now)}`} />
          )}
          <KpiStrip
            className="col-span-12"
            items={[
              {
                label: "Due today",
                value: left,
                note: overdueCount
                  ? `${overdueCount} overdue`
                  : `${queue.reviewedToday} done today`,
                tone: overdueCount ? "down" : undefined,
              },
              {
                label: "This week",
                value: dueThisWeek,
                note: heaviest ? `heaviest on ${heaviest}` : "nothing scheduled",
              },
              {
                label: "Scheduled",
                value: problems.length - retired.length,
                note: "across 6 rungs",
              },
              {
                label: "Pass rate",
                value: passRate ?? "—",
                unit: passRate === null ? undefined : "%",
                note: recent.length
                  ? `${recent.filter((h) => h.result === "pass").length} of ${recent.length} · 30 days`
                  : "no reviews yet",
              },
              {
                label: "Graduated",
                value: retired.length,
                note: "passed at 90 days",
              },
            ]}
          />

          {/* The ladder as a staircase */}
          <Card className="lamp col-span-12 p-[22px]">
            <CardHeader>
              <CardTitle>The ladder</CardTitle>
              <CardSub>each pass waits longer before asking again</CardSub>
            </CardHeader>
            <LadderStairs
              now={now}
              items={problems.map((p) => ({
                step: p.state.step,
                dueAt: p.state.dueAt,
                failed: p.state.lastResult === "fail",
                retired: p.state.retired,
              }))}
            />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-12 text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="h-1.5 w-3.5 rounded-[3px] bg-[var(--amber)]" /> due within 3 days
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-1.5 w-3.5 rounded-[3px] bg-line-3" /> waiting
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-1.5 w-3.5 rounded-[3px] bg-[var(--rose)]" /> missed last time
              </span>
            </div>
          </Card>

          {/* The queue: due, this week, everything scheduled */}
          <Card className="col-span-12 xl:col-span-8">
            <CardHeader>
              <CardTitle>Queue</CardTitle>
              <Link
                href="/dashboard/settings#learning"
                className="tnum text-12 text-ink-3 hover:text-ink"
              >
                {queue.cap} a day · change
              </Link>
            </CardHeader>
            <Tabs
              items={[
                {
                  id: "due",
                  label: `Due · ${left}`,
                  content:
                    left === 0 ? (
                      <p className="py-4 text-13 text-ink-2">
                        {queue.reviewedToday > 0
                          ? "All caught up for today."
                          : queue.backlog > 0
                            ? `${queue.backlog} more are waiting; they come back tomorrow, oldest and weakest first.`
                            : `Nothing due today. ${queue.upcoming[0] ?? 0} due tomorrow.`}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2.5">
                        {queue.today.map((p, i) => (
                          <ReviewRow
                            key={p.problemId}
                            p={p}
                            now={now}
                            endOfToday={endOfToday}
                            index={i}
                          />
                        ))}
                      </ul>
                    ),
                },
                {
                  id: "week",
                  label: `This week · ${weekRows.length}`,
                  content: <QueueTable rows={weekRows} now={now} endOfToday={endOfToday} />,
                },
                {
                  id: "all",
                  label: `All · ${allRows.length}`,
                  content: <QueueTable rows={allRows} now={now} endOfToday={endOfToday} />,
                },
              ]}
            />
          </Card>

          <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Next 14 days</CardTitle>
                <CardSub className="font-mono">
                  {queue.upcoming.slice(0, 14).reduce((n, v) => n + v, 0)} reviews
                </CardSub>
              </CardHeader>
              <div className="flex h-[110px] items-end gap-1 border-b border-line-2">
                {queue.upcoming.slice(0, 14).map((n, i) => (
                  <span
                    key={i}
                    title={`${n} due`}
                    className="flex-1 origin-bottom animate-[grow-y_600ms_var(--ease-out)_backwards] rounded-[4px_4px_1px_1px]"
                    style={{
                      height: n
                        ? `${(n / Math.max(1, ...queue.upcoming.slice(0, 14))) * 100}%`
                        : "2px",
                      background:
                        i === 0
                          ? "var(--amber)"
                          : "color-mix(in srgb, var(--amber) 40%, transparent)",
                      animationDelay: `${i * 30}ms`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-11 text-ink-3">
                <span>Tomorrow</span>
                <span>in a week</span>
                <span>in 2 weeks</span>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why the gaps grow</CardTitle>
              </CardHeader>
              <svg
                viewBox="0 0 320 130"
                className="h-auto w-full"
                role="img"
                aria-label="Memory drops after each solve and recovers at each review; each drop is slower than the last"
              >
                <line x1="0" y1="120" x2="320" y2="120" stroke="var(--line-2)" />
                <path
                  d="M8 18 C 26 60, 40 74, 52 78 L52 18 C 80 52, 100 64, 118 66 L118 18 C 160 44, 190 54, 214 56 L214 18 C 260 34, 290 40, 316 42"
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 18 C 30 80, 60 105, 120 112 C 180 116, 260 118, 316 118"
                  fill="none"
                  stroke="var(--line-3)"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                />
                {[
                  [52, "1d"],
                  [118, "3d"],
                  [214, "7d"],
                ].map(([x, l]) => (
                  <g key={l as string}>
                    <circle cx={x as number} cy="18" r="4" fill="var(--signal)" />
                    <text
                      x={x as number}
                      y="10"
                      textAnchor="middle"
                      fontSize="9"
                      fill="var(--ink-3)"
                      fontFamily="var(--font-mono)"
                    >
                      {l as string}
                    </text>
                  </g>
                ))}
              </svg>
              <p className="mt-2 text-12 leading-relaxed text-ink-3">
                Dashed: what you&apos;d remember with no revision. Each review flattens the drop, so
                the next one can wait longer. A solo re-solve moves it up a rung; a hint moves it
                back; seeing the solution resets it.
              </p>
            </Card>
          </div>

          {/* History */}
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle icon={icon(History)}>History</CardTitle>
              <CardSub>latest reviews</CardSub>
            </CardHeader>
            {history.length === 0 ? (
              <p className="text-13 text-ink-2">Your reviews show up here.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <section key={g.label}>
                    <p className="mb-1.5 label-mono">{g.label}</p>
                    <ul>
                      {g.items.map((h) => {
                        const ok = h.result === "pass";
                        return (
                          <li
                            key={`${h.problem.problemId}-${h.at}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2/70"
                          >
                            {ok ? (
                              <CircleCheck size={15} aria-hidden="true" className="text-success" />
                            ) : (
                              <CircleX
                                size={15}
                                aria-hidden="true"
                                className={h.result === "fail" ? "text-hard" : "text-medium"}
                              />
                            )}
                            <Link
                              href={`/dashboard/problems/${h.problem.problemId}`}
                              className="min-w-0 flex-1 truncate text-[13.5px] font-medium hover:underline"
                            >
                              {h.problem.title}
                            </Link>
                            <ResultTag entry={h} />
                            <span className="tnum w-16 text-right text-11 text-ink-3">
                              <TimeAgo date={new Date(h.at)} />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          {retired.length > 0 && (
            <Card tier="inset" className="col-span-12">
              <CardHeader>
                <CardTitle>Retired</CardTitle>
                <CardSub>not scheduled</CardSub>
              </CardHeader>
              <ul>
                {retired.map((p) => (
                  <li key={p.problemId} className="flex items-center gap-3 py-1.5">
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

type Scheduled = Awaited<ReturnType<typeof getLearning>>[number];

/** Scheduled problems as a table: the rung as six little bars, how the last try went, when it's due. */
function QueueTable({
  rows,
  now,
  endOfToday,
}: {
  rows: Scheduled[];
  now: number;
  endOfToday: number;
}) {
  if (rows.length === 0) return <p className="py-4 text-13 text-ink-2">Nothing here.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-[13.5px]">
        <thead>
          <tr className="text-left text-12 text-ink-3">
            <th className="border-b border-line px-3 pb-2.5 font-[500]">Problem</th>
            <th className="border-b border-line px-3 pb-2.5 font-[500]">Rung</th>
            <th className="border-b border-line px-3 pb-2.5 font-[500]">Last time</th>
            <th className="border-b border-line px-3 pb-2.5 font-[500]">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const last = p.state.history.at(-1);
            const failed = p.state.lastResult === "fail";
            const step = Math.min(5, Math.max(0, p.state.step));
            const overdue = now - p.state.dueAt >= DAY_MS;
            return (
              <tr key={p.problemId} className="border-b border-line last:border-b-0">
                <td className="px-3 py-3">
                  <Link
                    href={`/dashboard/problems/${p.problemId}`}
                    className="font-[550] hover:underline"
                  >
                    {p.title}
                  </Link>
                  <div className="text-12 text-ink-3">
                    {topicsOf(p.topics).slice(0, 2).map(topicLabel).join(" · ") || "—"}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="flex gap-[3px]" aria-label={`Rung ${step + 1} of 6`}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="h-1 w-3.5 rounded-full"
                        style={{
                          background:
                            i < step + 1
                              ? failed && i === step
                                ? "var(--rose)"
                                : "var(--amber)"
                              : "var(--surface-4)",
                        }}
                      />
                    ))}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {last ? <ResultTag entry={last} /> : <Tag>first solve</Tag>}
                </td>
                <td
                  className={cn(
                    "px-3 py-3 font-mono text-12",
                    overdue
                      ? "text-bad"
                      : p.state.dueAt <= endOfToday
                        ? "text-[var(--amber)]"
                        : "text-ink-2",
                  )}
                >
                  {dueLabel(p.state.dueAt, now, endOfToday)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReviewRow({
  p,
  now,
  endOfToday,
  index,
}: {
  p: QueueEntry;
  now: number;
  endOfToday: number;
  index: number;
}) {
  const topics = topicsOf(p.topics).slice(0, 2).map(topicLabel);
  const solves = p.state.history.length + 1;
  const overdue = Math.floor((now - p.state.dueAt) / DAY_MS);
  return (
    <li
      className="surface-inset flex flex-col gap-3 rounded-[16px] p-3.5 transition-[border-color] duration-[var(--dur-base)] hover:border-line-2 sm:flex-row sm:items-center"
      style={{ animation: `rise-in 420ms var(--ease-out) ${index * 50}ms backwards` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/problems/${p.problemId}`}
            className="truncate text-15 font-[600] tracking-[-0.01em] hover:underline"
          >
            {p.title}
          </Link>
          {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
          {overdue >= 1 && (
            <StatusBadge status="overdue" label={`${overdue}d overdue`} pulse={overdue > 7} />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-12 text-ink-3">
          <StrengthLadder
            stage={p.state.step + 1}
            compact
            overdue={overdue >= 1}
            dueLabel={dueLabel(p.state.dueAt, now, endOfToday)}
          />
          <span>
            last solved <TimeAgo date={new Date(p.state.lastAt)} />
          </span>
          {solves > 1 && <span className="tnum">· {solves}×</span>}
          {topics.map((t) => (
            <Tag key={t} className="h-5 px-1.5 text-11">
              {t}
            </Tag>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <a
          href={reviewUrl(p.url)}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary", size: "sm", className: "h-[34px]" })}
          title={`Open on ${PLATFORM_LABEL[p.platform]} with the timer in review mode`}
        >
          <Play size={13} aria-hidden="true" /> Re-solve
        </a>
        <ManualReview problemId={p.problemId} />
        <RetireButton problemId={p.problemId} retired={false} />
      </div>
    </li>
  );
}

function RevisionSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-72" />
      </div>
      <div className={cn("grid grid-cols-12 gap-3.5")}>
        <SkeletonCard lines={3} className="col-span-12 h-[230px] lg:col-span-5" />
        <SkeletonCard lines={2} className="col-span-12 h-[230px] lg:col-span-7" />
        <SkeletonCard lines={6} className="col-span-12 h-[360px] xl:col-span-8" />
        <SkeletonCard lines={4} className="col-span-12 h-[360px] xl:col-span-4" />
      </div>
    </div>
  );
}

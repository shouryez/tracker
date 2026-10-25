import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  ExternalLink,
  History,
  ListChecks,
  NotebookPen,
  RotateCcw,
  Shapes,
} from "lucide-react";
import { INTERVAL_DAYS, topicLabel, topicsOf } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Tag,
  buttonClasses,
  type TagTone,
} from "@upsolve/ui";
import { dueLabel, ResultTag, reviewUrl, StepLadder } from "@/components/learning";
import { NoteEditor } from "@/components/note-editor";
import { PLATFORM_LABEL } from "@/components/platform-meta";
import { ManualReview, RetireButton } from "@/components/review-actions";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning } from "@/lib/learning";
import { getProblemDetail, type ProblemDetail } from "@/lib/problem-data";
import { formatDuration } from "@/lib/sessions-data";
import { localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Problem" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const icon = (Icon: typeof History) => <Icon size={13} strokeWidth={2} />;

const VERDICT_TONE: Record<ProblemDetail["submissions"][number]["verdict"], TagTone> = {
  AC: "ac",
  WA: "wa",
  TLE: "tle",
  MLE: "tle",
  RE: "wa",
  CE: "neutral",
  OTHER: "neutral",
};
const INDEPENDENCE = { solo: "solo", hint: "used a hint", solution: "saw the solution" } as const;
const SITE_LABEL = {
  leetcode: "LeetCode",
  geeksforgeeks: "GFG",
  takeuforward: "takeUforward",
  source: "Source",
};

export default function ProblemPage({ params }: PageProps<"/dashboard/problems/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/revision"
        className="inline-flex items-center gap-1.5 self-start font-mono text-[11.5px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft size={13} aria-hidden="true" /> Revision
      </Link>
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg bg-surface" />}>
        <ProblemContent params={params} />
      </Suspense>
    </div>
  );
}

async function ProblemContent({
  params,
}: {
  params: PageProps<"/dashboard/problems/[id]">["params"];
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your problems.</p>;

  const [problem, learning, profile] = await Promise.all([
    getProblemDetail(user.id, id),
    getLearning(user.id),
    getProfile(user.id),
  ]);
  if (!problem) notFound();
  const review = learning.find((p) => p.problemId === id) ?? null;
  const now = requestNow();
  const { end: endOfToday } = localDay(profile?.timezone ?? "Asia/Kolkata", now);
  const topics = topicsOf(problem.topics).map(topicLabel);
  const mistakes = countMistakes(problem.sessions);
  const solveUrl = problem.versions[0]?.url ?? problem.sheets[0]?.links[0]?.url ?? null;
  const timeline = [
    ...problem.sessions.map((s) => ({ kind: "session" as const, at: s.at, s })),
    ...problem.submissions.map((s) => ({ kind: "submission" as const, at: s.at, s })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.05] font-[550] tracking-[-0.04em]">
            {problem.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {problem.difficulty && <DifficultyTag difficulty={problem.difficulty} />}
            {topics.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
        {solveUrl && (
          <a
            href={review && !review.state.retired ? reviewUrl(solveUrl) : solveUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "signal" })}
          >
            {review ? "Re-solve" : "Solve it"} <ButtonArrow />
          </a>
        )}
      </div>

      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle icon={icon(History)}>Your attempts</CardTitle>
              <CardSub>
                {problem.submissions.length} submissions · {problem.sessions.length} timed
              </CardSub>
            </CardHeader>
            {timeline.length === 0 ? (
              <p className="text-[13px] text-ink-2">
                You haven&apos;t tried this one yet. Open it with the extension connected and the
                timer starts on its own.
              </p>
            ) : (
              <ol className="relative ml-1.5 border-l border-line-2">
                {timeline.slice(0, 60).map((t) =>
                  t.kind === "session" ? (
                    <li key={`s-${t.s.id}`} className="relative py-2.5 pl-4">
                      <span
                        aria-hidden="true"
                        className="absolute top-[15px] -left-[4.5px] size-2 rounded-full bg-primary"
                      />
                      <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
                        <span className="font-medium">
                          {t.s.mode === "review" ? "Review session" : "Timed session"}
                        </span>
                        <span className="font-mono text-[11.5px] text-ink-2">
                          {formatDuration(t.s.activeMs)} active · {t.s.submits} submit
                          {t.s.submits === 1 ? "" : "s"}
                        </span>
                        {t.s.outcome === "solved" ? (
                          <Tag tone="ac" mono>
                            solved
                          </Tag>
                        ) : (
                          <Tag mono>{t.s.outcome === "open" ? "open" : "left"}</Tag>
                        )}
                        {t.s.independence && <Tag mono>{INDEPENDENCE[t.s.independence]}</Tag>}
                      </p>
                      {t.s.note && <p className="mt-1 text-[13px] text-ink-2">“{t.s.note}”</p>}
                      <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                        <TimeAgo date={t.s.at} />
                        {t.s.mistakeTags.length > 0 && ` · ${t.s.mistakeTags.join(", ")}`}
                      </p>
                    </li>
                  ) : (
                    <li
                      key={`u-${t.s.id}`}
                      className="relative flex flex-wrap items-center gap-2 py-1.5 pl-4"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute top-[13px] -left-[3.5px] size-1.5 rounded-full bg-line-2"
                      />
                      <Tag tone={VERDICT_TONE[t.s.verdict]} mono>
                        {t.s.verdict}
                      </Tag>
                      <span className="font-mono text-[11px] text-ink-3">
                        {PLATFORM_LABEL[t.s.platform]}
                        {t.s.language ? ` · ${t.s.language}` : ""}
                        {t.s.runtimeMs !== null ? ` · ${t.s.runtimeMs} ms` : ""} ·{" "}
                        <TimeAgo date={t.s.at} />
                      </span>
                    </li>
                  ),
                )}
              </ol>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={icon(NotebookPen)}>Notes</CardTitle>
              <CardSub>only you see these</CardSub>
            </CardHeader>
            <NoteEditor problemId={problem.id} initial={problem.note?.body ?? ""} />
            {mistakes.length > 0 && (
              <div className="mt-4 border-t border-dashed border-line-2 pt-3">
                <p className="mb-2 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                  Mistakes you tagged
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mistakes.map(([tag, n]) => (
                    <Tag key={tag} tone="wa" mono>
                      {tag} ×{n}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle icon={icon(RotateCcw)}>Revision</CardTitle>
              {review && <RetireButton problemId={problem.id} retired={review.state.retired} />}
            </CardHeader>
            {!review ? (
              <p className="text-[13px] text-ink-2">
                Scheduled after your first Accepted: tomorrow if you needed the solution, in 3 days
                with a hint, in a week solo.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <StepLadder step={review.state.step} />
                  <span className="font-mono text-[11.5px] text-ink-2">
                    {review.state.retired
                      ? "retired"
                      : `every ${INTERVAL_DAYS[review.state.step]}d · ${dueLabel(review.state.dueAt, now, endOfToday)}`}
                  </span>
                </div>
                {!review.state.retired && (
                  <div className="mt-3 border-t border-dashed border-line-2 pt-3">
                    <p className="mb-1.5 text-[12.5px] text-ink-3">
                      Revised it without the extension?
                    </p>
                    <ManualReview problemId={problem.id} className="-ml-2.5" />
                  </div>
                )}
                {review.state.history.length > 0 && (
                  <ul className="mt-3 border-t border-dashed border-line-2 pt-1">
                    {[...review.state.history]
                      .reverse()
                      .slice(0, 8)
                      .map((h) => (
                        <li key={h.at} className="flex items-center justify-between gap-2 py-1.5">
                          <ResultTag entry={h} />
                          <span className="font-mono text-[11px] text-ink-3">
                            <TimeAgo date={new Date(h.at)} />
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={icon(ExternalLink)}>Solve on</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-1.5">
              {problem.versions.map((v) => (
                <a
                  key={v.url}
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line-2 bg-surface-2 px-3 text-[12.5px] hover:border-ink-3"
                >
                  {PLATFORM_LABEL[v.platform]} <ExternalLink size={11} aria-hidden="true" />
                </a>
              ))}
              {problem.sheets
                .flatMap((s) => s.links)
                .filter(
                  (l, i, all) =>
                    l.site === "takeuforward" && all.findIndex((x) => x.url === l.url) === i,
                )
                .map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line-2 bg-surface-2 px-3 text-[12.5px] hover:border-ink-3"
                  >
                    {SITE_LABEL[l.site]} <ExternalLink size={11} aria-hidden="true" />
                  </a>
                ))}
            </div>
          </Card>

          {problem.sheets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle icon={icon(ListChecks)}>In your sheets</CardTitle>
              </CardHeader>
              <ul>
                {problem.sheets.map((s) => (
                  <li
                    key={s.slug}
                    className="border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
                  >
                    <Link
                      href={`/dashboard/sheets/${s.slug}`}
                      className="text-[13.5px] font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="font-mono text-[11px] text-ink-3">{s.step}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {problem.similar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle icon={icon(Shapes)}>Similar, not solved yet</CardTitle>
              </CardHeader>
              <ul>
                {problem.similar.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 border-t border-dashed border-line-2 py-2 first:border-t-0 first:pt-0"
                  >
                    <Link
                      href={`/dashboard/problems/${s.id}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] hover:underline"
                    >
                      {s.title}
                    </Link>
                    {s.difficulty && <DifficultyTag difficulty={s.difficulty} />}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function countMistakes(sessions: ProblemDetail["sessions"]): [string, number][] {
  const counts = new Map<string, number>();
  for (const s of sessions) for (const t of s.mistakeTags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

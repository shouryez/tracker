import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink, History, ListChecks, Play, RotateCcw, Shapes, Timer } from "lucide-react";
import { INTERVAL_DAYS, topicLabel, topicsOf } from "@upsolve/core";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  StrengthLadder,
  Tag,
  VerdictChip,
  buttonClasses,
} from "@upsolve/ui";
import { BackLink } from "@/components/back-link";
import { AttemptStrip, KpiStrip } from "@/components/dashboard/lamplight";
import { ProblemActions } from "@/components/daily/problem-actions";
import { dueLabel, ResultTag, reviewUrl } from "@/components/learning";
import {
  PLATFORM_LABEL as MARK_LABEL,
  PlatformMark,
  platformMarkId,
  type PlatformId,
} from "@/components/site-icons";
import { sheetIdentity } from "@/components/sheet-identity";
import { NoteEditor } from "@/components/note-editor";
import { PLATFORM_LABEL } from "@/components/platform-meta";
import { ManualReview, RetireButton } from "@/components/review-actions";
import { Tabs } from "@/components/tabs";
import { TimeAgo } from "@/components/time-ago";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning } from "@/lib/learning";
import { getMyGroups } from "@/lib/social-data";
import type { SheetItemLink } from "@upsolve/db";
import { getProblemDetail, type ProblemDetail } from "@/lib/problem-data";
import { formatDuration } from "@/lib/sessions-data";
import { localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Problem" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const icon = (Icon: typeof History) => <Icon size={13} strokeWidth={2} />;

const DAY_MS = 86_400_000;
const LINK_MARK: Partial<Record<SheetItemLink["site"], PlatformId>> = {
  takeuforward: "tuf",
  neetcode: "neetcode",
  youtube: "youtube",
  article: "article",
};
const INDEPENDENCE = { solo: "solo", hint: "used a hint", solution: "saw the solution" } as const;
const SITE_LABEL: Record<SheetItemLink["site"], string> = {
  leetcode: "LeetCode",
  geeksforgeeks: "GFG",
  takeuforward: "takeUforward",
  neetcode: "NeetCode",
  source: "Source",
  youtube: "Video explanation",
  article: "Article",
};

export default function ProblemPage({ params }: PageProps<"/dashboard/problems/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink fallback="/dashboard/revision" fallbackLabel="Revision" />
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-96" />
            <div className="grid grid-cols-12 gap-3.5">
              <SkeletonCard lines={8} className="col-span-12 h-[480px] xl:col-span-8" />
              <SkeletonCard lines={4} className="col-span-12 h-[300px] xl:col-span-4" />
            </div>
          </div>
        }
      >
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

  const [problem, learning, profile, myGroups] = await Promise.all([
    getProblemDetail(user.id, id),
    getLearning(user.id),
    getProfile(user.id),
    getMyGroups(user.id),
  ]);
  if (!problem) notFound();
  const review = learning.find((p) => p.problemId === id) ?? null;
  const now = requestNow();
  const { end: endOfToday } = localDay(profile?.timezone ?? "Asia/Kolkata", now);
  const topics = topicsOf(problem.topics).map(topicLabel);
  const mistakes = countMistakes(problem.sessions);
  const solveUrl = problem.versions[0]?.url ?? problem.sheets[0]?.links[0]?.url ?? null;
  const firstVersion = problem.versions[0];
  const firstMark = firstVersion ? platformMarkId(firstVersion.platform) : null;
  const status = review
    ? review.state.retired
      ? "solved"
      : review.state.dueAt <= endOfToday
        ? Math.floor((now - review.state.dueAt) / DAY_MS) >= 1
          ? "overdue"
          : "revise"
        : "solved"
    : problem.submissions.length + problem.sessions.length > 0
      ? "attempted"
      : "todo";
  const maxActive = Math.max(1, ...problem.sessions.map((x) => x.activeMs));
  const extraLinks = problem.sheets
    .flatMap((x) => x.links)
    .filter(
      (l, i, all) =>
        ["takeuforward", "neetcode", "youtube", "article"].includes(l.site) &&
        all.findIndex((y) => y.url === l.url) === i,
    );
  // The latest timed attempt, for the strip at the top.
  const lastSession = problem.sessions.reduce<(typeof problem.sessions)[number] | null>(
    (a, b) => (!a || b.at > a.at ? b : a),
    null,
  );
  const totalActive = problem.sessions.reduce((n, x) => n + x.activeMs, 0);
  const VERDICT_LABEL: Record<string, string> = {
    AC: "Accepted",
    WA: "Wrong answer",
    TLE: "Time limit",
    MLE: "Memory limit",
    RE: "Runtime error",
    CE: "Compile error",
    OTHER: "Other",
  };
  const timeline = [
    ...problem.sessions.map((s) => ({ kind: "session" as const, at: s.at, s })),
    ...problem.submissions.map((s) => ({ kind: "submission" as const, at: s.at, s })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <header className="relative isolate flex flex-wrap items-end justify-between gap-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 -z-10 h-56 w-[min(520px,90vw)] scale-[1.6] opacity-[.14]"
          style={{
            background: `radial-gradient(closest-side, ${problem.difficulty ? `var(--${problem.difficulty})` : "var(--violet)"}, transparent)`,
          }}
        />
        <div className="min-w-0">
          <p className="mb-2 label-mono">Problem</p>
          <h1 className="text-[clamp(28px,3.6vw,42px)] leading-[1.05] font-[600] tracking-[-0.04em]">
            {problem.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {problem.difficulty && <DifficultyTag difficulty={problem.difficulty} />}
            {topics.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ProblemActions
            problemId={problem.id}
            title={problem.title}
            groups={myGroups.map((g) => ({ id: g.id, name: g.name }))}
          />
          {firstVersion && (
            <a
              href={firstVersion.url}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary", className: "group" })}
            >
              {firstMark && <PlatformMark site={firstMark} size={15} />}
              Open on {PLATFORM_LABEL[firstVersion.platform]}
            </a>
          )}
          {solveUrl && (
            <a
              href={review && !review.state.retired ? reviewUrl(solveUrl) : solveUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "signal" })}
            >
              <Play size={14} aria-hidden="true" /> {review ? "Re-solve" : "Solve it"}{" "}
              <ButtonArrow />
            </a>
          )}
        </div>
      </header>

      <KpiStrip
        items={[
          {
            label: "Time on it",
            value: Math.round(totalActive / 60_000),
            unit: "min",
            note: `${problem.sessions.length} sitting${problem.sessions.length === 1 ? "" : "s"}`,
          },
          {
            label: "Submissions",
            value: problem.submissions.length,
            note: `${problem.submissions.filter((x) => x.verdict === "AC").length} accepted`,
          },
          {
            label: "How you solved it",
            value: lastSession?.independence ? INDEPENDENCE[lastSession.independence] : "—",
            note: lastSession?.independence ? "your honest answer" : "not answered yet",
          },
          {
            label: "Next revision",
            value: review
              ? review.state.retired
                ? "Done"
                : dueLabel(review.state.dueAt, now, endOfToday)
              : "—",
            note: review
              ? review.state.retired
                ? "graduated"
                : `rung ${Math.min(6, review.state.step + 1)} of 6`
              : "after your first solve",
          },
        ]}
      />

      {lastSession && (
        <Card className="p-[22px]">
          <CardHeader>
            <CardTitle>Latest attempt</CardTitle>
            <CardSub>
              <TimeAgo date={lastSession.at} />
            </CardSub>
          </CardHeader>
          <AttemptStrip
            start={lastSession.at.getTime()}
            activeMs={lastSession.activeMs}
            timeZone={profile?.timezone ?? "Asia/Kolkata"}
            submissions={problem.submissions.map((x) => ({
              at: x.at.getTime(),
              ok: x.verdict === "AC",
              label: VERDICT_LABEL[x.verdict] ?? x.verdict,
            }))}
          />
          <p className="mt-2 text-12 text-ink-3">
            Amber is time the extension counted; hatched is time after it, until your last
            submission.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-8">
          <Card>
            <Tabs
              items={[
                {
                  id: "attempts",
                  label: "Attempts",
                  count: problem.submissions.length + problem.sessions.length,
                  content: (
                    <>
                      {timeline.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <span className="mb-3 grid size-11 place-items-center rounded-[13px] border border-line-2 bg-surface-2 text-ink-2">
                            <Timer size={18} aria-hidden="true" />
                          </span>
                          <p className="text-15 font-[600]">
                            No attempts <em className="text-ink-3 not-italic">yet.</em>
                          </p>
                          <p className="mt-1 max-w-[42ch] text-13 text-ink-2">
                            Open it with the extension connected and the timer starts on its own.
                          </p>
                        </div>
                      ) : (
                        <ol className="relative ml-2 border-l border-line-2">
                          {timeline.slice(0, 60).map((t) =>
                            t.kind === "session" ? (
                              <li key={`s-${t.s.id}`} className="relative py-3 pl-5">
                                <span
                                  aria-hidden="true"
                                  className={`absolute top-[17px] -left-[5px] size-[9px] rounded-full border-2 border-surface ${t.s.outcome === "solved" ? "bg-success shadow-[0_0_8px_var(--success)]" : "bg-violet"}`}
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
                                    <Tag tone="success" mono>
                                      solved
                                    </Tag>
                                  ) : (
                                    <Tag mono>{t.s.outcome === "open" ? "open" : "left"}</Tag>
                                  )}
                                  {t.s.independence && (
                                    <Tag mono>{INDEPENDENCE[t.s.independence]}</Tag>
                                  )}
                                </p>
                                <span className="mt-2 flex h-1.5 max-w-[320px] overflow-hidden rounded-full bg-surface-3">
                                  <span
                                    className="h-full origin-left animate-[grow-x_700ms_var(--ease-out)_backwards] rounded-full bg-violet"
                                    style={{
                                      width: `${Math.max(3, (t.s.activeMs / maxActive) * 100)}%`,
                                    }}
                                  />
                                </span>
                                {t.s.takeaway && (
                                  <p className="mt-2 text-13">
                                    <span className="mr-1.5 text-signal-text">→</span>
                                    {t.s.takeaway}
                                  </p>
                                )}
                                {t.s.note && (
                                  <p className="mt-2 border-l-2 border-line-3 pl-2.5 text-13 text-ink-2 italic">
                                    {t.s.note}
                                  </p>
                                )}
                                <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                                  <TimeAgo date={t.s.at} />
                                  {t.s.mistakeTags.length > 0 && ` · ${t.s.mistakeTags.join(", ")}`}
                                </p>
                              </li>
                            ) : (
                              <li
                                key={`u-${t.s.id}`}
                                className="relative flex flex-wrap items-center gap-2 py-1.5 pl-5"
                              >
                                <span
                                  aria-hidden="true"
                                  className="absolute top-[13px] -left-[3.5px] size-1.5 rounded-full bg-line-3"
                                />
                                <VerdictChip verdict={t.s.verdict} />
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
                    </>
                  ),
                },
                {
                  id: "notes",
                  label: "Notes",
                  count: problem.note ? 1 : undefined,
                  content: (
                    <>
                      <NoteEditor problemId={problem.id} initial={problem.note?.body ?? ""} />
                      {mistakes.length > 0 && (
                        <div className="mt-4 border-t border-dashed border-line-2 pt-3">
                          <p className="mb-2 label-mono">Mistakes you tagged</p>
                          <div className="flex flex-wrap gap-1.5">
                            {mistakes.map(([tag, n]) => (
                              <Tag key={tag} tone="wa" mono>
                                {tag} ×{n}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </div>

        <div className="col-span-12 flex flex-col gap-3.5 xl:col-span-4">
          <Card glow={review && !review.state.retired ? "var(--violet)" : undefined}>
            <CardHeader>
              <CardTitle icon={icon(RotateCcw)} tint="var(--violet)">
                Revision
              </CardTitle>
              {review && <RetireButton problemId={problem.id} retired={review.state.retired} />}
            </CardHeader>
            {!review ? (
              <p className="text-[13px] text-ink-2">
                Scheduled after your first Accepted: tomorrow if you needed the solution, in 3 days
                with a hint, in a week solo.
              </p>
            ) : (
              <>
                <div className="surface-inset flex items-end justify-between gap-3 rounded-[14px] p-3.5">
                  <StrengthLadder
                    stage={review.state.step + 1}
                    overdue={status === "overdue"}
                    dueLabel={dueLabel(review.state.dueAt, now, endOfToday)}
                  />
                  <span className="text-right">
                    <span className="block text-13 font-[600]">
                      {review.state.retired
                        ? "Retired"
                        : dueLabel(review.state.dueAt, now, endOfToday)}
                    </span>
                    {!review.state.retired && (
                      <span className="tnum block text-11 text-ink-3">
                        every {INTERVAL_DAYS[review.state.step]} days
                      </span>
                    )}
                  </span>
                </div>
                {!review.state.retired && (
                  <div className="mt-3.5">
                    <p className="mb-2 text-12 text-ink-3">Revised it without the extension?</p>
                    <ManualReview problemId={problem.id} />
                  </div>
                )}
                {review.state.history.length > 0 && (
                  <ul className="mt-3.5 border-t border-line pt-1.5">
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
            <div className="grid grid-cols-2 gap-2">
              {problem.versions.map((v) => {
                const mark = platformMarkId(v.platform);
                return (
                  <ResourceTile
                    key={v.url}
                    href={v.url}
                    label={PLATFORM_LABEL[v.platform]}
                    site={mark}
                  />
                );
              })}
              {extraLinks.map((l) => {
                const mark = LINK_MARK[l.site] ?? null;
                return (
                  <ResourceTile
                    key={l.url}
                    href={l.url}
                    label={mark ? MARK_LABEL[mark] : SITE_LABEL[l.site]}
                    site={mark}
                    wide={l.site === "youtube"}
                  />
                );
              })}
            </div>
          </Card>

          {problem.sheets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle icon={icon(ListChecks)}>In your sheets</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-2">
                {problem.sheets.map((s) => {
                  const { color, mono } = sheetIdentity(s.slug, s.name);
                  return (
                    <li key={s.slug}>
                      <Link
                        href={`/dashboard/sheets/${s.slug}`}
                        className="group/sh flex items-center gap-3 rounded-[12px] p-2 transition-colors hover:bg-surface-2"
                      >
                        <span
                          className="grid h-8 min-w-8 place-items-center rounded-[9px] border px-1 font-mono text-[10.5px] font-[700]"
                          style={{
                            color,
                            borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                            background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          }}
                        >
                          {mono}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-13 font-[600] group-hover/sh:underline">
                            {s.name}
                          </span>
                          <span className="block truncate text-11 text-ink-3">{s.step}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {problem.similar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle icon={icon(Shapes)} tint="var(--signal-mark)">
                  Similar, not solved yet
                </CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-2">
                {problem.similar.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/dashboard/problems/${s.id}`}
                      className="surface-inset group/sim flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:border-line-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-13 font-[550] group-hover/sim:underline">
                        {s.title}
                      </span>
                      {s.difficulty && <DifficultyTag difficulty={s.difficulty} />}
                      <ButtonArrow />
                    </Link>
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

/** "Solve on" logo tile: monochrome mark, brand colour on hover. */
function ResourceTile({
  href,
  label,
  site,
  wide,
}: {
  href: string;
  label: string;
  site: PlatformId | null;
  wide?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`surface-inset group flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-13 font-[550] transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:border-line-2 ${wide ? "col-span-2" : ""}`}
    >
      {site ? (
        <PlatformMark site={site} size={18} className="text-ink-2" />
      ) : (
        <ExternalLink size={15} aria-hidden="true" className="text-ink-3" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ExternalLink
        size={12}
        aria-hidden="true"
        className="text-ink-4 transition-colors group-hover:text-ink-2"
      />
    </a>
  );
}

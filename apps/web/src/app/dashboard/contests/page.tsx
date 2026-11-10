import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Check, History, TrendingUp } from "lucide-react";
import type { Platform } from "@upsolve/adapters";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  SkeletonCard,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { UpcomingContests } from "@/components/daily/upcoming-contests";
import { ContestCalendar } from "@/components/dashboard/lamplight";
import { requestNow } from "@/lib/time";
import { NumberTicker } from "@/components/fx/number-ticker";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { PLATFORM_LABEL, PLATFORM_STROKE } from "@/components/platform-meta";
import { CF_BANDS, RatingChart } from "@/components/rating-chart";
import { PlatformMark, platformMarkId } from "@/components/site-icons";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getUpcomingContests, googleCalendarUrl } from "@/lib/contest-calendar";
import { getProfile } from "@/lib/data";
import {
  getContests,
  getUpsolve,
  UPSOLVE_CONTESTS,
  type ContestRow,
  type ContestUpsolve,
} from "@/lib/contests-data";

export const metadata: Metadata = { title: "Contests" };

const icon = (Icon: typeof History) => <Icon size={13} strokeWidth={2} />;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function ContestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Contests · Codeforces and LeetCode"
        glow={PAGE_GLOW.contests}
        title={
          <>
            Contests <em>· what&apos;s left to upsolve</em>
          </>
        }
      />
      <Suspense fallback={<SkeletonCard lines={4} className="h-[220px]" />}>
        <UpcomingSection />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={5} className="col-span-12 h-[320px]" />
            <SkeletonCard lines={6} className="col-span-12 h-[360px] xl:col-span-5" />
            <SkeletonCard lines={6} className="col-span-12 h-[360px] xl:col-span-7" />
          </div>
        }
      >
        <ContestsContent />
      </Suspense>
    </div>
  );
}

/** Upcoming contests across platforms (loads on its own, independent of your results). */
async function UpcomingSection() {
  const user = await getCurrentUser();
  const tz = isDemoUser(user)
    ? "Asia/Kolkata"
    : ((await getProfile(user.id))?.timezone ?? "Asia/Kolkata");
  const upcoming = await getUpcomingContests();
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<CalendarDays size={14} />} tint="var(--medium)">
          Upcoming contests
        </CardTitle>
        <CardSub>next 14 days · 4 platforms</CardSub>
      </CardHeader>
      <ContestCalendar contests={upcoming} now={requestNow()} timeZone={tz} />
      <div className="mt-5 border-t border-line pt-4" />
      <UpcomingContests
        tz={tz}
        contests={upcoming.map((c) => ({ ...c, calendarUrl: googleCalendarUrl(c) }))}
      />
    </Card>
  );
}

async function ContestsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your contests.</p>;
  const contests = await getContests(user.id);

  if (contests.length === 0) {
    return (
      <Card className="relative overflow-hidden p-0">
        {/* Ghost of the populated page, blurred behind the message. */}
        <div aria-hidden="true" className="pointer-events-none p-6 opacity-30 blur-[3px]">
          <svg viewBox="0 0 600 160" className="h-auto w-full">
            <path
              d="M0 130 L60 118 L120 124 L180 96 L240 88 L300 92 L360 64 L420 70 L480 44 L540 50 L600 30"
              fill="none"
              stroke="var(--medium)"
              strokeWidth="3"
            />
          </svg>
          <div className="mt-4 flex gap-2">
            {["A", "B", "C", "D"].map((q) => (
              <span key={q} className="h-6 w-10 rounded-full bg-surface-3" />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(60%_80%_at_50%_50%,var(--surface)_30%,transparent)] px-6 text-center">
          <Podium />
          <p className="mt-4 text-20 font-[600]">
            No rated contests <em className="font-display font-normal">yet.</em>
          </p>
          <p className="mt-1.5 max-w-[48ch] text-13 text-ink-2">
            Connect Codeforces or LeetCode and take part in a contest: your rating, every result and
            an upsolve list of the problems you didn&apos;t finish show up here.
          </p>
          <Link
            href="/dashboard/settings"
            className={buttonClasses({ variant: "signal", className: "mt-5" })}
          >
            Connect platforms <ButtonArrow />
          </Link>
        </div>
        <div className="h-[340px]" />
      </Card>
    );
  }

  const platforms = [...new Set(contests.map((c) => c.platform))];
  return (
    <div className="stagger-in grid grid-cols-12 gap-3.5">
      {platforms.map((p) => (
        <RatingCard
          key={p}
          platform={p}
          contests={contests.filter((c) => c.platform === p)}
          wide={platforms.length === 1}
        />
      ))}
      <Suspense fallback={<div className="col-span-12 h-[360px] skeleton rounded-lg" />}>
        <Upsolve userId={user.id} contests={contests} />
      </Suspense>
    </div>
  );
}

function RatingCard({
  platform,
  contests,
  wide,
}: {
  platform: Platform;
  contests: ContestRow[];
  wide: boolean;
}) {
  const rated = contests.filter((c) => c.newRating !== null).reverse();
  const last = rated.at(-1);
  const peak = Math.max(...rated.map((c) => c.newRating!));
  const delta = last && last.oldRating !== null ? last.newRating! - last.oldRating : null;
  return (
    <Card glow={PLATFORM_STROKE[platform]} className={cn("col-span-12", !wide && "xl:col-span-6")}>
      <CardHeader>
        <CardTitle
          icon={
            platformMarkId(platform) ? (
              <PlatformMark site={platformMarkId(platform)!} size={14} brand />
            ) : (
              icon(TrendingUp)
            )
          }
        >
          {PLATFORM_LABEL[platform]}
        </CardTitle>
        <CardSub>{contests.length} contests</CardSub>
      </CardHeader>
      <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="num text-[48px]">
          {last?.newRating ? <NumberTicker value={last.newRating} /> : "—"}
          <small className="ml-1.5 font-display text-[.42em] font-normal tracking-normal text-ink-3 italic">
            rating
          </small>
        </p>
        <div className="flex flex-wrap gap-1.5 pb-2">
          <Tag>
            peak{" "}
            <span className="tnum font-[600] text-ink">{Number.isFinite(peak) ? peak : "—"}</span>
          </Tag>
          {delta !== null && (
            <Tag tone={delta >= 0 ? "success" : "hard"} className="tnum">
              last {delta >= 0 ? "+" : ""}
              {delta}
            </Tag>
          )}
        </div>
      </div>
      {rated.length > 1 ? (
        <RatingChart
          stroke={PLATFORM_STROKE[platform] ?? "var(--primary)"}
          bands={platform === "codeforces" ? CF_BANDS : undefined}
          points={rated.map((c) => ({ at: c.at.getTime(), rating: c.newRating!, name: c.name }))}
        />
      ) : (
        <p className="text-13 text-ink-2">The chart appears after your second contest.</p>
      )}
    </Card>
  );
}

async function Upsolve({ userId, contests }: { userId: string; contests: ContestRow[] }) {
  const recent = await getUpsolve(userId, contests);
  const todo = recent.flatMap((c) =>
    c.problems.filter((p) => p.status === "todo").map((p) => ({ ...p, contest: c })),
  );
  const upsolved = recent.reduce(
    (n, c) => n + c.problems.filter((p) => p.status === "upsolved").length,
    0,
  );

  return (
    <>
      <Card className="col-span-12 xl:col-span-5">
        <CardHeader>
          <CardTitle>Upsolve</CardTitle>
          <CardSub>
            {todo.length} left · {upsolved} upsolved
          </CardSub>
        </CardHeader>
        {recent.length === 0 ? (
          <p className="text-[13.5px] text-ink-2">Your recent contests show up here.</p>
        ) : (
          <ul className="flex flex-col">
            {recent.slice(0, UPSOLVE_CONTESTS).map((c) => {
              const row = contests.find(
                (x) => x.platform === c.platform && x.contestId === c.contestId,
              );
              const delta =
                row && row.newRating !== null && row.oldRating !== null
                  ? row.newRating - row.oldRating
                  : null;
              const inContest = c.problems.filter((p) => p.status === "contest").length;
              return (
                <li
                  key={`${c.platform}-${c.contestId}`}
                  className="flex flex-col gap-2.5 border-t border-line py-3.5 first:border-t-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-[600]">{c.name}</span>
                    <span className="text-12 text-ink-3">
                      {inContest} of {c.problems.length} in contest
                    </span>
                    {delta !== null && (
                      <span
                        className={cn(
                          "ml-auto font-mono text-12",
                          delta >= 0 ? "text-signal-text" : "text-bad",
                        )}
                      >
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {c.problems.map((p, i) => (
                      <a
                        key={p.externalId}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        title={p.title}
                        className="flex min-w-0 flex-col gap-0.5 rounded-[10px] px-2.5 py-2 transition-transform hover:-translate-y-0.5"
                        style={{
                          background:
                            p.status === "contest"
                              ? "var(--color-signal-soft)"
                              : p.status === "upsolved"
                                ? "var(--color-info-soft)"
                                : "var(--surface-2)",
                          boxShadow:
                            p.status === "todo" ? "inset 0 0 0 1px var(--line-2)" : undefined,
                        }}
                      >
                        <span
                          className="font-mono text-[10.5px]"
                          style={{
                            color:
                              p.status === "contest"
                                ? "var(--signal-text)"
                                : p.status === "upsolved"
                                  ? "var(--sky)"
                                  : "var(--ink-3)",
                          }}
                        >
                          Q{i + 1}
                          {p.attempted && p.status === "todo" ? " · tried" : ""}
                        </span>
                        <span
                          className={cn(
                            "truncate text-12",
                            p.status === "todo" ? "text-ink" : "text-ink-2",
                          )}
                        >
                          {p.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-12 text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-signal" /> in contest
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-[var(--sky)]" /> upsolved
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-line-3" /> left
          </span>
        </div>
      </Card>

      <Card className="col-span-12 xl:col-span-7">
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardSub>newest first</CardSub>
        </CardHeader>
        <ul>
          {contests.slice(0, 50).map((c) => {
            const detail = recent.find(
              (r) => r.platform === c.platform && r.contestId === c.contestId,
            );
            return <ContestItem key={`${c.platform}-${c.contestId}`} c={c} detail={detail} />;
          })}
        </ul>
      </Card>
    </>
  );
}

function ContestItem({ c, detail }: { c: ContestRow; detail: ContestUpsolve | undefined }) {
  const delta = c.newRating !== null && c.oldRating !== null ? c.newRating - c.oldRating : null;
  const inContest = detail?.problems.filter((p) => p.status === "contest").length;
  const solved = c.solved ?? inContest ?? null;
  const total = c.total ?? (detail?.problems.length || null);
  return (
    <li className="rounded-[12px] px-2 py-3 transition-colors hover:bg-surface-2/60">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-[550]">{c.name}</span>
          <span className="tnum text-11 text-ink-3">
            {PLATFORM_LABEL[c.platform]} · {fmtDate(c.at)}
            {solved !== null && total ? ` · ${solved}/${total} in contest` : ""}
          </span>
        </span>
        {c.rank ? <Tag className="tnum">#{c.rank.toLocaleString("en-IN")}</Tag> : null}
        {delta !== null && (
          <Tag tone={delta >= 0 ? "success" : "hard"} className="tnum font-[700]">
            {delta >= 0 ? "+" : ""}
            {delta}
          </Tag>
        )}
      </div>
      {detail && detail.problems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detail.problems.map((p) => (
            <a
              key={p.externalId}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              title={`${p.title}: ${
                p.status === "contest"
                  ? "solved in the contest"
                  : p.status === "upsolved"
                    ? "upsolved"
                    : p.attempted
                      ? "attempted, not solved"
                      : "not solved"
              }`}
            >
              <Tag
                mono
                tone={
                  p.status === "contest" ? "ac" : p.status === "upsolved" ? "signal" : "neutral"
                }
                className={cn(p.status === "todo" && !p.attempted && "opacity-70")}
              >
                {p.status !== "todo" && <Check size={10} aria-hidden="true" />}
                {label(p.externalId, c.platform, detail.problems.indexOf(p))}
              </Tag>
            </a>
          ))}
        </div>
      )}
    </li>
  );
}

/** "1850C" → "C"; LeetCode problems are Q1–Q4. */
function label(externalId: string, platform: Platform, index: number) {
  return platform === "codeforces" ? externalId.replace(/^\d+/, "") : `Q${index + 1}`;
}

/** Pixel podium for the empty state (the logo's pixel motif). */
function Podium() {
  const cols = [
    { h: 3, lit: false },
    { h: 5, lit: true },
    { h: 2, lit: false },
  ];
  return (
    <span aria-hidden="true" className="flex items-end gap-1.5">
      {cols.map((c, i) => (
        <span key={i} className="flex flex-col-reverse gap-[3px]">
          {Array.from({ length: c.h }, (_, k) => (
            <i
              key={k}
              className={cn(
                "block size-3.5 rounded-[3px]",
                c.lit
                  ? k === c.h - 1
                    ? "bg-signal shadow-[0_0_12px_var(--signal)]"
                    : "bg-medium/80"
                  : "bg-line-3",
              )}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

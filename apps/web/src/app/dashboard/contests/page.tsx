import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Check, History, Medal, TrendingUp } from "lucide-react";
import type { Platform } from "@upsolve/adapters";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  Pill,
  SkeletonCard,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { AddUpsolveButton } from "@/components/daily/add-upsolve";
import { UpcomingContests } from "@/components/daily/upcoming-contests";
import { ContestCalendar } from "@/components/dashboard/lamplight";
import { NumberTicker } from "@/components/fx/number-ticker";
import { PageHeader } from "@/components/page-header";
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
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Contests" };

const icon = (Icon: typeof History) => <Icon size={14} strokeWidth={2} />;
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
/** How many recent contests show in the hero before "Show all". */
const HERO_ROWS = 4;
/** History rows shown before "Show all". */
const HISTORY_ROWS = 12;

export default function ContestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Contests"
        title={
          <>
            What&apos;s left to <em>upsolve</em>
          </>
        }
        subtitle="Your rated contests on Codeforces and LeetCode, the problems you didn't finish, and what's coming up."
      />
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={6} className="col-span-12 h-[420px] xl:col-span-8" />
            <SkeletonCard lines={5} className="col-span-12 h-[420px] xl:col-span-4" />
          </div>
        }
      >
        <ContestsContent />
      </Suspense>
      <Suspense fallback={<SkeletonCard lines={4} className="h-[260px]" />}>
        <UpcomingSection />
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
        <CardTitle icon={icon(CalendarDays)}>Coming up</CardTitle>
        <CardSub>next 14 days · 4 platforms</CardSub>
      </CardHeader>
      <ContestCalendar contests={upcoming} now={requestNow()} timeZone={tz} />
      <div className="mt-5">
        <UpcomingContests
          tz={tz}
          contests={upcoming.map((c) => ({ ...c, calendarUrl: googleCalendarUrl(c) }))}
        />
      </div>
    </Card>
  );
}

async function ContestsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your contests.</p>;
  const contests = await getContests(user.id);

  if (contests.length === 0) return <NoContests />;

  const platforms = [...new Set(contests.map((c) => c.platform))];
  return (
    <div className="stagger-in grid grid-cols-12 gap-3.5">
      <Suspense
        fallback={
          <SkeletonCard lines={6} className="order-1 col-span-12 h-[420px] xl:col-span-8" />
        }
      >
        <UpsolveAndHistory userId={user.id} contests={contests} />
      </Suspense>
      <div className="order-2 col-span-12 grid gap-3.5 md:grid-cols-2 xl:col-span-4 xl:flex xl:flex-col">
        {platforms.map((p) => (
          <RatingCard key={p} platform={p} contests={contests.filter((c) => c.platform === p)} />
        ))}
        <RecordCard contests={contests} />
      </div>
    </div>
  );
}

function RatingCard({ platform, contests }: { platform: Platform; contests: ContestRow[] }) {
  const rated = contests.filter((c) => c.newRating !== null).reverse();
  const last = rated.at(-1);
  const peak = Math.max(...rated.map((c) => c.newRating!));
  const delta = last && last.oldRating !== null ? last.newRating! - last.oldRating : null;
  const mark = platformMarkId(platform);
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={mark ? <PlatformMark site={mark} size={14} brand /> : icon(TrendingUp)}>
          {PLATFORM_LABEL[platform]}
        </CardTitle>
        {delta !== null && (
          <Pill tone={delta >= 0 ? "mint" : "rose"}>
            {delta >= 0 ? "+" : ""}
            {delta} last
          </Pill>
        )}
      </CardHeader>
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="num font-display text-[44px] leading-none tracking-[-0.04em]">
          {last?.newRating ? <NumberTicker value={last.newRating} /> : "—"}
        </p>
        <p className="pb-1 text-right text-12 leading-snug text-ink-3">
          peak{" "}
          <span className="tnum font-[600] text-ink-2">{Number.isFinite(peak) ? peak : "—"}</span>
          <br />
          {contests.length} contests
        </p>
      </div>
      {rated.length > 1 ? (
        <RatingChart
          stroke={PLATFORM_STROKE[platform] ?? "var(--signal)"}
          bands={platform === "codeforces" ? CF_BANDS : undefined}
          points={rated.map((c) => ({ at: c.at.getTime(), rating: c.newRating!, name: c.name }))}
        />
      ) : (
        <p className="text-13 text-ink-2">The chart appears after your second contest.</p>
      )}
    </Card>
  );
}

/** Totals across every platform: fills the column under the rating cards. */
function RecordCard({ contests }: { contests: ContestRow[] }) {
  const ranks = contests.map((c) => c.rank).filter((r): r is number => !!r);
  const best = ranks.length ? Math.min(...ranks) : null;
  const scored = contests.filter((c) => c.solved !== null && c.total);
  const avg = scored.length
    ? scored.reduce((n, c) => n + c.solved! / c.total!, 0) / scored.length
    : null;
  const ups = contests.filter(
    (c) => c.newRating !== null && c.oldRating !== null && c.newRating > c.oldRating,
  ).length;
  const rated = contests.filter((c) => c.newRating !== null && c.oldRating !== null).length;
  const stats = [
    { label: "Contests", value: contests.length.toLocaleString("en-IN") },
    { label: "Best rank", value: best ? `#${best.toLocaleString("en-IN")}` : "—" },
    { label: "Solved per contest", value: avg !== null ? `${Math.round(avg * 100)}%` : "—" },
    { label: "Rating went up", value: rated ? `${ups} of ${rated}` : "—" },
  ];
  return (
    <Card className="flex-1 md:col-span-2 xl:col-span-1">
      <CardHeader>
        <CardTitle icon={icon(Medal)}>Your record</CardTitle>
        <CardSub>all platforms</CardSub>
      </CardHeader>
      <dl className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="surface-inset flex flex-col gap-1 rounded-[14px] px-3.5 py-3"
          >
            <dt className="text-12 text-ink-3">{s.label}</dt>
            <dd className="num font-display text-[22px] leading-none tracking-[-0.03em]">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

async function UpsolveAndHistory({ userId, contests }: { userId: string; contests: ContestRow[] }) {
  const recent = await getUpsolve(userId, contests);
  const todo = recent.flatMap((c) =>
    c.problems.filter((p) => p.status === "todo").map((p) => ({ ...p, contest: c })),
  );
  const count = (s: "contest" | "upsolved") =>
    recent.reduce((n, c) => n + c.problems.filter((p) => p.status === s).length, 0);
  const inContest = count("contest");
  const upsolved = count("upsolved");
  const total = inContest + upsolved + todo.length;
  const tried = todo.filter((p) => p.attempted).length;
  // Contests with something left first, newest first within each group.
  const ordered = [
    ...recent.filter((c) => c.problems.some((p) => p.status === "todo")),
    ...recent.filter((c) => !c.problems.some((p) => p.status === "todo")),
  ];
  // Tried-but-unsolved first: they're closest to done.
  const addKeys = [...todo]
    .sort((a, b) => Number(b.attempted) - Number(a.attempted))
    .slice(0, 12)
    .map((p) => `${p.contest.platform}:${p.externalId}`);

  return (
    <>
      <Card
        tier="hero"
        className="order-1 col-span-12 flex flex-col gap-6 p-6 lg:p-7 xl:col-span-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pill>
            Last {Math.min(UPSOLVE_CONTESTS, recent.length)} contest
            {recent.length === 1 ? "" : "s"}
          </Pill>
          <Legend />
        </div>
        <div>
          <p className="font-display text-[clamp(26px,2.6vw,36px)] leading-[1.08] text-balance">
            {recent.length === 0
              ? "Your recent contests show up here."
              : todo.length
                ? `${todo.length} problem${todo.length === 1 ? "" : "s"} left to upsolve.`
                : "Every recent contest problem is done."}
          </p>
          {total > 0 && (
            <p className="mt-2 text-[15px] text-ink-2">
              {inContest} solved in the contest · {upsolved} upsolved after
              {tried ? ` · ${tried} tried and not solved yet` : ""}
            </p>
          )}
        </div>
        {total > 0 && <SplitBar inContest={inContest} upsolved={upsolved} total={total} />}
        {todo.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            <AddUpsolveButton keys={addKeys} />
            <a
              href={todo[0]!.url}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary" })}
            >
              Open {todo[0]!.title} <ButtonArrow />
            </a>
          </div>
        )}
        {ordered.length > 0 && (
          <div className="flex flex-col">
            {ordered.slice(0, HERO_ROWS).map((c) => (
              <UpsolveRow key={`${c.platform}-${c.contestId}`} c={c} contests={contests} />
            ))}
            {ordered.length > HERO_ROWS && (
              <details className="group">
                <summary className="cursor-pointer list-none border-t border-line pt-3.5 text-13 font-[550] text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    Show {ordered.length - HERO_ROWS} more contests
                  </span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                {ordered.slice(HERO_ROWS).map((c) => (
                  <UpsolveRow key={`${c.platform}-${c.contestId}`} c={c} contests={contests} />
                ))}
              </details>
            )}
          </div>
        )}
      </Card>

      <Card className="order-3 col-span-12">
        <CardHeader>
          <CardTitle icon={icon(History)}>History</CardTitle>
          <CardSub>{contests.length} contests · newest first</CardSub>
        </CardHeader>
        <HistoryList contests={contests.slice(0, HISTORY_ROWS)} recent={recent} />
        {contests.length > HISTORY_ROWS && (
          <details className="group mt-2">
            <summary className="cursor-pointer list-none rounded-[12px] px-2 py-2 text-13 font-[550] text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">
                Show {Math.min(50, contests.length) - HISTORY_ROWS} older contests
              </span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <HistoryList contests={contests.slice(HISTORY_ROWS, 50)} recent={recent} />
          </details>
        )}
      </Card>
    </>
  );
}

function Legend() {
  return (
    <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-12 text-ink-3">
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-signal" /> in contest
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-[var(--sky)]" /> upsolved
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-line-3" /> left
      </span>
    </span>
  );
}

/** One bar split into solved-in-contest, upsolved and left. */
function SplitBar({
  inContest,
  upsolved,
  total,
}: {
  inContest: number;
  upsolved: number;
  total: number;
}) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      role="img"
      aria-label={`${inContest} of ${total} solved in the contest, ${upsolved} upsolved, ${total - inContest - upsolved} left`}
      className="flex h-3 gap-[3px] overflow-hidden rounded-full"
    >
      {inContest > 0 && (
        <span className="h-full rounded-full bg-signal" style={{ width: pct(inContest) }} />
      )}
      {upsolved > 0 && (
        <span className="h-full rounded-full bg-[var(--sky)]" style={{ width: pct(upsolved) }} />
      )}
      <span className="h-full flex-1 rounded-full bg-line-2" />
    </div>
  );
}

function UpsolveRow({ c, contests }: { c: ContestUpsolve; contests: ContestRow[] }) {
  const row = contests.find((x) => x.platform === c.platform && x.contestId === c.contestId);
  const delta =
    row && row.newRating !== null && row.oldRating !== null ? row.newRating - row.oldRating : null;
  const inContest = c.problems.filter((p) => p.status === "contest").length;
  return (
    <div className="flex flex-col gap-2.5 border-t border-line py-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="min-w-0 truncate font-[600]">{c.name}</span>
        <span className="text-12 text-ink-3">
          {inContest} of {c.problems.length} in contest · {fmtDate(c.at)}
        </span>
        {delta !== null && (
          <span
            className={cn(
              "tnum ml-auto text-12 font-[600]",
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
            data-dir-hover=""
            className={cn(
              "flex min-w-0 flex-col gap-0.5 rounded-[12px] px-3 py-2 transition-transform hover:-translate-y-0.5",
              p.status === "contest"
                ? "bg-[color-mix(in_srgb,var(--signal)_13%,transparent)]"
                : p.status === "upsolved"
                  ? "bg-[color-mix(in_srgb,var(--sky)_13%,transparent)]"
                  : "surface-inset",
            )}
          >
            <span aria-hidden="true" className="dir-tint" />
            <span
              className={cn(
                "text-[11px] font-[600]",
                p.status === "contest"
                  ? "text-signal-text"
                  : p.status === "upsolved"
                    ? "text-[var(--sky)]"
                    : "text-ink-3",
              )}
            >
              {label(p.externalId, c.platform, i)}
              {p.attempted && p.status === "todo" ? " · tried" : ""}
            </span>
            <span
              className={cn("truncate text-12", p.status === "todo" ? "text-ink" : "text-ink-2")}
            >
              {p.title}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function HistoryList({ contests, recent }: { contests: ContestRow[]; recent: ContestUpsolve[] }) {
  return (
    <ul className="grid gap-x-6 xl:grid-cols-2">
      {contests.map((c) => {
        const detail = recent.find((r) => r.platform === c.platform && r.contestId === c.contestId);
        return <ContestItem key={`${c.platform}-${c.contestId}`} c={c} detail={detail} />;
      })}
    </ul>
  );
}

function ContestItem({ c, detail }: { c: ContestRow; detail: ContestUpsolve | undefined }) {
  const delta = c.newRating !== null && c.oldRating !== null ? c.newRating - c.oldRating : null;
  const inContest = detail?.problems.filter((p) => p.status === "contest").length;
  const solved = c.solved ?? inContest ?? null;
  const total = c.total ?? (detail?.problems.length || null);
  return (
    <li className="rounded-[14px] px-2.5 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-[550]">{c.name}</span>
          <span className="tnum text-12 text-ink-3">
            {PLATFORM_LABEL[c.platform]} · {fmtDate(c.at)}
            {solved !== null && total ? ` · ${solved}/${total} in contest` : ""}
          </span>
        </span>
        {c.rank ? <Pill className="h-6">#{c.rank.toLocaleString("en-IN")}</Pill> : null}
        {delta !== null && (
          <Pill tone={delta >= 0 ? "mint" : "rose"} className="h-6">
            {delta >= 0 ? "+" : ""}
            {delta}
          </Pill>
        )}
      </div>
      {detail && detail.problems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detail.problems.map((p, i) => (
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
                tone={p.status === "contest" ? "ac" : p.status === "upsolved" ? "info" : "neutral"}
                className={cn(p.status === "todo" && !p.attempted && "opacity-70")}
              >
                {p.status !== "todo" && <Check size={10} aria-hidden="true" />}
                {label(p.externalId, c.platform, i)}
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

function NoContests() {
  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card
        tier="hero"
        className="col-span-12 flex flex-col items-center gap-8 p-6 md:flex-row lg:p-8"
      >
        <Podium />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
          <p className="font-display text-[clamp(26px,2.6vw,36px)] leading-[1.08] text-balance">
            No rated contests yet.
          </p>
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
            Connect Codeforces or LeetCode and take part in a contest. Your rating, every result and
            a list of the problems you didn&apos;t finish show up here, and you can put those on
            Today in one click.
          </p>
          <Link
            href="/dashboard/settings#platforms"
            className={buttonClasses({ variant: "signal" })}
          >
            Connect platforms <ButtonArrow />
          </Link>
        </div>
      </Card>
    </div>
  );
}

/** Pixel podium for the empty state (the logo's pixel motif). */
function Podium() {
  const cols = [
    { h: 3, lit: false },
    { h: 5, lit: true },
    { h: 2, lit: false },
  ];
  return (
    <span aria-hidden="true" className="flex items-end gap-2">
      {cols.map((c, i) => (
        <span key={i} className="flex flex-col-reverse gap-1">
          {Array.from({ length: c.h }, (_, k) => (
            <i
              key={k}
              className={cn(
                "block size-5 rounded-[5px]",
                c.lit
                  ? k === c.h - 1
                    ? "bg-signal shadow-[0_0_16px_var(--signal)]"
                    : "bg-[color-mix(in_srgb,var(--signal)_45%,transparent)]"
                  : "bg-line-3",
              )}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check, History, ListTodo, TrendingUp } from "lucide-react";
import type { Platform } from "@upsolve/adapters";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  DifficultyTag,
  Stat,
  Tag,
  buttonClasses,
  cn,
} from "@upsolve/ui";
import { PLATFORM_LABEL, PLATFORM_STROKE } from "@/components/platform-meta";
import { RatingChart } from "@/components/rating-chart";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
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
    <div className="flex flex-col gap-5">
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Contests<span className="block text-ink-3">Ratings and what&apos;s left to upsolve</span>
      </h1>
      <Suspense fallback={<div className="h-[500px] animate-pulse rounded-lg bg-surface" />}>
        <ContestsContent />
      </Suspense>
    </div>
  );
}

async function ContestsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your contests.</p>;
  const contests = await getContests(user.id);

  if (contests.length === 0) {
    return (
      <Card className="flex flex-wrap items-center gap-4">
        <p className="min-w-0 flex-1 text-[15px] leading-relaxed">
          <span className="text-ink-3">No rated contests yet.</span> Connect Codeforces or LeetCode
          and take part in a contest: your rating, every result and an upsolve list of the problems
          you didn&apos;t finish show up here.
        </p>
        <Link href="/dashboard/settings" className={buttonClasses({ variant: "signal" })}>
          Connect platforms <ButtonArrow />
        </Link>
      </Card>
    );
  }

  const platforms = [...new Set(contests.map((c) => c.platform))];
  return (
    <div className="grid grid-cols-12 gap-3.5">
      {platforms.map((p) => (
        <RatingCard
          key={p}
          platform={p}
          contests={contests.filter((c) => c.platform === p)}
          wide={platforms.length === 1}
        />
      ))}
      <Suspense
        fallback={<div className="col-span-12 h-[360px] animate-pulse rounded-lg bg-surface" />}
      >
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
    <Card className={cn("col-span-12", !wide && "xl:col-span-6")}>
      <CardHeader>
        <CardTitle icon={icon(TrendingUp)}>{PLATFORM_LABEL[platform]}</CardTitle>
        <CardSub>{contests.length} contests</CardSub>
      </CardHeader>
      <div className="mb-3 flex flex-wrap items-end gap-x-8 gap-y-2">
        <Stat value={last?.newRating ?? "—"} unit="rating" />
        <div className="pb-2 font-mono text-[12px] text-ink-3">
          peak <span className="text-ink">{Number.isFinite(peak) ? peak : "—"}</span>
          {delta !== null && (
            <>
              {" · last "}
              <span className={delta >= 0 ? "text-ok" : "text-bad"}>
                {delta >= 0 ? "+" : ""}
                {delta}
              </span>
            </>
          )}
        </div>
      </div>
      {rated.length > 1 ? (
        <RatingChart
          stroke={PLATFORM_STROKE[platform] ?? "var(--primary)"}
          points={rated.map((c) => ({ at: c.at.getTime(), rating: c.newRating!, name: c.name }))}
        />
      ) : (
        <p className="text-[13px] text-ink-2">The chart appears after your second contest.</p>
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
          <CardTitle icon={icon(ListTodo)}>Upsolve next</CardTitle>
          <CardSub>
            {todo.length} left · {upsolved} upsolved
          </CardSub>
        </CardHeader>
        {todo.length === 0 ? (
          <p className="text-[13.5px] text-ink-2">
            Nothing left from your last {Math.min(UPSOLVE_CONTESTS, recent.length)} contests.
          </p>
        ) : (
          <ul>
            {/* Attempted first (closest to solved), then by contest order. */}
            {todo
              .sort((a, b) => Number(b.attempted) - Number(a.attempted))
              .slice(0, 12)
              .map((p) => (
                <li
                  key={`${p.contest.contestId}-${p.externalId}`}
                  className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0 flex-1">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[13.5px] font-medium hover:underline"
                    >
                      {p.title}
                    </a>
                    <span className="block truncate font-mono text-[11px] text-ink-3">
                      {p.contest.name}
                      {p.attempted ? " · attempted" : ""}
                    </span>
                  </span>
                  {p.difficulty && <DifficultyTag difficulty={p.difficulty} />}
                </li>
              ))}
          </ul>
        )}
        <p className="mt-3 border-t border-dashed border-line-2 pt-3 text-[12px] leading-relaxed text-ink-3">
          Problems from your last {UPSOLVE_CONTESTS} contests you haven&apos;t solved yet. Solve one
          and it ticks here, and joins your revision queue.
        </p>
      </Card>

      <Card className="col-span-12 xl:col-span-7">
        <CardHeader>
          <CardTitle icon={icon(History)}>History</CardTitle>
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
    <li className="border-t border-dashed border-line-2 py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
          <span className="font-mono text-[11px] text-ink-3">
            {PLATFORM_LABEL[c.platform]} · {fmtDate(c.at)}
            {c.rank ? ` · rank ${c.rank.toLocaleString("en-IN")}` : ""}
            {solved !== null && total ? ` · ${solved}/${total} in contest` : ""}
          </span>
        </span>
        {delta !== null && (
          <span className={cn("num text-[15px]", delta >= 0 ? "text-ok" : "text-bad")}>
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
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

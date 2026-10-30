import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock, ExternalLink, Video } from "lucide-react";
import { Card, LinearProgress, ProgressRing, Skeleton, SkeletonCard } from "@upsolve/ui";
import { NumberTicker } from "@/components/fx/number-ticker";
import { PageHeader } from "@/components/page-header";
import { formatEta } from "@/components/progress";
import { SheetBrowser, type ItemReview } from "@/components/sheet-browser";
import { SheetCover, sheetIdentity } from "@/components/sheet-identity";
import { StartStudyButton } from "@/components/daily/study-bar";
import { FollowButton } from "@/components/sheets";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getActiveFocus } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { getLearning } from "@/lib/learning";
import { getSheetKeysOnToday } from "@/lib/plan";
import { getSheetDetail } from "@/lib/sheets-data";
import { localDay, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Sheet" };

const TIER_COLOR: Record<string, string> = {
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
  basic: "var(--easy)",
  core: "var(--medium)",
  pro: "var(--hard)",
};

export default function SheetPage({ params }: PageProps<"/dashboard/sheets/[slug]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/sheets"
        className="group/back inline-flex items-center gap-1.5 self-start text-13 text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft
          size={14}
          aria-hidden="true"
          className="transition-transform duration-[var(--dur-base)] group-hover/back:-translate-x-0.5"
        />{" "}
        All sheets
      </Link>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-80" />
            <SkeletonCard lines={3} className="h-[200px]" />
            <SkeletonCard lines={8} className="h-[480px]" />
          </div>
        }
      >
        <SheetContent params={params} />
      </Suspense>
    </div>
  );
}

async function SheetContent({
  params,
}: {
  params: PageProps<"/dashboard/sheets/[slug]">["params"];
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to track sheets.</p>;
  const [sheet, learning, profile, active] = await Promise.all([
    getSheetDetail(user.id, slug),
    getLearning(user.id),
    getProfile(user.id),
    getActiveFocus(user.id),
  ]);
  if (!sheet) notFound();
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const onToday = await getSheetKeysOnToday(user.id, sheet.id, tz, requestNow());

  // Revision state of every solved problem, so rows can say "revise".
  const { end: endOfToday } = localDay(tz, requestNow());
  const reviews: Record<string, ItemReview> = {};
  for (const p of learning) {
    reviews[p.problemId] = {
      due: !p.state.retired && p.state.dueAt <= endOfToday,
      step: p.state.step,
    };
  }
  const tiers = ["easy", "medium", "hard", "basic", "core", "pro"]
    .map((t) => {
      const all = sheet.items.filter((i) => i.tier === t);
      return { tier: t, total: all.length, done: all.filter((i) => i.status).length };
    })
    .filter((t) => t.total > 0);
  const minutesLeft = sheet.items
    .filter((i) => !i.status)
    .reduce((n, i) => n + (i.minutes ?? 0), 0);
  const videos = sheet.items.filter((i) => i.links.some((l) => l.site === "youtube")).length;
  const { color } = sheetIdentity(sheet.slug, sheet.name);
  const pct = Math.round((sheet.done / Math.max(1, sheet.total)) * 100);
  const [base, rest] = sheet.name.includes("'s")
    ? [
        sheet.name.slice(0, sheet.name.indexOf("'s") + 2),
        sheet.name.slice(sheet.name.indexOf("'s") + 2),
      ]
    : [sheet.name, ""];

  return (
    <>
      <PageHeader
        eyebrow="Sheet"
        glow={color}
        title={
          rest ? (
            <>
              {base} <em>{rest.trim()}</em>
            </>
          ) : (
            <em>{base}</em>
          )
        }
        subtitle={
          sheet.author ? (
            <a
              href={sheet.sourceUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              by {sheet.author} · full sheet with explanations on their site{" "}
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          ) : undefined
        }
        actions={
          <>
            <StartStudyButton label={sheet.name} active={active} />
            <FollowButton sheetId={sheet.id} following={sheet.following} />
          </>
        }
      />

      <Card
        glow={color}
        className="grid items-center gap-6 overflow-hidden md:grid-cols-[auto_1fr_auto]"
      >
        <ProgressRing
          total={Math.max(1, sheet.total)}
          size={148}
          stroke={12}
          segments={[{ label: "Done", value: sheet.done, color }]}
          aria-label={`${sheet.done} of ${sheet.total} done`}
        >
          <span className="num text-36">
            <NumberTicker value={pct} />
            <span className="text-[.55em] text-ink-3">%</span>
          </span>
          <span className="tnum text-11 text-ink-3">
            {sheet.done} / {sheet.total}
          </span>
        </ProgressRing>
        <div className="flex min-w-0 flex-col gap-3">
          {tiers.map((t) => (
            <div key={t.tier} className="grid grid-cols-[64px_1fr_64px] items-center gap-3">
              <span className="text-13 font-[550] capitalize">{t.tier}</span>
              <LinearProgress
                value={t.done}
                max={t.total}
                height={7}
                color={TIER_COLOR[t.tier]}
                aria-label={`${t.tier} ${t.done} of ${t.total}`}
              />
              <span className="tnum text-right font-mono text-12 text-ink-3">
                {t.done}/{t.total}
              </span>
            </div>
          ))}
          <p className="text-12 text-ink-3">
            {sheet.autoTracked} tick automatically · the rest you tick yourself
            {sheet.eta ? ` · est. ${formatEta(sheet.eta)}` : ""}
          </p>
        </div>
        <div className="flex gap-3 md:flex-col">
          {minutesLeft > 0 && (
            <div className="surface-inset rounded-[14px] px-4 py-3">
              <p className="flex items-center gap-1.5 label-mono">
                <Clock size={11} aria-hidden="true" /> Left
              </p>
              <p className="num mt-1 text-24">
                ~{Math.round(minutesLeft / 60)}
                <small className="ml-1 font-display text-[.55em] font-normal text-ink-3 italic">
                  hours
                </small>
              </p>
            </div>
          )}
          {videos > 0 && (
            <div className="surface-inset rounded-[14px] px-4 py-3">
              <p className="flex items-center gap-1.5 label-mono">
                <Video size={11} aria-hidden="true" /> Videos
              </p>
              <p className="num mt-1 text-24">{videos}</p>
            </div>
          )}
        </div>
        <SheetCover
          slug={sheet.slug}
          name={sheet.name}
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-1/3 opacity-40 md:block [&>span]:hidden"
        />
      </Card>

      <SheetBrowser sheetId={sheet.id} items={sheet.items} reviews={reviews} onToday={onToday} />
    </>
  );
}

// DsaKaro

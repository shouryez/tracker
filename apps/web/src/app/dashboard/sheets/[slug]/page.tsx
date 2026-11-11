import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties, ViewTransition } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Pill, Skeleton, SkeletonCard, cn } from "@upsolve/ui";
import { Rekha } from "@/components/dashboard/lamplight";
import { formatEta } from "@/components/progress";
import { SheetBrowser, type ItemReview } from "@/components/sheet-browser";
import { SheetMapCard, SheetProgressStrip } from "@/components/sheet-progress";
import { BookCover } from "@/components/sheet-identity";
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
  const minutesLeft = sheet.items
    .filter((i) => !i.status)
    .reduce((n, i) => n + (i.minutes ?? 0), 0);
  const videos = sheet.items.filter((i) => i.links.some((l) => l.site === "youtube")).length;
  // Steps in order, with how much of each is done; the current one is the furthest you've worked in.
  const steps: { name: string; done: number; total: number }[] = [];
  for (const it of sheet.items) {
    let st = steps.find((x) => x.name === it.step);
    if (!st) steps.push((st = { name: it.step, done: 0, total: 0 }));
    st.total++;
    if (it.status) st.done++;
  }
  const currentStep = steps.reduce((at, st, i) => (st.done > 0 ? i : at), steps.length ? 0 : -1);
  const pct = Math.round((sheet.done / Math.max(1, sheet.total)) * 100);

  return (
    <>
      <header
        id="sheet-head"
        className="surface-card flex flex-wrap items-center gap-6 rounded-[24px] p-6"
      >
        <div className="w-[96px] shrink-0">
          <ViewTransition name={`cover-${sheet.slug}`} share="morph" default="none">
            <BookCover
              slug={sheet.slug}
              name={sheet.name}
              author={sheet.author}
              done={sheet.done}
              total={sheet.total}
            />
          </ViewTransition>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          <span className="flex flex-wrap gap-1.5">
            <Pill tone={sheet.following ? "mint" : "neutral"}>
              {sheet.following ? "Following" : "Sheet"}
            </Pill>
            <Pill>{steps.length} steps</Pill>
            <Pill>{pct}% done</Pill>
          </span>
          <h1 className="font-display text-[clamp(30px,3.2vw,44px)] leading-[1.02] text-balance">
            {sheet.name}
          </h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-13 text-ink-2">
            <span>
              <b className="tnum font-[650] text-ink">{sheet.done}</b> / {sheet.total} solved
            </span>
            {currentStep >= 0 && (
              <span>
                on step {currentStep + 1} of {steps.length}
              </span>
            )}
            {sheet.eta && <span>finish by {formatEta(sheet.eta)} at this pace</span>}
            {minutesLeft > 0 && <span>~{Math.round(minutesLeft / 60)} hours left</span>}
            {videos > 0 && <span>{videos} videos</span>}
          </p>
          <span
            data-sheet-progress=""
            className="block max-w-[520px]"
            style={{ "--fly-x": pct / 100 } as CSSProperties}
          >
            <Rekha value={pct / 100} />
          </span>
          {sheet.author && (
            <a
              href={sheet.sourceUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-12 text-ink-3 hover:text-ink"
            >
              by {sheet.author} · full sheet on their site{" "}
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FollowButton sheetId={sheet.id} following={sheet.following} />
          <StartStudyButton label={sheet.name} active={active} />
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <nav
          aria-label="Steps"
          className="surface-card flex-[1_1_260px] rounded-[24px] px-3.5 py-[18px] lg:sticky lg:top-8 lg:max-w-[340px]"
        >
          <span className="block px-2 pb-2.5 text-13 font-[600] text-ink-2">Route</span>
          <ol>
            {steps.map((st, i) => {
              const full = st.total > 0 && st.done === st.total;
              const any = st.done > 0;
              const cur = i === currentStep;
              return (
                <li key={st.name}>
                  <a
                    href={`#step-${i + 1}`}
                    className={cn(
                      "grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]",
                      cur && "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]",
                    )}
                  >
                    <span className="flex h-11 flex-col items-center">
                      <span
                        className="w-0.5 flex-1"
                        style={{
                          background:
                            i === 0
                              ? "transparent"
                              : i <= currentStep
                                ? "var(--signal)"
                                : "var(--line-2)",
                        }}
                      />
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{
                          background: full
                            ? "var(--signal)"
                            : any
                              ? "var(--surface)"
                              : "var(--surface-4)",
                          boxShadow: full
                            ? "0 0 0 3px var(--color-signal-soft)"
                            : any
                              ? `inset 0 0 0 2px var(--signal)${cur ? ", 0 0 0 5px var(--color-signal-soft)" : ""}`
                              : undefined,
                        }}
                      />
                      <span
                        className="w-0.5 flex-1"
                        style={{
                          background:
                            i === steps.length - 1
                              ? "transparent"
                              : i < currentStep
                                ? "var(--signal)"
                                : "var(--line-2)",
                        }}
                      />
                    </span>
                    <span
                      className={cn(
                        "truncate text-[13.5px]",
                        cur ? "font-[600] text-ink" : any ? "text-ink" : "text-ink-2",
                      )}
                    >
                      <span className="tnum mr-2 text-11 text-ink-3">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {st.name.replace(/^Step\s*\d+\s*[:·.-]?\s*/i, "")}
                    </span>
                    <span className={cn("tnum text-11", full ? "text-signal-text" : "text-ink-3")}>
                      {st.done}/{st.total}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          <SheetMapCard steps={steps} />
          <SheetBrowser
            sheetId={sheet.id}
            items={sheet.items}
            reviews={reviews}
            onToday={onToday}
          />
        </div>
      </div>
      <SheetProgressStrip steps={steps} headId="sheet-head" />
    </>
  );
}

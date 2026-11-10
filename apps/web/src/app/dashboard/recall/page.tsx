import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, SkeletonCard } from "@upsolve/ui";
import { RecallQuiz } from "@/components/daily/recall-quiz";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getRecallDeck, getRecallStats } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { localDate, requestNow } from "@/lib/time";
import { REVISION_TABS, SectionTabs } from "@/components/orbit/section-tabs";

export const metadata: Metadata = { title: "Recall" };

export default function RecallPage({ searchParams }: PageProps<"/dashboard/recall">) {
  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
      <Suspense fallback={<SkeletonCard lines={6} className="h-[420px]" />}>
        <RecallContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecallContent({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/recall">["searchParams"];
}) {
  const raw = (await searchParams).round;
  const round = Math.min(50, Math.max(0, Number(typeof raw === "string" ? raw : 0) || 0));
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to take the quiz.</p>;
  const profile = await getProfile(user.id);
  const day = localDate(profile?.timezone ?? "Asia/Kolkata", requestNow());
  const [cards, stats] = await Promise.all([
    getRecallDeck(user.id, day, round),
    getRecallStats(user.id),
  ]);

  return (
    <>
      <SectionTabs tabs={REVISION_TABS} />
      <PageHeader
        eyebrow="Recall · 2 minutes"
        glow={PAGE_GLOW.revision}
        title={
          <>
            Name the pattern <em>· round {round + 1}</em>
          </>
        }
        subtitle="Problems you've solved. Pick the idea that cracks each one."
        actions={
          stats.answered > 0 && (
            <div className="flex gap-5">
              <div className="text-right">
                <p className="num text-[22px]">
                  {Math.round((stats.correct / stats.answered) * 100)}
                  <small className="text-[.55em] text-ink-3">%</small>
                </p>
                <p className="text-12 text-ink-3">right this week</p>
              </div>
              <div className="text-right">
                <p className="num text-[22px]">
                  {stats.streakDays}
                  <small className="ml-0.5 text-[.55em] text-ink-3">days</small>
                </p>
                <p className="text-12 text-ink-3">in a row</p>
              </div>
            </div>
          )
        }
      />
      {/* The deck: two cards peek out behind the one you're answering. */}
      <div className="relative pt-3.5">
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-0 h-16 rounded-[16px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-5 top-[7px] h-16 rounded-[16px] bg-surface-3 shadow-[inset_0_0_0_1px_var(--line)]"
        />
        <Card className="lamp relative p-6 sm:p-7">
          <RecallQuiz key={`${day}-${round}`} cards={cards} round={round} />
        </Card>
      </div>
    </>
  );
}

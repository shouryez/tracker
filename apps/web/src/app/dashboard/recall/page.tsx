import type { Metadata } from "next";
import { Suspense } from "react";
import { Zap } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard } from "@upsolve/ui";
import { RecallQuiz } from "@/components/daily/recall-quiz";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getRecallDeck, getRecallStats } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { localDate, requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Recall" };

export default function RecallPage({ searchParams }: PageProps<"/dashboard/recall">) {
  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6">
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
      <PageHeader
        eyebrow="Recall · 2 minutes"
        glow={PAGE_GLOW.revision}
        title={
          <>
            Recall, <em>five quick cards.</em>
          </>
        }
        subtitle={
          stats.answered > 0 ? (
            <>
              <span>{Math.round((stats.correct / stats.answered) * 100)}% right this week</span>
              <Dot />
              <span>{stats.answered} answered</span>
              <Dot />
              <span>{stats.streakDays} days</span>
            </>
          ) : (
            "Name the pattern for problems you've solved. Remembering beats re-reading."
          )
        }
      />
      <Card glow="var(--violet)">
        <CardHeader>
          <CardTitle icon={<Zap size={14} />} tint="var(--violet)">
            Round {round + 1}
          </CardTitle>
          <CardSub>from your solved problems</CardSub>
        </CardHeader>
        <RecallQuiz key={`${day}-${round}`} cards={cards} round={round} />
      </Card>
    </>
  );
}

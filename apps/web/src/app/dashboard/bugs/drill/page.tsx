import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard } from "@upsolve/ui";
import { SpotYourBug } from "@/components/spot-your-bug";
import { PageHeader } from "@/components/page-header";
import { aiEnabled } from "@/lib/ai";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { drillSourceCount, getDrillStats, getOpenDrill } from "@/lib/drills";

export const metadata: Metadata = { title: "Spot your bug" };

export default function DrillPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<SkeletonCard lines={8} className="h-[420px]" />}>
        <DrillContent />
      </Suspense>
    </div>
  );
}

async function DrillContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to drill your own bugs.</p>;
  const [open, sources, stats] = await Promise.all([
    getOpenDrill(user.id),
    drillSourceCount(user.id),
    getDrillStats(user.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/bugs"
        className="inline-flex w-fit items-center gap-1.5 text-13 text-ink-3 hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Bug profile
      </Link>
      <PageHeader
        eyebrow="Spot your bug"
        title={
          <>
            Your code, <em>your</em> bug
          </>
        }
        subtitle="One of your accepted solutions with one line broken, the way you usually break code. Bugs you miss come back more often; ones you catch quickly fade."
      />
      <Card className="mx-auto w-full max-w-[760px] p-[18px] sm:p-[22px]">
        <CardHeader>
          <CardTitle>Find the broken line</CardTitle>
          <CardSub className="font-mono">
            {stats.total
              ? `caught ${stats.caught} of ${stats.total}${stats.medianMs ? ` · usually ${Math.round(stats.medianMs / 1000)} s` : ""}`
              : "90 seconds"}
          </CardSub>
        </CardHeader>
        {!aiEnabled() ? (
          <p className="text-13 text-ink-2">Spot your bug is switching on soon.</p>
        ) : sources === 0 && !open ? (
          <p className="text-13 text-ink-2">
            Drills are made from your own accepted LeetCode solutions. Solve one with the extension
            on (version 0.1.8 or later) and come back.
          </p>
        ) : (
          <SpotYourBug initial={open} />
        )}
      </Card>
    </div>
  );
}

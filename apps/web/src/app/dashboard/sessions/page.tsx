import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ButtonArrow,
  Card,
  CardHeader,
  CardSub,
  CardTitle,
  Stat,
  buttonClasses,
} from "@upsolve/ui";
import { HonestSplit, SessionItem } from "@/components/sessions";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { formatDuration, getSessionStats, getSessions } from "@/lib/sessions-data";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Sessions<span className="block text-ink-3">Every timed attempt</span>
      </h1>
      <Suspense fallback={<div className="h-96 skeleton rounded-lg" />}>
        <SessionsContent />
      </Suspense>
    </div>
  );
}

async function SessionsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your sessions.</p>;

  const [stats, sessions] = await Promise.all([
    getSessionStats(user.id),
    getSessions(user.id, 100),
  ]);
  const { solo, hint, solution } = stats.honest;

  if (stats.totalSessions === 0) {
    return (
      <Card className="flex flex-wrap items-center gap-4">
        <p className="min-w-0 flex-1 text-[15px]">
          <span className="text-ink-3">No sessions yet.</span> Open any LeetCode or GFG problem with
          the extension connected and the timer starts on its own.
        </p>
        <Link href="/extension/connect" className={buttonClasses({ variant: "signal" })}>
          Set up the extension <ButtonArrow />
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card className="col-span-12 sm:col-span-4">
        <CardSub>SESSIONS</CardSub>
        <Stat
          value={stats.totalSessions}
          unit={`${stats.solvedSessions} solved`}
          className="mt-2"
        />
      </Card>
      <Card className="col-span-12 sm:col-span-4">
        <CardSub>FOCUS THIS WEEK</CardSub>
        <Stat value={formatDuration(stats.focusWeekMs)} className="mt-2" />
      </Card>
      <Card className="col-span-12 sm:col-span-4">
        <CardSub>HOW YOU SOLVED</CardSub>
        <HonestSplit solo={solo} hint={hint} solution={solution} className="mt-3" />
      </Card>

      <Card className="col-span-12">
        <CardHeader>
          <CardTitle>Latest {sessions.length}</CardTitle>
          <CardSub>newest first</CardSub>
        </CardHeader>
        <ul>
          {sessions.map((s) => (
            <SessionItem key={s.id} s={s} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

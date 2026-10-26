import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { ButtonArrow, Card, CardSub, buttonClasses } from "@upsolve/ui";
import { formatEta, SegmentedProgress } from "@/components/progress";
import { FollowButton } from "@/components/sheets";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getSheetSummaries } from "@/lib/sheets-data";
import { getExtensionTokens } from "@/lib/sessions-data";

export const metadata: Metadata = { title: "Sheets" };

export default function SheetsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Sheets<span className="block text-ink-3">Ticked for you as you solve</span>
      </h1>
      <Suspense fallback={<div className="h-96 skeleton rounded-lg" />}>
        <SheetsContent />
      </Suspense>
    </div>
  );
}

async function SheetsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to track sheets.</p>;
  const [sheets, tokens] = await Promise.all([
    getSheetSummaries(user.id),
    getExtensionTokens(user.id),
  ]);
  const followingAny = sheets.some((s) => s.following);

  return (
    <>
      {!followingAny && (
        <p className="text-[13.5px] text-ink-2">
          Follow the sheets you&apos;re working through and their progress shows on your dashboard.
        </p>
      )}
      {tokens.length === 0 && (
        <p className="rounded-md border border-dashed border-line-2 bg-surface p-3.5 text-[13px] text-ink-2">
          Ticks come from problems we&apos;ve seen you solve. Without the extension we only see your
          last 20 LeetCode solves.{" "}
          <Link href="/extension/connect" className="text-ink underline underline-offset-4">
            Set up the extension
          </Link>{" "}
          to import your full history.
        </p>
      )}
      <div className="grid gap-3.5 md:grid-cols-2">
        {sheets.map((s) => (
          <Card key={s.id} interactive spotlight className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/sheets/${s.slug}`}
                  className="block text-[17px] font-[550] tracking-[-0.02em] hover:underline"
                >
                  {s.name}
                </Link>
                <a
                  href={s.sourceUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-3 hover:text-ink"
                >
                  by {s.author} <ExternalLink size={10} aria-hidden="true" />
                </a>
              </div>
              <FollowButton sheetId={s.id} following={s.following} />
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="num text-[28px]">
                  {s.done}
                  <small className="ml-1 text-[.45em] font-normal text-ink-3">/ {s.total}</small>
                </span>
                <CardSub>{Math.round((s.done / Math.max(1, s.total)) * 100)}%</CardSub>
              </div>
              <SegmentedProgress done={s.done} total={s.total} />
              <p className="mt-2 font-mono text-[11px] text-ink-3">
                {s.autoTracked} of {s.total} tick automatically
                {s.eta ? ` · est. ${formatEta(s.eta)} at your pace` : ""}
              </p>
            </div>
            <Link
              href={`/dashboard/sheets/${s.slug}`}
              className={buttonClasses({ variant: "ghost", size: "sm", className: "self-start" })}
            >
              Open sheet <ButtonArrow />
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}

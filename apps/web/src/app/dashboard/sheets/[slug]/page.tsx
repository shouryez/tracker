import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardSub } from "@upsolve/ui";
import { formatEta, SegmentedProgress } from "@/components/progress";
import { SheetBrowser } from "@/components/sheet-browser";
import { FollowButton } from "@/components/sheets";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getSheetDetail } from "@/lib/sheets-data";

export const metadata: Metadata = { title: "Sheet" };

export default function SheetPage({ params }: PageProps<"/dashboard/sheets/[slug]">) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/sheets"
        className="inline-flex items-center gap-1.5 self-start font-mono text-[11.5px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft size={13} aria-hidden="true" /> All sheets
      </Link>
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-lg bg-surface" />}>
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
  const sheet = await getSheetDetail(user.id, slug);
  if (!sheet) notFound();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
            {sheet.name}
          </h1>
          <a
            href={sheet.sourceUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11.5px] text-ink-3 hover:text-ink"
          >
            by {sheet.author}. Full sheet with explanations on their site{" "}
            <ExternalLink size={10} aria-hidden="true" />
          </a>
        </div>
        <FollowButton sheetId={sheet.id} following={sheet.following} />
      </div>

      <Card>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="num text-[36px]">
            {sheet.done}
            <small className="ml-1 text-[.42em] font-normal text-ink-3">/ {sheet.total} done</small>
          </span>
          <CardSub>
            {sheet.autoTracked} tick automatically · the rest you tick yourself
            {sheet.eta ? ` · est. ${formatEta(sheet.eta)}` : ""}
          </CardSub>
        </div>
        <SegmentedProgress done={sheet.done} total={sheet.total} segments={40} />
      </Card>

      <SheetBrowser sheetId={sheet.id} items={sheet.items} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardSub, DifficultyTag, Tag } from "@upsolve/ui";
import { formatEta, SegmentedProgress } from "@/components/progress";
import { FollowButton, ItemTick } from "@/components/sheets";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getSheetDetail, type SheetItemView } from "@/lib/sheets-data";

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

  // Group items by step, keeping source order.
  const steps: { name: string; items: SheetItemView[] }[] = [];
  for (const item of sheet.items) {
    const last = steps.at(-1);
    if (last?.name === item.step) last.items.push(item);
    else steps.push({ name: item.step, items: [item] });
  }
  const firstOpen = steps.findIndex((s) => s.items.some((i) => !i.status));

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

      <div className="flex flex-col gap-2.5">
        {steps.map((step, index) => {
          const done = step.items.filter((i) => i.status).length;
          return (
            <details
              key={step.name}
              open={index === firstOpen}
              className="group rounded-lg border border-line bg-surface shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-[18px] py-3.5 [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  size={15}
                  aria-hidden="true"
                  className="shrink-0 text-ink-3 transition-transform duration-[240ms] group-open:rotate-90"
                />
                <span className="min-w-0 flex-1 truncate text-[14px] font-[550]">{step.name}</span>
                <SegmentedProgress
                  done={done}
                  total={step.items.length}
                  segments={12}
                  className="hidden w-32 sm:grid"
                />
                <span className="w-14 text-right font-mono text-[11.5px] text-ink-3">
                  {done}/{step.items.length}
                </span>
              </summary>
              <ul className="border-t border-line px-[18px] pb-2">
                {step.items.map((item, i) => {
                  const showSection = item.section && item.section !== step.items[i - 1]?.section;
                  return (
                    <li key={item.itemKey}>
                      {showSection && (
                        <p className="pt-4 pb-1 font-mono text-[10.5px] tracking-[.08em] text-ink-3 uppercase">
                          {item.section}
                        </p>
                      )}
                      <div className="flex items-center gap-3 border-t border-dashed border-line-2 py-2.5 first:border-t-0">
                        <ItemTick
                          sheetId={sheet.id}
                          itemKey={item.itemKey}
                          status={item.status}
                          title={item.title}
                        />
                        <a
                          href={item.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={`min-w-0 flex-1 truncate text-[13.5px] hover:underline ${item.status ? "text-ink-3" : ""}`}
                        >
                          {item.title}
                        </a>
                        {item.kind === "learning" && <Tag mono>read</Tag>}
                        {!item.tracked && item.kind === "practice" && <Tag mono>manual</Tag>}
                        <TierTag tier={item.tier} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </>
  );
}

function TierTag({ tier }: { tier: string | null }) {
  if (tier === "easy" || tier === "medium" || tier === "hard")
    return <DifficultyTag difficulty={tier} />;
  return tier ? <Tag mono>{tier}</Tag> : null;
}

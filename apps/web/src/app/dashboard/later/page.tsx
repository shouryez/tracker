import type { Metadata } from "next";
import { Suspense } from "react";
import { BookmarkPlus } from "lucide-react";
import { TOPICS } from "@upsolve/core";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard } from "@upsolve/ui";
import { LaterList } from "@/components/daily/later-list";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getSavedItems } from "@/lib/daily-data";

export const metadata: Metadata = { title: "Saved for later" };

const TOPIC_LIST = TOPICS.map((t) => ({ id: t.id, label: t.label }));

export default function LaterPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<SkeletonCard lines={8} className="h-[480px]" />}>
        <LaterContent />
      </Suspense>
    </div>
  );
}

async function LaterContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to save things for later.</p>;
  const items = await getSavedItems(user.id);
  const open = items.filter((i) => !i.done);

  return (
    <>
      <PageHeader
        eyebrow="Saved for later"
        glow={PAGE_GLOW.sheets}
        title={
          <>
            Later, <em>but not never.</em>
          </>
        }
        subtitle={
          <>
            <span>{open.length} to get through</span>
            <Dot />
            <span>{open.filter((i) => i.kind === "video").length} videos</span>
            <Dot />
            <span>{items.length - open.length} done</span>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle icon={<BookmarkPlus size={14} />} tint="var(--primary)">
            Your list
          </CardTitle>
          <CardSub>save from any site with the extension</CardSub>
        </CardHeader>
        <LaterList items={items} topics={TOPIC_LIST} />
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { TOPICS } from "@upsolve/core";
import { SkeletonCard } from "@upsolve/ui";
import { MistakeJournal, NotebookView } from "@/components/daily/notebook";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getNotebook } from "@/lib/daily-data";
import { LIBRARY_TABS, SectionTabs } from "@/components/orbit/section-tabs";

export const metadata: Metadata = { title: "Notebook" };

const TOPIC_LIST = TOPICS.map((t) => ({ id: t.id, label: t.label }));

export default function NotebookPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<SkeletonCard lines={10} className="h-[520px]" />}>
        <NotebookContent />
      </Suspense>
    </div>
  );
}

async function NotebookContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your notebook.</p>;
  const { entries, mistakes, verdicts } = await getNotebook(user.id);
  const withTakeaway = entries.filter((e) => e.takeaway).length;

  return (
    <>
      <SectionTabs tabs={LIBRARY_TABS} />
      <PageHeader
        eyebrow="Notebook · built from your wrap-ups"
        glow={PAGE_GLOW.analytics}
        title={
          <>
            Notebook <em>· your own cheat sheet</em>
          </>
        }
        subtitle={
          <>
            <span>{entries.length} problems</span>
            <Dot />
            <span>{withTakeaway} takeaways</span>
            <Dot />
            <span>{mistakes.length} repeated mistakes</span>
          </>
        }
      />
      <Tabs
        items={[
          {
            id: "notebook",
            label: "Patterns",
            count: entries.length,
            content: <NotebookView entries={entries} topics={TOPIC_LIST} />,
          },
          {
            id: "mistakes",
            label: "Mistake journal",
            count: mistakes.length,
            content: <MistakeJournal mistakes={mistakes} verdicts={verdicts} topics={TOPIC_LIST} />,
          },
        ]}
      />
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { TOPICS } from "@upsolve/core";
import { Card, CardHeader, CardTitle, LogoMark, SkeletonCard } from "@upsolve/ui";
import { LaterList } from "@/components/daily/later-list";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getSavedItems } from "@/lib/daily-data";
import { LIBRARY_TABS, SectionTabs } from "@/components/orbit/section-tabs";

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
  const byTopic = [
    ...open
      .reduce((m, i) => {
        const l = TOPIC_LIST.find((t) => t.id === i.topic)?.label ?? "No topic";
        return m.set(l, (m.get(l) ?? 0) + 1);
      }, new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <SectionTabs tabs={LIBRARY_TABS} />
      <PageHeader
        eyebrow="Saved for later"
        title={
          <>
            Saved for later <em>· {open.length}</em>
          </>
        }
        subtitle="Problems, videos and articles you parked from any site with the extension. The oldest float up on Today."
      />
      <div className="flex flex-wrap items-start gap-4">
        <Card className="min-w-0 flex-[2_1_560px]">
          <LaterList items={items} topics={TOPIC_LIST} />
        </Card>
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Save from any tab</CardTitle>
            </CardHeader>
            <div
              aria-hidden="true"
              className="surface-inset flex flex-col gap-2.5 rounded-[18px] p-3.5"
            >
              <span className="flex items-center gap-2">
                <LogoMark size={18} />
                <span className="text-[12.5px] font-[600]">DsaKaro</span>
                <span className="ml-auto text-12 text-ink-3">youtube.com</span>
              </span>
              <span className="h-16 rounded-[12px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ink)_10%,transparent),color-mix(in_srgb,var(--ink)_3%,transparent))]" />
              <span className="text-[12.5px] font-[550]">The video you&apos;re watching</span>
              <span className="gloss grid h-8 place-items-center rounded-full text-[12.5px] font-[600]">
                Save for later
              </span>
            </div>
            <p className="mt-3 text-12 text-ink-3">
              Click the extension on any problem, video or article, or right-click a page. Videos
              remember the minute you were at.
            </p>
          </Card>
          {byTopic.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By topic</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-2.5">
                {byTopic.map(([t, n]) => (
                  <li
                    key={t}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-13"
                  >
                    <span className="truncate">{t}</span>
                    <span className="tnum text-ink-2">{n}</span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-signal"
                        style={{ width: `${(n / byTopic[0]![1]) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

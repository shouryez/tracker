import type { Metadata } from "next";
import { Suspense } from "react";
import { TOPICS } from "@upsolve/core";
import { Card, CardHeader, CardTitle, LogoMark, SkeletonCard } from "@upsolve/ui";
import { LaterList } from "@/components/daily/later-list";
import { PAGE_GLOW, PageHeader } from "@/components/page-header";
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
      <PageHeader
        eyebrow="Saved for later"
        glow={PAGE_GLOW.sheets}
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
          <Card className="lamp">
            <CardHeader>
              <CardTitle>Save from any tab</CardTitle>
            </CardHeader>
            <div
              aria-hidden="true"
              className="flex flex-col gap-2.5 rounded-[14px] bg-surface-2 p-3.5 shadow-[inset_0_0_0_1px_var(--line-2),0_24px_40px_-24px_rgba(0,0,0,.7)]"
            >
              <span className="flex items-center gap-2">
                <LogoMark size={18} />
                <span className="text-[12.5px] font-[600]">DsaKaro</span>
                <span className="ml-auto text-12 text-ink-3">youtube.com</span>
              </span>
              <span className="h-16 rounded-[8px] bg-[linear-gradient(135deg,#2b1a1a,#161013)]" />
              <span className="text-[12.5px] font-[550]">The video you&apos;re watching</span>
              <span className="grid h-8 place-items-center rounded-[8px] bg-signal text-[12.5px] font-[550] text-signal-ink">
                Save for later
              </span>
            </div>
            <p className="mt-3 text-12 text-ink-3">
              Click the extension on any problem, video or article, or right-click a page. Videos
              remember the minute you were at.
            </p>
          </Card>
          {byTopic.length > 0 && (
            <Card tier="inset">
              <CardHeader>
                <CardTitle>By topic</CardTitle>
              </CardHeader>
              <ul className="flex flex-col">
                {byTopic.map(([t, n]) => (
                  <li
                    key={t}
                    className="flex justify-between border-t border-line py-2 text-13 first:border-t-0"
                  >
                    <span>{t}</span>
                    <span className="tnum font-mono">{n}</span>
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

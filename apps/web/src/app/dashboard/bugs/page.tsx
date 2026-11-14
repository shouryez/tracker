import type { Metadata } from "next";
import { Suspense } from "react";
import { Bug } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard } from "@upsolve/ui";
import { FindingCard } from "@/components/bug-autopsy";
import { INSIGHTS_TABS, SectionTabs } from "@/components/orbit/section-tabs";
import { PageHeader } from "@/components/page-header";
import { aiEnabled } from "@/lib/ai";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { BUG_CLASSES } from "@/lib/bug-classes";
import { getBugProfile } from "@/lib/bug-data";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Bug profile" };

export default function BugsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-12 gap-3.5">
            <SkeletonCard lines={5} className="col-span-12 h-[300px] xl:col-span-5" />
            <SkeletonCard lines={5} className="col-span-12 h-[300px] xl:col-span-7" />
          </div>
        }
      >
        <BugsContent />
      </Suspense>
    </div>
  );
}

async function BugsContent() {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to see your bug profile.</p>;
  const profile = await getBugProfile(user.id, requestNow());
  const top = profile.classes[0];
  const max = Math.max(1, ...profile.classes.map((c) => c.count));

  return (
    <div className="flex flex-col gap-5">
      <SectionTabs tabs={INSIGHTS_TABS} />
      <PageHeader
        eyebrow="Bug profile"
        title={
          <>
            The bugs you <em>actually</em> make
          </>
        }
        subtitle="Every Wrong Answer, time limit or runtime error the extension saw, sorted into what went wrong. Your top ones also show in the pre-submit checklist."
      />

      {profile.total === 0 ? (
        <Card className="p-[22px]">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-3">
              <Bug size={16} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-14 font-[600]">No autopsies yet.</p>
              <p className="text-13 text-ink-2">
                {!aiEnabled()
                  ? "Bug autopsy is switching on soon. Your failed submissions are being saved, so they'll be examined then."
                  : profile.pending > 0
                    ? `${profile.pending} failed submission${profile.pending === 1 ? " is" : "s are"} being examined.`
                    : "Solve on LeetCode with the extension on. The next Wrong Answer gets an autopsy: the bug, the line and what to check next time."}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-3.5">
          <Card className="col-span-12 p-[22px] xl:col-span-5">
            <CardHeader>
              <CardTitle>What goes wrong</CardTitle>
              <CardSub className="font-mono">{profile.total} autopsies</CardSub>
            </CardHeader>
            {top && (
              <div className="mb-4 rounded-[14px] bg-[color-mix(in_srgb,var(--bad)_9%,transparent)] px-4 py-3">
                <p className="text-13 text-ink-2">
                  <span className="font-[650] text-ink">{BUG_CLASSES[top.bugClass].label}</span> is
                  your most common bug: {top.count} time{top.count === 1 ? "" : "s"}
                  {top.recent ? `, ${top.recent} in the last 30 days` : ""}.
                </p>
                <p className="mt-1 text-13 text-ink">{BUG_CLASSES[top.bugClass].advice}</p>
              </div>
            )}
            <ul className="flex flex-col gap-2.5">
              {profile.classes.map((c) => (
                <li key={c.bugClass} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-13">
                    <span>{BUG_CLASSES[c.bugClass].label}</span>
                    <span className="tnum text-12 text-ink-3">
                      <span className="font-[600] text-ink">{c.count}</span>
                      {c.recent ? ` · ${c.recent} recent` : ""}
                    </span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(c.count / max) * 100}%`,
                        background:
                          c.bugClass === top?.bugClass
                            ? "var(--bad)"
                            : "color-mix(in srgb, var(--bad) 45%, transparent)",
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="col-span-12 p-[22px] xl:col-span-7">
            <CardHeader>
              <CardTitle>Latest autopsies</CardTitle>
              <CardSub>change a class if it&apos;s wrong</CardSub>
            </CardHeader>
            <div className="flex flex-col gap-2.5">
              {profile.recent.map((f) => (
                <FindingCard key={f.submissionId} finding={f} showTitle />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

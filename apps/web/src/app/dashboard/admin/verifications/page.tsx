import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { History, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardSub, CardTitle, SkeletonCard, Tag } from "@upsolve/ui";
import { Dot, PAGE_GLOW, PageHeader } from "@/components/page-header";
import { TimeAgo } from "@/components/time-ago";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { getVerificationQueue } from "@/lib/verification";
import { REJECT_REASONS } from "@/lib/verification-image";
import { ReviewCard } from "./review-card";

export const metadata: Metadata = { title: "College verifications" };

/** Admin queue of college ID uploads. ADMIN_EMAILS only; everyone else gets a 404. */
export default function VerificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<SkeletonCard lines={8} className="h-[480px]" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) notFound();
  const { pending, recent } = await getVerificationQueue();
  const approved = recent.filter((r) => r.status === "approved").length;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        glow={PAGE_GLOW.sheets}
        title={
          <>
            College IDs, <em>checked by hand.</em>
          </>
        }
        subtitle={
          <>
            <span>{pending.length} waiting</span>
            <Dot />
            <span>
              {approved} approved, {recent.length - approved} rejected recently
            </span>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle icon={<ShieldCheck size={14} />} tint="var(--violet)">
            Waiting for review
          </CardTitle>
          <CardSub>oldest first · photos are deleted once you decide</CardSub>
        </CardHeader>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-14 text-ink-2">All caught up. Nothing to review.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {pending.map((item) => (
              <ReviewCard key={item.id} item={item} reasons={[...REJECT_REASONS]} />
            ))}
          </div>
        )}
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle icon={<History size={14} />} tint="var(--info)">
              Recent decisions
            </CardTitle>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <Tag tone={r.status === "approved" ? "ac" : "wa"} mono>
                  {r.status}
                </Tag>
                <span className="text-13 font-[550]">
                  {r.name ?? r.handle ?? "Someone"}
                  {r.handle && <span className="ml-1 font-normal text-ink-3">@{r.handle}</span>}
                </span>
                <span className="text-12 text-ink-3">{r.college}</span>
                {r.reason && (
                  <span className="w-full text-12 text-ink-3 sm:w-auto">
                    &ldquo;{r.reason}&rdquo;
                  </span>
                )}
                <span className="ml-auto text-11 text-ink-3">
                  {r.reviewedBy?.split("@")[0]} · <TimeAgo date={new Date(r.reviewedAt)} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

// DsaKaro

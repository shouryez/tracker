import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { feedback, profiles } from "@upsolve/db";
import { Card, CardSub, Tag, type TagTone } from "@upsolve/ui";
import { TimeAgo } from "@/components/time-ago";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Feedback" };

const TONE: Record<string, TagTone> = { bug: "wa", confusing: "tle", idea: "ac", other: "neutral" };

/** Everything sent through the feedback button. Admins only (ADMIN_EMAILS). */
export default function FeedbackPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[clamp(26px,3.4vw,38px)] leading-[1.02] font-[550] tracking-[-0.04em]">
        Feedback<span className="block text-ink-3">From the feedback button</span>
      </h1>
      <Suspense fallback={<div className="h-96 skeleton rounded-lg" />}>
        <FeedbackList />
      </Suspense>
    </div>
  );
}

async function FeedbackList() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) notFound();

  const rows = await db()
    .select({
      id: feedback.id,
      kind: feedback.kind,
      message: feedback.message,
      page: feedback.page,
      createdAt: feedback.createdAt,
      name: profiles.name,
      handle: profiles.handle,
    })
    .from(feedback)
    .leftJoin(profiles, eq(profiles.userId, feedback.userId))
    .orderBy(desc(feedback.createdAt))
    .limit(300);

  if (rows.length === 0) return <p className="text-ink-2">No feedback yet.</p>;

  const counts = rows.reduce<Record<string, number>>(
    (c, r) => ({ ...c, [r.kind]: (c[r.kind] ?? 0) + 1 }),
    {},
  );
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([k, n]) => (
          <Tag key={k} tone={TONE[k]} mono>
            {k} {n}
          </Tag>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Tag tone={TONE[r.kind]} mono>
                {r.kind}
              </Tag>
              <CardSub>
                {r.name ?? "Someone"}
                {r.handle ? ` @${r.handle}` : ""} · {r.page ?? "—"} · <TimeAgo date={r.createdAt} />
              </CardSub>
            </div>
            <p className="text-[14px] whitespace-pre-wrap">{r.message}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

// DsaKaro

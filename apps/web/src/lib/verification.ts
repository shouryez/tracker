import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db, userTag } from "@/lib/db";

export const VERIFICATIONS_TAG = "verifications";

export type MyVerification = {
  /** Verified for the college currently on the profile. */
  verifiedAt: number | null;
  college: { id: string; name: string } | null;
  /** The latest upload for the current college, if any. */
  latest: {
    id: string;
    status: "pending" | "approved" | "rejected";
    reason: string | null;
    submittedAt: number;
  } | null;
};

const ms = (v: unknown) => (v ? new Date(v as string).getTime() : null);

/** Verification state for Settings and onboarding. */
export async function getMyVerification(userId: string): Promise<MyVerification> {
  "use cache";
  cacheTag(userTag(userId));
  cacheLife("minutes");
  const [row] = (await db().execute(sql`
    select p.college_verified_at as "verifiedAt", c.id as "collegeId", c.name as "collegeName",
           v.id, v.status, v.reason, v.submitted_at as "submittedAt"
    from profiles p
    left join colleges c on c.id = p.college_id
    left join lateral (
      select id, status, reason, submitted_at from college_verifications
      where user_id = p.user_id and college_id = p.college_id
      order by submitted_at desc limit 1
    ) v on true
    where p.user_id = ${userId}`)) as unknown as {
    verifiedAt: unknown;
    collegeId: string | null;
    collegeName: string | null;
    id: string | null;
    status: "pending" | "approved" | "rejected" | null;
    reason: string | null;
    submittedAt: unknown;
  }[];
  if (!row) return { verifiedAt: null, college: null, latest: null };
  return {
    verifiedAt: ms(row.verifiedAt),
    college: row.collegeId ? { id: row.collegeId, name: row.collegeName ?? "" } : null,
    latest:
      row.id && row.status
        ? { id: row.id, status: row.status, reason: row.reason, submittedAt: ms(row.submittedAt)! }
        : null,
  };
}

export type QueueItem = {
  id: string;
  userId: string;
  name: string | null;
  handle: string | null;
  email: string | null;
  college: string;
  /** The student has since switched to another college on their profile. */
  collegeChanged: boolean;
  gradYear: number | null;
  note: string | null;
  submittedAt: number;
  /** Earlier rejected uploads by the same student. */
  rejections: number;
};

export type Decision = {
  id: string;
  name: string | null;
  handle: string | null;
  college: string;
  status: "approved" | "rejected";
  reason: string | null;
  reviewedAt: number;
  reviewedBy: string | null;
};

/** Admin queue: pending uploads oldest first, and the latest decisions. Never cached. */
export async function getVerificationQueue(): Promise<{
  pending: QueueItem[];
  recent: Decision[];
}> {
  const pending = (await db().execute(sql`
    select v.id, v.user_id as "userId", p.name, p.handle, u.email, c.name as college,
           (p.college_id is distinct from v.college_id) as "collegeChanged",
           p.grad_year as "gradYear", v.note, v.submitted_at as "submittedAt",
           (select count(*)::int from college_verifications r
              where r.user_id = v.user_id and r.status = 'rejected') as rejections
    from college_verifications v
    join colleges c on c.id = v.college_id
    left join profiles p on p.user_id = v.user_id
    left join auth.users u on u.id = v.user_id
    where v.status = 'pending'
    order by v.submitted_at asc
    limit 100`)) as unknown as (Omit<QueueItem, "submittedAt"> & { submittedAt: unknown })[];
  const recent = (await db().execute(sql`
    select v.id, p.name, p.handle, c.name as college, v.status, v.reason,
           v.reviewed_at as "reviewedAt", v.reviewed_by as "reviewedBy"
    from college_verifications v
    join colleges c on c.id = v.college_id
    left join profiles p on p.user_id = v.user_id
    where v.status <> 'pending'
    order by v.reviewed_at desc nulls last
    limit 30`)) as unknown as (Omit<Decision, "reviewedAt"> & { reviewedAt: unknown })[];
  return {
    pending: pending.map((r) => ({ ...r, submittedAt: ms(r.submittedAt)! })),
    recent: recent.map((r) => ({ ...r, reviewedAt: ms(r.reviewedAt) ?? 0 })),
  };
}

/** How many uploads wait for review (for the admin menu badge). */
export async function pendingVerificationCount(): Promise<number> {
  "use cache";
  cacheTag(VERIFICATIONS_TAG);
  cacheLife("minutes");
  const [row] = (await db().execute(
    sql`select count(*)::int as n from college_verifications where status = 'pending'`,
  )) as unknown as { n: number }[];
  return row?.n ?? 0;
}

// DsaKaro

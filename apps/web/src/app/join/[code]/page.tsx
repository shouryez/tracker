import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@upsolve/ui";
import { JoinButton } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getGroup, getInvite } from "@/lib/social-data";

export const metadata: Metadata = { title: "Join a group" };

/** Invite link landing: shows the group and a join button. */
export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg-2 px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link href="/" aria-label="Upsolve home" className="mb-6 inline-block">
          <Logo />
        </Link>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-surface" />}>
          <Invite params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Invite({ params }: { params: PageProps<"/join/[code]">["params"] }) {
  const { code } = await params;
  if (!/^[a-z2-9]{10}$/.test(code)) notFound();
  const user = await getCurrentUser();
  if (isDemoUser(user)) return <p className="text-ink-2">Sign in to join groups.</p>;

  const invite = await getInvite(code);
  if (!invite) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <h1 className="mb-2 text-[22px] font-[550] tracking-[-0.03em]">This invite has expired</h1>
        <p className="mb-5 text-[14px] text-ink-2">
          The group owner may have made a new link. Ask them for the latest one.
        </p>
        <Link href="/dashboard/groups" className="text-[13.5px] underline">
          Go to your groups
        </Link>
      </div>
    );
  }
  if (await getGroup(user.id, invite.id)) redirect(`/dashboard/groups/${invite.id}`);

  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <p className="mb-1 font-mono text-[11px] tracking-[.08em] text-ink-3 uppercase">
        You&apos;re invited to
      </p>
      <h1 className="mb-2 text-[26px] leading-tight font-[550] tracking-[-0.03em]">
        {invite.name}
      </h1>
      <p className="mb-5 text-[14px] leading-relaxed text-ink-2">
        {invite.members} member{invite.members === 1 ? "" : "s"}. Joining adds you to the
        group&apos;s weekly leaderboard and study room, where members see what you&apos;re solving
        while the extension is running (you can turn that off in Settings).
      </p>
      <JoinButton code={code} />
    </div>
  );
}

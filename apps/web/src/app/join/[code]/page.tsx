import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DotGrid, GlowOrb, Logo, SkeletonCard } from "@upsolve/ui";
import { JoinButton } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getGroup, getInvite } from "@/lib/social-data";

export const metadata: Metadata = { title: "Join a group" };

/** Invite link landing: shows the group and a join button. */
export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg-2 px-4 py-10">
      <DotGrid className="opacity-60" />
      <GlowOrb
        className="top-[-20%] left-1/2 -translate-x-1/2 opacity-30"
        size={560}
        color="#ff6bb5"
      />
      <div className="relative w-full max-w-[440px]">
        <Link href="/" aria-label="Upsolve home" className="mb-6 inline-block">
          <Logo />
        </Link>
        <Suspense fallback={<SkeletonCard lines={3} className="h-[240px]" />}>
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
      <div className="surface-card rounded-[24px] p-6">
        <h1 className="mb-2 text-[22px] font-[600] tracking-[-0.03em]">
          This invite has <em className="font-display font-normal">expired.</em>
        </h1>
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
    <div className="surface-hero border-beam relative overflow-hidden rounded-[24px] p-7">
      <span aria-hidden="true" className="grain absolute inset-0" />
      <p className="relative mb-1 label-mono text-white/65">You&apos;re invited to</p>
      <h1 className="relative mb-2 font-display text-[40px] leading-tight tracking-[-0.02em]">
        {invite.name}
      </h1>
      <p className="relative mb-6 text-[14px] leading-relaxed text-white/75">
        {invite.members} member{invite.members === 1 ? "" : "s"}. Joining adds you to the
        group&apos;s weekly leaderboard and study room, where members see what you&apos;re solving
        while the extension is running (you can turn that off in Settings).
      </p>
      <div className="relative">
        <JoinButton code={code} />
      </div>
    </div>
  );
}

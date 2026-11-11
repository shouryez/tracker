import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DotGrid, GlowOrb, Logo, SkeletonCard } from "@upsolve/ui";
import { JoinButton } from "@/components/social";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getGroup, getInvite } from "@/lib/social-data";

import { getStudyHall } from "@/lib/daily-data";
import { StudyBuddy } from "@/components/study-buddy";
export const metadata: Metadata = { title: "Join a group" };

/** Invite link landing: shows the group and a join button. */
export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg-2 px-4 py-10">
      <DotGrid className="opacity-60" />
      <GlowOrb
        className="top-[-20%] left-1/2 -translate-x-1/2 opacity-30"
        size={560}
        color="#7cb7ff"
      />
      <div className="relative w-full max-w-[440px]">
        <Link href="/" aria-label="DsaKaro home" className="mb-6 inline-block">
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
        <h1 className="mb-2 font-display text-[26px] leading-tight">
          This invite has <em className="text-ink-3 not-italic">expired.</em>
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
  const hall = await getStudyHall(invite.id);
  const studying = hall.filter((m) => m.live && !m.live.pausedAt).length;

  return (
    <div className="surface-card relative flex flex-col items-center gap-5 overflow-hidden rounded-[24px] p-8 text-center">
      {/* Everyone's buddy (no names until you're in), and who's studying right now. */}
      <div className="flex items-center">
        {hall.slice(0, 6).map((m, i) => (
          <span key={m.userId} className={i ? "-ml-2.5" : ""}>
            <StudyBuddy
              buddy={m.avatar}
              level={m.live ? (m.live.pausedAt ? "paused" : 1) : "idle"}
              size={54}
            />
          </span>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-13 text-ink-3">You&apos;re invited to</p>
        <h1 className="font-display text-[38px] leading-none">{invite.name}</h1>
        <p className="flex items-center gap-2.5 text-13 text-ink-3">
          {studying > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-0.5 text-12 font-[600] text-signal-text">
              <span className="size-1.5 rounded-full bg-signal" /> {studying} studying now
            </span>
          )}
          {invite.members} member{invite.members === 1 ? "" : "s"}
        </p>
      </div>
      <div className="w-full">
        <JoinButton code={code} />
      </div>
      <p className="text-12 leading-relaxed text-ink-3">
        You&apos;ll see each other&apos;s study timers and a weekly leaderboard. Members see what
        you&apos;re solving while the extension runs (turn that off in Settings). Leave any time.
      </p>
    </div>
  );
}

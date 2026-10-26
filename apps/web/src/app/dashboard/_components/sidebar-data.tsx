import Link from "next/link";
import { Puzzle } from "lucide-react";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getExtensionTokens } from "@/lib/sessions-data";
import { requestNow } from "@/lib/time";
import { MobileNav, Sidebar } from "./nav-links";

/** Numbers the navigation shows: reviews due today. */
async function navBadges(): Promise<{ badges: Record<string, number>; hasExtension: boolean }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { badges: {}, hasExtension: false };
  const [profile, learning, targets, tokens] = await Promise.all([
    getProfile(user.id),
    getLearning(user.id),
    getTopicTargets(),
    getExtensionTokens(user.id),
  ]);
  const now = requestNow();
  const queue = revisionQueue(learning, masteryOf(learning, targets, now), {
    tz: profile?.timezone ?? "Asia/Kolkata",
    cap: profile?.reviewCap ?? 5,
    now,
  });
  return {
    badges: queue.today.length ? { "/dashboard/revision": queue.today.length } : {},
    hasExtension: tokens.length > 0,
  };
}

export async function SidebarWithData() {
  const { badges, hasExtension } = await navBadges();
  return <Sidebar badges={badges} footer={<ExtensionPromo connected={hasExtension} />} />;
}

export async function MobileNavWithData() {
  const { badges } = await navBadges();
  return <MobileNav badges={badges} />;
}

/** Bottom-of-sidebar promo card (Donezo's "Download our app"). */
export function ExtensionPromo({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#16163a,#0b0b14_60%)] p-4 text-white shadow-md">
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 size-36 rounded-full bg-[radial-gradient(circle,var(--glow-a),transparent_65%)] blur-md"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30 [background-image:repeating-radial-gradient(circle_at_120%_120%,transparent_0_10px,rgba(255,255,255,.08)_10px_11px)]"
      />
      <span className="relative mb-3 grid size-8 place-items-center rounded-full bg-white/10">
        <Puzzle size={15} aria-hidden="true" />
      </span>
      <p className="relative text-[14.5px] leading-tight font-semibold">
        Time every problem, automatically
      </p>
      <p className="relative mt-1 text-[12px] text-white/60">LeetCode + GFG, no code uploaded</p>
      <Link
        href="/extension/connect"
        className="relative mt-3 flex h-9 items-center justify-center rounded-full bg-signal text-[13px] font-semibold text-signal-ink transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-px hover:shadow-glow-signal active:scale-[.97]"
      >
        Get the extension
      </Link>
    </div>
  );
}

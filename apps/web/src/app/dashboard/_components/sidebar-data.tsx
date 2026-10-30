import Link from "next/link";
import { Puzzle } from "lucide-react";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getExtensionTokens } from "@/lib/sessions-data";
import { requestNow } from "@/lib/time";
import { Avatar } from "./avatar-menu";
import { MobileNav, Sidebar } from "./nav-links";
import { getAvatarUser } from "./user-menu";

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
  const [{ badges, hasExtension }, user] = await Promise.all([navBadges(), getAvatarUser()]);
  return (
    <Sidebar
      badges={badges}
      footer={<ExtensionPromo connected={hasExtension} />}
      user={
        <Link
          href="/dashboard/settings"
          aria-label={`${user.label}, settings`}
          className="group/user flex items-center gap-2.5 rounded-[14px] border border-line bg-surface-2/70 p-2 transition-colors hover:border-line-2 hover:bg-surface-3 group-data-[collapsed]/side:justify-center group-data-[collapsed]/side:border-transparent group-data-[collapsed]/side:bg-transparent"
        >
          <Avatar user={user} size={34} />
          <span className="min-w-0 leading-tight group-data-[collapsed]/side:hidden">
            <span className="block truncate text-13 font-[600]">{user.label}</span>
            <span className="block truncate text-11 text-ink-3">
              {user.handle ? `@${user.handle}` : (user.email ?? "Settings")}
            </span>
          </span>
        </Link>
      }
    />
  );
}

export async function MobileNavWithData() {
  const { badges } = await navBadges();
  return <MobileNav badges={badges} />;
}

/** Bottom-of-sidebar promo card: hero-tier glass with grain and a lime CTA. */
export function ExtensionPromo({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div className="surface-hero relative overflow-hidden rounded-[18px] p-4">
      <span aria-hidden="true" className="grain absolute inset-0" />
      <span
        aria-hidden="true"
        className="absolute -top-12 -right-10 size-36 scale-[1.6] bg-[radial-gradient(closest-side,var(--signal),transparent)] opacity-20"
      />
      <span className="relative mb-3 grid size-8 place-items-center rounded-[10px] bg-white/12">
        <Puzzle size={15} aria-hidden="true" />
      </span>
      <p className="relative text-14 leading-tight font-[600]">
        Time every problem, <em className="font-display font-normal">automatically.</em>
      </p>
      <p className="relative mt-1 text-12 text-white/65">LeetCode + GFG, no code uploaded</p>
      <Link
        href="/extension/connect"
        className="relative mt-3 flex h-9 items-center justify-center rounded-full bg-signal text-13 font-[600] text-signal-ink transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-0.5 hover:shadow-glow-signal active:scale-[.97]"
      >
        Get the extension
      </Link>
    </div>
  );
}

// DsaKaro

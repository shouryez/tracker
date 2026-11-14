import Link from "next/link";
import { Puzzle } from "lucide-react";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getExtensionTokens } from "@/lib/sessions-data";
import { getFriendsStudying, getSavedItems } from "@/lib/daily-data";
import { getTodayPlan } from "@/lib/plan";
import { requestNow } from "@/lib/time";
import { Avatar } from "./avatar-menu";
import { MobileNav, Sidebar, type ContinueTarget } from "./nav-links";
import { getAvatarUser } from "./user-menu";

/**
 * Numbers the navigation shows (due reviews, today's progress, live friends) and the one
 * next step for the Continue button: the first due revision, else the next item on Today.
 */
async function navBadges(): Promise<{
  badges: Record<string, number | string>;
  due: Record<string, number>;
  hasExtension: boolean;
  next: ContinueTarget | null;
}> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { badges: {}, due: {}, hasExtension: false, next: null };
  const [profile, learning, targets, tokens, saved, live] = await Promise.all([
    getProfile(user.id),
    getLearning(user.id),
    getTopicTargets(),
    getExtensionTokens(user.id),
    getSavedItems(user.id),
    getFriendsStudying(user.id),
  ]);
  const now = requestNow();
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const queue = revisionQueue(learning, masteryOf(learning, targets, now), {
    tz,
    cap: profile?.reviewCap ?? 5,
    now,
  });
  const plan = await getTodayPlan(user.id, tz, profile?.reviewCap ?? 5, now);
  const due: Record<string, number> = queue.today.length
    ? { "/dashboard/revision": queue.today.length }
    : {};
  const waiting = saved.filter((x) => !x.done).length;
  const firstDue = queue.today[0];
  const nextItem = plan.items.find((i) => !i.done && i.url);
  const next: ContinueTarget = firstDue
    ? { label: "Revise", detail: firstDue.title, href: firstDue.url, external: true }
    : nextItem?.url
      ? { label: "Continue", detail: nextItem.title, href: nextItem.url, external: true }
      : { label: "Plan today", detail: "Pick what to solve", href: "/dashboard" };
  return {
    due,
    badges: {
      ...due,
      ...(plan.total ? { "/dashboard": `${plan.done}/${plan.total}` } : {}),
      ...(waiting ? { "/dashboard/notebook": String(waiting) } : {}),
      ...(live ? { "/dashboard/groups": `${live} live` } : {}),
    },
    hasExtension: tokens.length > 0,
    next,
  };
}

export async function SidebarWithData() {
  const [{ badges, hasExtension, next }, user] = await Promise.all([navBadges(), getAvatarUser()]);
  return (
    <Sidebar
      badges={badges}
      next={next}
      footer={<ExtensionPromo connected={hasExtension} />}
      user={
        <Link
          href="/dashboard/settings"
          aria-label={`${user.label}, settings`}
          className="group/user flex items-center gap-2.5 rounded-[16px] p-2 shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] group-data-[collapsed]/side:justify-center group-data-[collapsed]/side:shadow-none"
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
  const { due, next } = await navBadges();
  return <MobileNav badges={due} next={next} />;
}

/** Bottom-of-sidebar card when the extension isn't connected yet. */
export function ExtensionPromo({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div className="relative overflow-hidden rounded-[18px] p-4 shadow-[inset_0_0_0_1px_var(--line)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]">
      <span className="mb-3 grid size-8 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-ink">
        <Puzzle size={15} aria-hidden="true" />
      </span>
      <p className="text-[14px] leading-tight font-[600] text-ink">
        Time every problem automatically
      </p>
      <p className="mt-1 text-12 text-ink-3">
        LeetCode and GFG. Only your own submitted code is saved, for bug autopsy.
      </p>
      <Link
        href="/extension/connect"
        className="glass-control mt-3 flex h-9 items-center justify-center rounded-full text-13 font-[600] text-ink transition-[transform,background-color] duration-[var(--dur-base)] hover:-translate-y-px active:scale-[.97]"
      >
        Get the extension
      </Link>
    </div>
  );
}

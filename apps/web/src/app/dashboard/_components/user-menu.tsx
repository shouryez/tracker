import { Skeleton } from "@upsolve/ui";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { AvatarMenu, type AvatarUser } from "./avatar-menu";

/** Who is signed in, shaped for the avatar menu and the sidebar user card. */
export async function getAvatarUser(): Promise<AvatarUser> {
  const user = await getCurrentUser();
  const demo = isDemoUser(user);
  const profile = demo ? null : await getProfile(user.id);
  const label = profile?.name ?? user.name ?? user.email ?? "Demo";
  const initials =
    label
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  return {
    label,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? null,
    handle: profile?.handle ?? null,
    initials,
    canSignOut: !demo,
  };
}

export async function UserMenu() {
  return <AvatarMenu user={await getAvatarUser()} />;
}

export function UserMenuSkeleton() {
  return (
    <span aria-hidden="true" className="flex items-center gap-2.5">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="hidden h-8 w-28 xl:block" />
    </span>
  );
}

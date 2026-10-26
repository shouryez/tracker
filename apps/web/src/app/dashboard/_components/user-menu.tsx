import { LogOut } from "lucide-react";
import { Skeleton } from "@upsolve/ui";
import { getCurrentUser, isDemoUser } from "@/lib/auth";

export async function UserMenu() {
  const user = await getCurrentUser();
  const label = user.name ?? user.email ?? "Demo";
  const initials =
    label
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--primary),var(--ember))] text-[13px] font-semibold text-white ring-2 ring-surface ring-offset-1 ring-offset-line-2">
        {user.avatarUrl ? (
          // Google avatar: tiny, already sized by the provider.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </span>
      <span className="hidden min-w-0 leading-tight xl:block">
        <span className="block max-w-[180px] truncate text-[13.5px] font-[550]">{label}</span>
        {user.email && user.name && (
          <span className="block max-w-[180px] truncate text-[12px] text-ink-3">{user.email}</span>
        )}
      </span>
      {!isDemoUser(user) && (
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="inline-grid size-[36px] place-items-center rounded-full border border-line-2 bg-surface text-ink-2 shadow-xs transition-[color,border-color,transform] duration-[var(--dur-base)] hover:border-line-3 hover:text-ink active:scale-95"
          >
            <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <span aria-hidden="true" className="flex items-center gap-2.5">
      <Skeleton className="size-[38px] rounded-full" />
      <Skeleton className="hidden h-8 w-32 xl:block" />
    </span>
  );
}

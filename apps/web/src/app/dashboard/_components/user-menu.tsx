import { LogOut } from "lucide-react";
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
    <div className="flex items-center gap-2">
      <span
        title={label}
        className="grid size-[34px] place-items-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--ember))] text-[13px] font-semibold text-white"
      >
        {initials}
      </span>
      {!isDemoUser(user) && (
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="inline-grid size-[34px] place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition-colors duration-[240ms] hover:border-ink-3 hover:text-ink"
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
    <span aria-hidden="true" className="size-[34px] animate-pulse rounded-full bg-surface-3" />
  );
}

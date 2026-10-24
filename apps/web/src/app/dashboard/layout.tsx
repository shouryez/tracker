import Link from "next/link";
import { Suspense } from "react";
import { Search, Settings } from "lucide-react";
import { Logo, ThemeToggle } from "@upsolve/ui";
import { NavLinks } from "./_components/nav-links";
import { UserMenu, UserMenuSkeleton } from "./_components/user-menu";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-dvh bg-bg-2 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line px-3 py-[18px] lg:flex lg:flex-col lg:gap-1">
        <Link href="/" className="px-2.5 pt-1 pb-2.5" aria-label="Upsolve home">
          <Logo />
        </Link>
        <NavLinks />
      </aside>

      <div className="min-w-0 px-4 py-4 sm:px-[22px] sm:py-[22px]">
        <header className="mb-[22px] flex items-center justify-between gap-3">
          <Link href="/dashboard" className="lg:hidden" aria-label="Upsolve dashboard">
            <Logo />
          </Link>
          <div
            aria-disabled="true"
            className="hidden h-[38px] max-w-[360px] flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] text-ink-3 sm:flex"
          >
            <Search size={14} aria-hidden="true" />
            Search problems, topics, sheets
            <kbd className="ml-auto rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px]">
              Ctrl K
            </kbd>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              className="inline-grid size-[34px] place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition-colors duration-[240ms] hover:border-ink-3 hover:text-ink lg:hidden"
            >
              <Settings size={15} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import {
  ChartColumn,
  LayoutGrid,
  ListChecks,
  RotateCcw,
  Search,
  Timer,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Logo, ThemeToggle, cn } from "@upsolve/ui";
import { UserMenu, UserMenuSkeleton } from "./_components/user-menu";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid, ready: true },
  { label: "Sessions", icon: Timer, ready: false },
  { label: "Revision", icon: RotateCcw, ready: false },
  { label: "Sheets", icon: ListChecks, ready: false },
  { label: "Analytics", icon: ChartColumn, ready: false },
  { label: "Contests", icon: Trophy, ready: false },
] as const;

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-dvh bg-bg-2 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line px-3 py-[18px] lg:flex lg:flex-col lg:gap-1">
        <Link href="/" className="px-2.5 pt-1 pb-2.5" aria-label="Upsolve home">
          <Logo />
        </Link>
        <NavGroup>Menu</NavGroup>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ label, icon: Icon, ready, ...rest }) =>
            ready && "href" in rest ? (
              <Link
                key={label}
                href={rest.href}
                aria-current="page"
                className={cn(navItem, "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]")}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-[9px] bottom-[9px] -left-3 w-[3px] rounded-r-[3px] bg-signal"
                />
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </Link>
            ) : (
              <span
                key={label}
                aria-disabled="true"
                className={cn(navItem, "cursor-default text-ink-3")}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {label}
                <span className="ml-auto font-mono text-[10px] tracking-[.06em] uppercase">
                  soon
                </span>
              </span>
            ),
          )}
        </nav>
        <NavGroup>Social</NavGroup>
        <span aria-disabled="true" className={cn(navItem, "cursor-default text-ink-3")}>
          <UsersRound size={16} strokeWidth={1.75} aria-hidden="true" />
          Your college
          <span className="ml-auto font-mono text-[10px] tracking-[.06em] uppercase">soon</span>
        </span>
      </aside>

      <div className="min-w-0 px-4 py-4 sm:px-[22px] sm:py-[22px]">
        <header className="mb-[22px] flex items-center justify-between gap-3">
          <Link href="/" className="lg:hidden" aria-label="Upsolve home">
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

const navItem =
  "relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] text-ink-2 transition-colors duration-[240ms] hover:bg-surface hover:text-ink";

function NavGroup({ children }: { children: string }) {
  return (
    <div className="px-2.5 pt-4 pb-1.5 font-mono text-[10.5px] font-medium tracking-[.1em] text-ink-3 uppercase">
      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  RotateCcw,
  Settings,
  Timer,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@upsolve/ui";
import { openFeedback } from "./feedback-button";

type Item = { label: string; icon: LucideIcon; href?: string };

const MENU: Item[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Sessions", href: "/dashboard/sessions", icon: Timer },
  { label: "Revision", href: "/dashboard/revision", icon: RotateCcw },
  { label: "Sheets", href: "/dashboard/sheets", icon: ListChecks },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartColumn },
  { label: "Contests", icon: Trophy },
];
const SOCIAL: Item[] = [
  { label: "Groups", href: "/dashboard/groups", icon: UsersRound },
  { label: "Your college", href: "/dashboard/college", icon: GraduationCap },
];
const ACCOUNT: Item[] = [{ label: "Settings", href: "/dashboard/settings", icon: Settings }];

const itemClass =
  "relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] transition-colors duration-[240ms]";

/** Sidebar with the current page highlighted. Reads the URL, so render it inside <Suspense>. */
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

/** Sidebar for a given path; with null nothing is highlighted (the Suspense fallback). */
export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <>
      <Group label="Menu" items={MENU} pathname={pathname} />
      <Group label="Social" items={SOCIAL} pathname={pathname} />
      <Group label="Account" items={ACCOUNT} pathname={pathname} />
    </>
  );
}

function Group({
  label,
  items,
  pathname,
}: {
  label: string;
  items: Item[];
  pathname: string | null;
}) {
  return (
    <>
      <div className="px-2.5 pt-4 pb-1.5 font-mono text-[10.5px] font-medium tracking-[.1em] text-ink-3 uppercase">
        {label}
      </div>
      <nav className="flex flex-col gap-1" aria-label={label}>
        {items.map(({ label, icon: Icon, href }) => {
          if (!href) {
            // Not built yet: ask what people want from it instead.
            return (
              <button
                key={label}
                type="button"
                title={`${label} is coming. Tell us what you'd want from it.`}
                onClick={() =>
                  openFeedback({ kind: "idea", text: `${label}: I'd like to be able to ` })
                }
                className={cn(itemClass, "text-left text-ink-3 hover:bg-surface hover:text-ink-2")}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {label}
                <span className="ml-auto font-mono text-[10px] tracking-[.06em] uppercase">
                  soon
                </span>
              </button>
            );
          }
          const active =
            pathname !== null &&
            (href === "/dashboard"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`));
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                itemClass,
                active
                  ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]"
                  : "text-ink-2 hover:bg-surface hover:text-ink",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-[9px] bottom-[9px] -left-3 w-[3px] rounded-r-[3px] bg-signal"
                />
              )}
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

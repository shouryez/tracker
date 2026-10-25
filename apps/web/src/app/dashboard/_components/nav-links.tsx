"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
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

type Item = { label: string; icon: LucideIcon; href?: string };

const MENU: Item[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Sessions", href: "/dashboard/sessions", icon: Timer },
  { label: "Revision", icon: RotateCcw },
  { label: "Sheets", icon: ListChecks },
  { label: "Analytics", icon: ChartColumn },
  { label: "Contests", icon: Trophy },
];
const SOCIAL: Item[] = [{ label: "Your college", icon: UsersRound }];
const ACCOUNT: Item[] = [{ label: "Settings", href: "/dashboard/settings", icon: Settings }];

const itemClass =
  "relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] transition-colors duration-[240ms]";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      <Group label="Menu" items={MENU} pathname={pathname} />
      <Group label="Social" items={SOCIAL} pathname={pathname} />
      <Group label="Account" items={ACCOUNT} pathname={pathname} />
    </>
  );
}

function Group({ label, items, pathname }: { label: string; items: Item[]; pathname: string }) {
  return (
    <>
      <div className="px-2.5 pt-4 pb-1.5 font-mono text-[10.5px] font-medium tracking-[.1em] text-ink-3 uppercase">
        {label}
      </div>
      <nav className="flex flex-col gap-1" aria-label={label}>
        {items.map(({ label, icon: Icon, href }) => {
          if (!href) {
            return (
              <span
                key={label}
                aria-disabled="true"
                className={cn(itemClass, "cursor-default text-ink-3")}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {label}
                <span className="ml-auto font-mono text-[10px] tracking-[.06em] uppercase">
                  soon
                </span>
              </span>
            );
          }
          const active = pathname === href;
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

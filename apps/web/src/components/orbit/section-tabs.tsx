"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@upsolve/ui";

export type SectionTab = { label: string; href: string; count?: number | string };

/**
 * Tabs between the pages of one sidebar destination (Revision | Recall, Notebook | Saved,
 * This week | All time, Groups | College). Each tab is a real page, so links, not state.
 */
export function SectionTabs({ tabs, className }: { tabs: SectionTab[]; className?: string }) {
  const pathname = usePathname();
  const activeHref =
    [...tabs]
      .sort((a, b) => b.href.length - a.href.length)
      .find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href ?? tabs[0]?.href;
  return (
    <nav
      aria-label="Section"
      className={cn(
        "glass-control relative isolate inline-flex self-start rounded-full p-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const on = t.href === activeHref;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-[550] transition-colors duration-[var(--dur-base)]",
              on ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId="section-tab"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-full bg-[color-mix(in_srgb,var(--ink)_11%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_4px_10px_-4px_rgba(0,0,0,.5)]"
              />
            )}
            {t.label}
            {t.count !== undefined && t.count !== 0 && (
              <span className="tnum rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-1.5 font-mono text-[11px] leading-[18px] text-ink-2">
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export const REVISION_TABS: SectionTab[] = [
  { label: "Revision", href: "/dashboard/revision" },
  { label: "Recall", href: "/dashboard/recall" },
];
export const LIBRARY_TABS: SectionTab[] = [
  { label: "Notebook", href: "/dashboard/notebook" },
  { label: "Saved for later", href: "/dashboard/later" },
];
export const INSIGHTS_TABS: SectionTab[] = [
  { label: "This week", href: "/dashboard/review" },
  { label: "All time", href: "/dashboard/analytics" },
  { label: "Bugs", href: "/dashboard/bugs" },
];
export const PEOPLE_TABS: SectionTab[] = [
  { label: "Groups", href: "/dashboard/groups" },
  { label: "Your college", href: "/dashboard/college" },
];

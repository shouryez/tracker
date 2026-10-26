"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ChartColumn,
  Ellipsis,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings,
  Timer,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark, Tooltip, cn } from "@upsolve/ui";

export type NavItem = { label: string; icon: LucideIcon; href: string };

export const MENU: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Revision", href: "/dashboard/revision", icon: RotateCcw },
  { label: "Sheets", href: "/dashboard/sheets", icon: ListChecks },
  { label: "Sessions", href: "/dashboard/sessions", icon: Timer },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartColumn },
  { label: "Contests", href: "/dashboard/contests", icon: Trophy },
];
export const SOCIAL: NavItem[] = [
  { label: "Groups", href: "/dashboard/groups", icon: UsersRound },
  { label: "Your college", href: "/dashboard/college", icon: GraduationCap },
];
export const ACCOUNT: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function isActive(href: string, pathname: string | null) {
  if (pathname === null) return false;
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

// Collapsed state lives in localStorage; read it as an external store so the
// server render (expanded) and the client agree until hydration finishes.
const KEY = "upsolve:sidebar";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function setCollapsed(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    // Blocked storage: the toggle still works until reload.
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Sidebar with the current page highlighted. Reads the URL, so render it inside <Suspense>. */
export function Sidebar(props: { badges?: Record<string, number>; footer?: ReactNode }) {
  return <SidebarView pathname={usePathname()} {...props} />;
}

/** Sidebar for a given path; with null nothing is highlighted (the Suspense fallback). */
export function SidebarView({
  pathname,
  badges = {},
  footer,
}: {
  pathname: string | null;
  badges?: Record<string, number>;
  footer?: ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto border-r border-line bg-bg-2/60 px-3 py-[18px] lg:flex",
        "transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
        collapsed ? "w-[76px]" : "w-[232px]",
      )}
    >
      <div
        className={cn(
          "flex items-center pb-2.5",
          collapsed ? "justify-center" : "justify-between pl-2.5",
        )}
      >
        <Link href="/" aria-label="Upsolve home" className="rounded-md">
          {collapsed ? <LogoMark /> : <Logo />}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors duration-[var(--dur-base)] hover:bg-surface-2 hover:text-ink"
          >
            <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
      {collapsed && (
        <Tooltip content="Expand sidebar" side="right" className="self-center">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="grid size-9 place-items-center rounded-md text-ink-3 transition-colors duration-[var(--dur-base)] hover:bg-surface-2 hover:text-ink"
          >
            <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </Tooltip>
      )}
      <Group label="Menu" items={MENU} pathname={pathname} badges={badges} collapsed={collapsed} />
      <Group
        label="Social"
        items={SOCIAL}
        pathname={pathname}
        badges={badges}
        collapsed={collapsed}
      />
      <Group
        label="Account"
        items={ACCOUNT}
        pathname={pathname}
        badges={badges}
        collapsed={collapsed}
      />
      {footer && !collapsed && <div className="mt-auto pt-4">{footer}</div>}
    </aside>
  );
}

function Group({
  label,
  items,
  pathname,
  badges,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  pathname: string | null;
  badges: Record<string, number>;
  collapsed: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "px-2.5 pt-4 pb-1.5 font-mono text-[10.5px] font-medium tracking-[.1em] text-ink-3 uppercase",
          collapsed && "sr-only",
        )}
      >
        {label}
      </div>
      <nav className="flex flex-col gap-1" aria-label={label}>
        {items.map(({ label, icon: Icon, href }) => {
          const active = isActive(href, pathname);
          const badge = badges[href];
          const link = (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              className={cn(
                "group/nav relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors duration-[var(--dur-base)]",
                collapsed && "justify-center px-0",
                active ? "text-ink" : "text-ink-2 hover:bg-surface/70 hover:text-ink",
              )}
            >
              {active && (
                // One element with a shared layoutId: it slides from item to item.
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  className="absolute inset-0 -z-10 rounded-[10px] bg-surface shadow-[inset_0_0_0_1px_var(--line),var(--shadow-xs)]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-[9px] bottom-[9px] -left-3 w-[3px] rounded-r-[3px] bg-signal shadow-[0_0_10px_var(--signal)]"
                  />
                </motion.span>
              )}
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="shrink-0 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover/nav:scale-110"
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {badge ? (
                <span
                  className={cn(
                    "rounded-full bg-signal px-1.5 font-mono text-[10px] leading-[18px] font-semibold text-signal-ink",
                    collapsed ? "absolute top-0.5 right-1.5 h-[16px] leading-[16px]" : "ml-auto",
                  )}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={label} content={label} side="right" className="block">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>
    </>
  );
}

/** Bottom tab bar for phones and tablets (the sidebar shows from 1024 px). */
export function MobileNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = [MENU[0]!, MENU[1]!, MENU[2]!, SOCIAL[0]!];
  const more = [MENU[3]!, MENU[4]!, MENU[5]!, SOCIAL[1]!, ACCOUNT[0]!];
  const moreActive = more.some((m) => isActive(m.href, pathname));
  const tabClass = (active: boolean) =>
    cn(
      "relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10.5px] transition-colors duration-[var(--dur-base)]",
      active ? "text-ink" : "text-ink-3",
    );
  const pill = (id: string) => (
    <motion.span
      layoutId={id}
      transition={{ type: "spring", stiffness: 520, damping: 40 }}
      className="absolute inset-0 -z-10 rounded-full bg-surface-2"
    />
  );

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
        />
      )}
      {moreOpen && (
        <div
          id="mobile-more"
          className="glass fixed inset-x-3 bottom-[76px] z-50 grid animate-pop grid-cols-3 gap-1 rounded-[22px] border border-line-2 p-2 shadow-lg lg:hidden"
        >
          {more.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={isActive(href, pathname) ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[14px] text-[12px] transition-colors",
                isActive(href, pathname)
                  ? "bg-surface-2 text-ink"
                  : "text-ink-2 hover:bg-surface-2",
              )}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      )}
      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-full border border-line-2 px-1.5 py-1.5 shadow-lg lg:hidden"
      >
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = isActive(href, pathname) && !moreOpen;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={tabClass(active)}
            >
              {active && pill("mobile-nav-active")}
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{label}</span>
              {badges[href] ? (
                <span
                  className="absolute top-1 right-[22%] size-2 rounded-full bg-signal"
                  aria-label={`${badges[href]} due`}
                />
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="mobile-more"
          onClick={() => setMoreOpen((o) => !o)}
          className={tabClass(moreActive || moreOpen)}
        >
          {(moreActive || moreOpen) && pill("mobile-nav-active")}
          <Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

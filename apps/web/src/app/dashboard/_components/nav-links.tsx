"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import {
  BookMarked,
  Bookmark,
  Brain,
  CalendarCheck,
  CalendarRange,
  ChartColumn,
  Ellipsis,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  MessageSquarePlus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings,
  Timer,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark, THEME_STORAGE_KEY, Tooltip, cn } from "@upsolve/ui";
import { openFeedback } from "./feedback-button";

export type NavItem = { label: string; icon: LucideIcon; href: string };

export const MENU: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Today", href: "/dashboard/today", icon: CalendarCheck },
  { label: "Revision", href: "/dashboard/revision", icon: RotateCcw },
  { label: "Sheets", href: "/dashboard/sheets", icon: ListChecks },
  { label: "Sessions", href: "/dashboard/sessions", icon: Timer },
  { label: "Analytics", href: "/dashboard/analytics", icon: ChartColumn },
  { label: "Contests", href: "/dashboard/contests", icon: Trophy },
];
export const TOOLKIT: NavItem[] = [
  { label: "Notebook", href: "/dashboard/notebook", icon: BookMarked },
  { label: "Recall", href: "/dashboard/recall", icon: Brain },
  { label: "Saved for later", href: "/dashboard/later", icon: Bookmark },
  { label: "Weekly review", href: "/dashboard/review", icon: CalendarRange },
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

function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.classList.add("theme-transition");
  root.setAttribute("data-theme", next);
  setTimeout(() => root.classList.remove("theme-transition"), 400);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked: applies for this page view.
  }
}

/** Sidebar with the current page highlighted. Reads the URL, so render it inside <Suspense>. */
export function Sidebar(props: {
  badges?: Record<string, number>;
  footer?: ReactNode;
  user?: ReactNode;
}) {
  return <SidebarView pathname={usePathname()} {...props} />;
}

/** Sidebar for a given path; with null nothing is highlighted (the Suspense fallback). */
export function SidebarView({
  pathname,
  badges = {},
  footer,
  user,
}: {
  pathname: string | null;
  badges?: Record<string, number>;
  footer?: ReactNode;
  /** User card pinned to the bottom; hide its text with group-data-[collapsed]/side. */
  user?: ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "group/side sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto border-r border-line bg-[linear-gradient(180deg,var(--surface),var(--bg-2))] px-3 py-[18px] lg:flex",
        "transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
        collapsed ? "w-[76px]" : "w-[236px]",
      )}
    >
      <div
        className={cn(
          "flex items-center pb-2.5",
          collapsed ? "justify-center" : "justify-between pl-2.5",
        )}
      >
        <Link
          href="/"
          aria-label="DsaKaro home"
          className="rounded-md transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)] hover:-rotate-2 hover:scale-105"
        >
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
        label="Toolkit"
        items={TOOLKIT}
        pathname={pathname}
        badges={badges}
        collapsed={collapsed}
      />
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
      <div className="mt-auto flex flex-col gap-3 pt-4">
        {footer && !collapsed && footer}
        {user}
      </div>
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
      <div className={cn("px-2.5 pt-4 pb-1.5 label-mono", collapsed && "sr-only")}>{label}</div>
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
                "group/nav relative flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13.5px] transition-colors duration-[var(--dur-base)]",
                collapsed && "justify-center px-0",
                active ? "font-[550] text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink",
              )}
            >
              {active && (
                // One element with a shared layoutId: it slides from item to item.
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-[11px] border border-line-2 bg-surface-3 shadow-e1"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-[9px] bottom-[9px] -left-3 w-[3px] rounded-r-[3px] bg-signal shadow-[0_0_12px_var(--signal)]"
                  />
                </motion.span>
              )}
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(
                  "shrink-0 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover/nav:translate-x-0.5 group-hover/nav:scale-110",
                  active && "text-signal-text",
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {badge ? (
                <span
                  aria-label={`${badge} due`}
                  className={cn(
                    "pulse-ring tnum rounded-full bg-signal px-1.5 font-mono text-[10px] leading-[18px] font-semibold text-signal-ink",
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

/**
 * Floating glass dock for phones and tablets (the sidebar shows from 1024 px): a sliding
 * active pill, press-scale feedback, and a More bottom sheet (drag handle, swipe down to close).
 */
export function MobileNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const tabs = MENU.slice(0, 4);
  const more = [...MENU.slice(4), ...TOOLKIT, ...SOCIAL, ...ACCOUNT];
  const moreActive = more.some((m) => isActive(m.href, pathname));
  const tabClass = (active: boolean) =>
    cn(
      "relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10.5px] font-[550] transition-[color,transform] duration-[var(--dur-base)] active:scale-90",
      active ? "text-ink" : "text-ink-3",
    );
  const pill = (id: string) => (
    <motion.span
      layoutId={id}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-surface-3 shadow-e1"
    />
  );

  // Swipe the sheet down to close it.
  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onPointerUp = () => {
    if (!drag.current || !sheet.current) return;
    const close = drag.current.dy > 70;
    sheet.current.style.transform = "";
    drag.current = null;
    if (close) setMoreOpen(false);
  };

  const sheetItem =
    "flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[16px] text-12 transition-[background-color,transform] active:scale-95";

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] lg:hidden"
        />
      )}
      {moreOpen && (
        <div
          id="mobile-more"
          ref={sheet}
          role="dialog"
          aria-label="More pages"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="glass fixed inset-x-2 bottom-2 z-50 animate-[sheet-up_var(--dur-slow)_var(--ease-spring)] touch-none rounded-[28px] border border-line-2 px-3 pt-2 pb-[92px] shadow-e4 lg:hidden"
        >
          <span
            aria-hidden="true"
            className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line-3"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {more.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(href, pathname) ? "page" : undefined}
                className={cn(
                  sheetItem,
                  isActive(href, pathname)
                    ? "bg-surface-3 text-ink"
                    : "text-ink-2 hover:bg-surface-2",
                )}
              >
                <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                openFeedback();
              }}
              className={cn(sheetItem, "text-ink-2 hover:bg-surface-2")}
            >
              <MessageSquarePlus size={19} strokeWidth={1.75} aria-hidden="true" />
              Feedback
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(sheetItem, "text-ink-2 hover:bg-surface-2")}
            >
              <Moon size={19} strokeWidth={1.75} aria-hidden="true" />
              Theme
            </button>
          </div>
        </div>
      )}
      <nav
        aria-label="Main"
        className="glass fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-full border border-line-2 px-1.5 py-1.5 shadow-e3 lg:hidden"
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
              <Icon
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(active && "text-signal-text")}
              />
              <span className="truncate">{label}</span>
              {badges[href] ? (
                <span
                  className="pulse-ring absolute top-1 right-[22%] size-2 rounded-full bg-signal text-signal"
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

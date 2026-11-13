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
  ArrowRight,
  BookMarked,
  Bookmark,
  Brain,
  CalendarCheck,
  CalendarRange,
  ChartColumn,
  Ellipsis,
  GraduationCap,
  Library,
  ListChecks,
  MessageSquarePlus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Search,
  Settings,
  Timer,
  Trophy,
  UsersRound,
  type LucideIcon,
  Briefcase,
} from "lucide-react";
import { Logo, LogoMark, THEME_STORAGE_KEY, ThemeToggle, Tooltip, cn } from "@upsolve/ui";
import { openCommandPalette } from "@/components/command-palette";
import { openFeedback } from "./feedback-button";

/** A sidebar destination. `match` lists the other routes that belong to it (its tabs). */
export type NavItem = { label: string; icon: LucideIcon; href: string; match?: string[] };

/** The next thing to do, shown as the one ember button in the sidebar and the mobile dock. */
export type ContinueTarget = { label: string; detail: string; href: string; external?: boolean };

// Orbit sidebar: eight destinations in three groups. Settings lives under your avatar.
export const MENU: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: CalendarCheck, match: ["/dashboard/today"] },
  { label: "Revision", href: "/dashboard/revision", icon: RotateCcw, match: ["/dashboard/recall"] },
  { label: "Sheets", href: "/dashboard/sheets", icon: ListChecks },
  { label: "Contests", href: "/dashboard/contests", icon: Trophy },
  { label: "Interview", href: "/dashboard/interview", icon: Briefcase },
];
export const TOOLKIT: NavItem[] = [
  { label: "Sessions", href: "/dashboard/sessions", icon: Timer },
  {
    label: "Library",
    href: "/dashboard/notebook",
    icon: Library,
    match: ["/dashboard/later", "/dashboard/problems"],
  },
  {
    label: "Insights",
    href: "/dashboard/analytics",
    icon: ChartColumn,
    match: ["/dashboard/review"],
  },
];
export const SOCIAL: NavItem[] = [
  { label: "People", href: "/dashboard/groups", icon: UsersRound, match: ["/dashboard/college"] },
];
/** Pages reached from inside another page (tabs) or from your avatar; listed in Ctrl K. */
export const ACCOUNT: NavItem[] = [
  { label: "Recall", href: "/dashboard/recall", icon: Brain },
  { label: "Notebook", href: "/dashboard/notebook", icon: BookMarked },
  { label: "Saved for later", href: "/dashboard/later", icon: Bookmark },
  { label: "Weekly review", href: "/dashboard/review", icon: CalendarRange },
  { label: "Your college", href: "/dashboard/college", icon: GraduationCap },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function isActive(href: string, pathname: string | null, match: string[] = []) {
  if (pathname === null) return false;
  const hit = (h: string) =>
    h === "/dashboard" ? pathname === h : pathname === h || pathname.startsWith(`${h}/`);
  return hit(href) || match.some(hit);
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
  badges?: Record<string, number | string>;
  footer?: ReactNode;
  user?: ReactNode;
  next?: ContinueTarget | null;
}) {
  return <SidebarView pathname={usePathname()} {...props} />;
}

/** The one ember action: whatever comes next (a due revision, then the next item on Today). */
function ContinueButton({ next, collapsed }: { next: ContinueTarget; collapsed: boolean }) {
  const content = collapsed ? (
    <Play size={16} fill="currentColor" aria-hidden="true" />
  ) : (
    <>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(42,18,5,.14)]">
        <Play size={12} fill="currentColor" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left leading-tight">
        <span className="block text-[13.5px] font-[650]">{next.label}</span>
        <span className="block truncate text-[12px] font-[550] opacity-75">{next.detail}</span>
      </span>
      <ArrowRight size={15} aria-hidden="true" data-nudge="arrow" className="shrink-0" />
    </>
  );
  const cls = cn(
    "gloss group/btn flex items-center gap-2.5 rounded-[16px] transition-[transform,filter] duration-[var(--dur-base)] hover:-translate-y-px hover:brightness-105 active:scale-[.98]",
    "[&_[data-nudge=arrow]]:transition-transform hover:[&_[data-nudge=arrow]]:translate-x-[3px]",
    collapsed ? "mx-auto size-11 justify-center rounded-full" : "w-full px-2.5 py-2",
  );
  const link = next.external ? (
    <a
      href={next.href}
      target="_blank"
      rel="noreferrer"
      className={cls}
      aria-label={collapsed ? `${next.label}: ${next.detail}` : undefined}
    >
      {content}
    </a>
  ) : (
    <Link
      href={next.href}
      className={cls}
      aria-label={collapsed ? `${next.label}: ${next.detail}` : undefined}
    >
      {content}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={`${next.label}: ${next.detail}`} side="right" className="block">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/** Sidebar for a given path; with null nothing is highlighted (the Suspense fallback). */
export function SidebarView({
  pathname,
  badges = {},
  footer,
  user,
  next,
}: {
  pathname: string | null;
  badges?: Record<string, number | string>;
  footer?: ReactNode;
  /** User card pinned to the bottom; hide its text with group-data-[collapsed]/side. */
  user?: ReactNode;
  next?: ContinueTarget | null;
}) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "group/side sticky top-0 hidden h-dvh shrink-0 p-3 pr-0 lg:block",
        "transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-in-out)]",
        collapsed ? "w-[88px]" : "w-[260px]",
      )}
    >
      <div className="surface-card flex h-full flex-col gap-1 overflow-y-auto rounded-[24px] px-3 py-4">
        <div
          className={cn(
            "flex items-center pb-3",
            collapsed ? "justify-center" : "justify-between pl-2",
          )}
        >
          <Link
            href="/dashboard"
            aria-label="DsaKaro home"
            className="rounded-md transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)] hover:scale-105"
          >
            {collapsed ? <LogoMark /> : <Logo />}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors duration-[var(--dur-base)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-ink"
            >
              <PanelLeftClose size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
        {collapsed && (
          <Tooltip content="Expand sidebar" side="right" className="mb-1 self-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors duration-[var(--dur-base)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-ink"
            >
              <PanelLeftOpen size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </Tooltip>
        )}
        {next && <ContinueButton next={next} collapsed={collapsed} />}
        {!collapsed && (
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Search problems, pages and commands (Ctrl K)"
            className="glass-control mt-2 flex h-10 w-full items-center gap-2 rounded-full px-3.5 text-left text-[13.5px] text-ink-3 transition-colors hover:text-ink-2"
          >
            <Search size={15} aria-hidden="true" />
            <span className="flex-1 truncate">Search</span>
            <span className="rounded-full px-1.5 font-mono text-[10.5px] shadow-[inset_0_0_0_1px_var(--line-2)]">
              Ctrl K
            </span>
          </button>
        )}
        <Group
          label="Practice"
          items={MENU}
          pathname={pathname}
          badges={badges}
          collapsed={collapsed}
        />
        <Group
          label="Track"
          items={TOOLKIT}
          pathname={pathname}
          badges={badges}
          collapsed={collapsed}
        />
        <Group
          label="Together"
          items={SOCIAL}
          pathname={pathname}
          badges={badges}
          collapsed={collapsed}
        />
        <div className="mt-auto flex flex-col gap-3 pt-4">
          {/* The running study session docks here (rendered by the study bar). */}
          {!collapsed && <div id="sidebar-live" className="empty:hidden" />}
          {footer && !collapsed && footer}
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">{user}</div>
            {!collapsed && <ThemeToggle />}
          </div>
        </div>
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
  badges: Record<string, number | string>;
  collapsed: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "px-3 pt-5 pb-2 text-[11.5px] font-[600] tracking-[0.06em] text-ink-3",
          collapsed && "sr-only",
        )}
      >
        {label}
      </div>
      <nav className="flex flex-col gap-1" aria-label={label}>
        {items.map(({ label, icon: Icon, href, match }) => {
          const active = isActive(href, pathname, match);
          const badge = badges[href];
          const link = (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              className={cn(
                "group/nav relative flex h-10 items-center gap-3 rounded-[12px] px-3 text-[14px] transition-colors duration-[var(--dur-base)]",
                collapsed && "justify-center px-0",
                active
                  ? "font-[600] text-ink"
                  : "text-ink-2 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-ink",
              )}
            >
              {active && (
                // One element with a shared layoutId: it slides from item to item.
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-[12px] bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] shadow-[inset_0_0_0_1px_var(--line),var(--highlight)]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-[11px] bottom-[11px] left-0 w-[3px] rounded-[3px] bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_70%,transparent)]"
                  />
                </motion.span>
              )}
              <Icon
                size={17}
                strokeWidth={1.75}
                aria-hidden="true"
                className={cn(
                  "shrink-0 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover/nav:scale-110",
                  active && "text-primary",
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {typeof badge === "string" ? (
                !collapsed && (
                  <span
                    className={cn(
                      "tnum ml-auto rounded-full px-2 font-mono text-[11px] leading-[20px] font-[600]",
                      badge.endsWith("live")
                        ? "bg-mint-soft text-signal-text"
                        : "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] text-ink-2",
                    )}
                  >
                    {badge}
                  </span>
                )
              ) : badge ? (
                <span
                  aria-label={`${badge} due`}
                  className={cn(
                    "tnum min-w-[20px] rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-1.5 text-center font-mono text-[11px] leading-[20px] font-semibold text-ink",
                    collapsed
                      ? "absolute top-0 right-2 h-[18px] min-w-[18px] leading-[18px]"
                      : "ml-auto",
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
 * Floating glass dock for phones and tablets (the sidebar shows from 1024 px): Today,
 * Revision, the ember Continue button in the centre, Sheets, and More.
 */
export function MobileNav({
  badges = {},
  next,
}: {
  badges?: Record<string, number>;
  next?: ContinueTarget | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const left = MENU.slice(0, 2);
  const right = MENU.slice(2, 3);
  const more = [
    ...MENU.slice(3),
    ...TOOLKIT,
    ...SOCIAL,
    ...ACCOUNT.filter((a) => a.label === "Settings"),
  ];
  const moreActive = more.some((m) => isActive(m.href, pathname, m.match));
  const tabClass = (active: boolean) =>
    cn(
      "relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10.5px] font-[600] transition-[color,transform] duration-[var(--dur-base)] active:scale-90",
      active ? "text-ink" : "text-ink-3",
    );
  const pill = (id: string) => (
    <motion.span
      layoutId={id}
      // A springy blob that slides (and stretches a little) between tabs.
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.8 }}
      className="absolute inset-0 -z-10 rounded-full bg-[color-mix(in_srgb,var(--signal-mark)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal-mark)_30%,transparent)]"
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

  const tab = ({ label, href, icon: Icon, match }: NavItem) => {
    const active = isActive(href, pathname, match) && !moreOpen;
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
          className={cn(active && "text-primary")}
        />
        <span className="truncate">{label}</span>
        {badges[href] ? (
          <span
            className="absolute top-1.5 right-[24%] size-2 rounded-full bg-primary"
            aria-label={`${badges[href]} due`}
          />
        ) : null}
      </Link>
    );
  };

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
          className="glass-overlay fixed inset-x-2 bottom-2 z-50 animate-[sheet-up_var(--dur-slow)_var(--ease-spring)] touch-none rounded-[28px] px-3 pt-2 pb-[96px] lg:hidden"
        >
          <span
            aria-hidden="true"
            className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line-3"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {more.map(({ label, href, icon: Icon, match }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(href, pathname, match) ? "page" : undefined}
                className={cn(
                  sheetItem,
                  isActive(href, pathname, match)
                    ? "bg-[color-mix(in_srgb,var(--ink)_9%,transparent)] text-ink"
                    : "text-ink-2 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]",
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
              className={cn(
                sheetItem,
                "text-ink-2 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]",
              )}
            >
              <MessageSquarePlus size={19} strokeWidth={1.75} aria-hidden="true" />
              Feedback
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                sheetItem,
                "text-ink-2 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]",
              )}
            >
              <Moon size={19} strokeWidth={1.75} aria-hidden="true" />
              Theme
            </button>
          </div>
        </div>
      )}
      <nav
        aria-label="Main"
        className="glass-chrome fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 flex items-center justify-around gap-1 rounded-full px-1.5 py-1.5 lg:hidden"
      >
        {left.map(tab)}
        {next ? (
          next.external ? (
            <a
              href={next.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${next.label}: ${next.detail}`}
              className="gloss grid size-12 shrink-0 place-items-center rounded-full active:scale-90"
            >
              <Play size={18} fill="currentColor" aria-hidden="true" />
            </a>
          ) : (
            <Link
              href={next.href}
              aria-label={`${next.label}: ${next.detail}`}
              className="gloss grid size-12 shrink-0 place-items-center rounded-full active:scale-90"
            >
              <Play size={18} fill="currentColor" aria-hidden="true" />
            </Link>
          )
        ) : null}
        {right.map(tab)}
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

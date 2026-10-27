"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Moon, Settings, UserRound } from "lucide-react";
import { THEME_STORAGE_KEY, cn } from "@upsolve/ui";

export type AvatarUser = {
  label: string;
  email: string | null;
  avatarUrl: string | null;
  handle: string | null;
  initials: string;
  canSignOut: boolean;
};

export function Avatar({ user, size = 36 }: { user: AvatarUser; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--violet),var(--ember))] text-13 font-[600] text-white"
      style={{ width: size, height: size }}
    >
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
        user.initials
      )}
    </span>
  );
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

/** Avatar button with a springy menu: profile, settings, theme, sign out. */
export function AvatarMenu({ user }: { user: AvatarUser }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const signOut = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item =
    "flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-13 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full p-0.5 pr-0.5 transition-[box-shadow] hover:shadow-[0_0_0_3px_var(--line-2)] xl:pr-3"
      >
        <Avatar user={user} />
        <span className="hidden min-w-0 text-left leading-tight xl:block">
          <span className="block max-w-[160px] truncate text-13 font-[600]">{user.label}</span>
          {user.handle && (
            <span className="block max-w-[160px] truncate text-11 text-ink-3">@{user.handle}</span>
          )}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="glass absolute top-full right-0 z-50 mt-2 w-60 origin-top-right animate-[pop-open_var(--dur-base)_var(--ease-spring)] rounded-[16px] border border-line-2 p-1.5 shadow-e3"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-2.5 pt-1.5 pb-3">
            <Avatar user={user} size={34} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-13 font-[600]">{user.label}</span>
              {user.email && (
                <span className="block truncate text-11 text-ink-3">{user.email}</span>
              )}
            </span>
          </div>
          <div className="pt-1.5">
            {user.handle && (
              <Link
                role="menuitem"
                href={`/u/${user.handle}`}
                className={item}
                onClick={() => setOpen(false)}
              >
                <UserRound size={15} aria-hidden="true" /> Public profile
              </Link>
            )}
            <Link
              role="menuitem"
              href="/dashboard/settings"
              className={item}
              onClick={() => setOpen(false)}
            >
              <Settings size={15} aria-hidden="true" /> Settings
            </Link>
            <button type="button" role="menuitem" className={item} onClick={toggleTheme}>
              <Moon size={15} aria-hidden="true" /> Toggle light / dark
            </button>
            {user.canSignOut && (
              <>
                <form ref={signOut} action="/auth/signout" method="post" hidden />
                <button
                  type="button"
                  role="menuitem"
                  className={cn(item, "hover:text-bad")}
                  onClick={() => signOut.current?.requestSubmit()}
                >
                  <LogOut size={15} aria-hidden="true" /> Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

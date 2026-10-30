"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ArrowLeft } from "lucide-react";

// Next's client navigations don't update document.referrer, so the dashboard
// layout records the previous in-app page here for BackLink to use.
const KEY = "upsolve:nav";
type Nav = { prev: string | null; current: string };

function readNav(): Nav | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Nav | null;
  } catch {
    return null;
  }
}

/** Remembers the previous page within this tab. Render once, inside <Suspense>. */
export function NavHistory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const here = search ? `${pathname}?${search}` : pathname;
    const nav = readNav();
    if (nav?.current === here) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ prev: nav?.current ?? null, current: here }));
    } catch {
      // Storage blocked: BackLink falls back to its default link.
    }
  }, [pathname, search]);
  return null;
}

const noSubscribe = () => () => {};

/** Where this page was opened from, within the app (null if opened directly). */
function previousPage(): string | null {
  // If NavHistory already recorded this page, `prev` is where we came from;
  // if it hasn't yet, the page it last recorded is.
  const here = window.location.pathname + window.location.search;
  const nav = readNav();
  const from = nav?.current === here ? nav.prev : (nav?.current ?? null);
  return from && from !== here ? from : null;
}

const LABELS: [RegExp, string][] = [
  [/^\/dashboard\/sheets\/[^/?]+/, "Back to the sheet"],
  [/^\/dashboard\/sheets/, "Sheets"],
  [/^\/dashboard\/revision/, "Revision"],
  [/^\/dashboard\/search/, "Search results"],
  [/^\/dashboard\/analytics/, "Analytics"],
  [/^\/dashboard\/sessions/, "Sessions"],
  [/^\/dashboard\/problems\//, "Previous problem"],
  [/^\/dashboard\/groups/, "Group"],
  [/^\/dashboard\/?(\?|$)/, "Overview"],
];

/**
 * "Back" to wherever you came from inside the app (a sheet, search, the
 * overview…). Opened directly, it links to `fallback` instead.
 */
export function BackLink({ fallback, fallbackLabel }: { fallback: string; fallbackLabel: string }) {
  const router = useRouter();
  // Server render: no history yet, so the fallback link shows until hydration.
  const prev = useSyncExternalStore(noSubscribe, previousPage, () => null);

  const className =
    "inline-flex items-center gap-1.5 self-start font-mono text-[11.5px] text-ink-3 hover:text-ink";
  if (prev) {
    const label = LABELS.find(([re]) => re.test(prev))?.[1] ?? "Back";
    return (
      <button type="button" onClick={() => router.back()} className={className}>
        <ArrowLeft size={13} aria-hidden="true" /> {label}
      </button>
    );
  }
  return (
    <Link href={fallback} className={className}>
      <ArrowLeft size={13} aria-hidden="true" /> {fallbackLabel}
    </Link>
  );
}

// DsaKaro

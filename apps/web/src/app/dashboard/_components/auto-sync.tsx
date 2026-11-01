"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LiveDot } from "@upsolve/ui";
import { syncStaleAccounts } from "@/app/actions/platforms";

/**
 * Refreshes platform data older than 20 minutes when the dashboard opens, and again when you
 * come back to the tab (the server skips accounts synced recently). Then re-renders with
 * the new numbers.
 */
export function AutoSync({ stale }: { stale: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const lastRun = useRef(0);

  useEffect(() => {
    const run = (show: boolean) => {
      if (Date.now() - lastRun.current < 5 * 60_000) return;
      lastRun.current = Date.now();
      if (show) setRunning(true);
      syncStaleAccounts()
        .then((r) => {
          if (r.synced > 0) router.refresh();
        })
        .catch(() => {})
        .finally(() => setRunning(false));
    };
    const first = stale ? window.setTimeout(() => run(true), 0) : 0;
    const onVisible = () => {
      if (document.visibilityState === "visible") run(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [stale, router]);

  if (!running) return null;
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-2"
    >
      <LiveDot /> Syncing your platforms…
    </span>
  );
}

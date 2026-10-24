"use client";

import { useEffect, useRef, useState } from "react";
import { LiveDot } from "@upsolve/ui";
import { syncStaleAccounts } from "@/app/actions/platforms";

/**
 * Refreshes platform data older than 6 hours once per dashboard visit.
 * The server action invalidates the cache, so the page re-renders with new numbers.
 */
export function AutoSync({ stale }: { stale: boolean }) {
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!stale || started.current) return;
    started.current = true;
    setRunning(true);
    syncStaleAccounts()
      .catch(() => {})
      .finally(() => setRunning(false));
  }, [stale]);

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

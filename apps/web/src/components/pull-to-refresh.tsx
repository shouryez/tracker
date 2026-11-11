"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { syncStaleAccounts } from "@/app/actions/platforms";
import { feel } from "@/lib/feel";

const PULL = 80;

/**
 * Pull to refresh on phones (FRONTEND-PLAN §7.7): at the top of the page, pull down and
 * release to sync your platforms and reload the numbers. Replaces the browser's own
 * pull-to-reload here (which would reload the whole app).
 */
export function PullToRefresh() {
  const router = useRouter();
  const [dy, setDy] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const root = document.documentElement;
    const prev = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";
    const onStart = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0]!.clientY : null;
      armed.current = false;
      setDragging(start.current !== null);
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const d = Math.max(0, (e.touches[0]!.clientY - start.current) * 0.5);
      if (d > PULL && !armed.current) {
        armed.current = true;
        feel.tick();
      }
      setDy(Math.min(d, PULL * 1.4));
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      setDragging(false);
      if (armed.current) {
        setBusy(true);
        setDy(PULL * 0.6);
        syncStaleAccounts()
          .catch(() => null)
          .finally(() => {
            router.refresh();
            feel.success();
            setBusy(false);
            setDy(0);
          });
      } else setDy(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      root.style.overscrollBehaviorY = prev;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  if (dy === 0 && !busy) return null;
  const p = Math.min(1, dy / PULL);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-0 left-1/2 z-50 -translate-x-1/2"
      style={{
        transform: `translate(-50%, ${dy - 44}px)`,
        transition: dragging ? "none" : "transform 300ms ease",
      }}
    >
      <span className="glass-chrome flex items-center gap-2 rounded-full px-3.5 py-2 text-12 font-[600]">
        <RefreshCw
          size={14}
          aria-hidden="true"
          className={busy ? "animate-spin text-signal-text" : "text-ink-2"}
          style={busy ? undefined : { transform: `rotate(${p * 270}deg)` }}
        />
        {busy ? "Syncing…" : p >= 1 ? "Release to sync" : "Pull to sync"}
      </span>
    </div>
  );
}

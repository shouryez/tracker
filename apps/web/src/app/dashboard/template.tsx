import type { ReactNode } from "react";

/** Re-mounts on every dashboard navigation: a quick fade + 6px rise (≤220 ms, never blocks). */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page">{children}</div>;
}

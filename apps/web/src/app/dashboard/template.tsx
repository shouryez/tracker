import type { ReactNode } from "react";

// Pixel dissolve: a 12×6 grid of squares over the incoming page, each fading out on a
// fixed scatter (deterministic, so server and client agree). ≤ 320 ms, never blocks
// clicks, hidden under reduced motion. The sidebar lives outside this template.
const COLS = 12;
const ROWS = 6;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => ((i * 37) % 23) * 6);

/** Re-mounts on every dashboard navigation: content fades + rises 8px under a pixel dissolve. */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="animate-page">{children}</div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 grid h-[min(100%,100vh)] motion-reduce:hidden"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {CELLS.map((delay, i) => (
          <span
            key={i}
            className="animate-[pixel-out_220ms_var(--ease-out)_both] bg-bg-2"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// DsaKaro

import type { CSSProperties } from "react";
import { cn } from "@upsolve/ui";

/** Accent colour (one of the four theme accents) + monogram per curated sheet (falls back to sky + initials). */
export const SHEET_IDENTITY: Record<string, { color: string; mono: string }> = {
  "striver-a2z": { color: "#9db5e8", mono: "A2Z" },
  "striver-sde": { color: "#e2c27d", mono: "SDE" },
  "neetcode-150": { color: "#86d9c2", mono: "150" },
  "blind-75": { color: "#e58a8f", mono: "B75" },
  "grind-75": { color: "#f0884f", mono: "G75" },
};

export function sheetIdentity(slug: string, name: string) {
  return (
    SHEET_IDENTITY[slug] ?? {
      color: "#9db5e8",
      mono: name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 3)
        .toUpperCase(),
    }
  );
}

/**
 * Sheet cover: a pixel pattern in the sheet's colour, denser toward one corner, with the
 * monogram tile. Deterministic so server and client agree.
 */
export function SheetCover({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const { color, mono } = sheetIdentity(slug, name);
  const seed = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 6 * 16 }, (_, i) => {
    const x = i % 16;
    const y = Math.floor(i / 16);
    const v = ((i * 7919 + seed * 31) % 97) / 97;
    const density = (x / 16) * 0.75 + (1 - y / 6) * 0.25;
    return v < density * 0.7 ? (v < density * 0.22 ? 2 : 1) : 0;
  });
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      style={{ "--sheet": color } as CSSProperties}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,color-mix(in_srgb,var(--sheet)_28%,transparent),transparent_60%)]" />
      <div className="absolute inset-y-2 right-2 grid w-[62%] grid-cols-16 grid-rows-6 gap-[3px]">
        {cells.map((c, i) => (
          <i
            key={i}
            className="rounded-[2px]"
            style={{
              background:
                c === 2
                  ? "var(--sheet)"
                  : c === 1
                    ? "color-mix(in srgb, var(--sheet) 35%, transparent)"
                    : "transparent",
              boxShadow: c === 2 ? "0 0 6px -1px var(--sheet)" : undefined,
            }}
          />
        ))}
      </div>
      <span className="absolute top-3 left-3 grid h-9 min-w-9 place-items-center rounded-[11px] border border-[color-mix(in_srgb,var(--sheet)_40%,transparent)] bg-[color-mix(in_srgb,var(--sheet)_16%,transparent)] px-1.5 font-mono text-12 font-[700] text-[var(--sheet)]">
        {mono}
      </span>
    </div>
  );
}

/**
 * A sheet drawn as a book: deep cover in the sheet's colour, a spine line, faint
 * cloth hatching, the title set large and a progress line along the bottom.
 * Stays dark in both themes, like a real book on a desk.
 */
export function BookCover({
  slug,
  name,
  author,
  done,
  total,
  main,
  className,
}: {
  slug: string;
  name: string;
  author?: string | null;
  done: number;
  total: number;
  main?: boolean;
  className?: string;
}) {
  const { color } = sheetIdentity(slug, name);
  const words = name.replace(/'s\b/, "").split(/\s+/);
  const pct = Math.min(100, (done / Math.max(1, total)) * 100);
  return (
    <div
      className={cn(
        "@container relative isolate flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-[14px] p-3.5 text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_18px_30px_-18px_rgba(0,0,0,.7)]",
        "transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/book:-translate-y-1.5",
        className,
      )}
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 34%, #0c0d10), color-mix(in srgb, ${color} 12%, #07080a) 70%)`,
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-2.5 w-px bg-white/20" />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.035)_0_2px,transparent_2px_9px)]"
      />
      <div className="flex items-center justify-between gap-2 pl-2">
        <span className="truncate font-mono text-[10px] tracking-[.1em] uppercase opacity-80">
          {author ?? "sheet"}
        </span>
        {main && (
          <span className="rounded-full bg-white/90 px-1.5 py-px text-[10px] font-[650] text-[#111]">
            Main
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 pl-2">
        <span className="text-[clamp(13px,14cqw,26px)] leading-[.95] font-[680] tracking-[-0.03em]">
          {words.slice(0, 2).join(" ")}
          {words.length > 2 && (
            <>
              <br />
              {words.slice(2).join(" ")}
            </>
          )}
        </span>
        <span className="relative h-[3px] overflow-hidden rounded-[2px] bg-white/20">
          <span
            className="absolute inset-y-0 left-0 rounded-[2px]"
            style={{ width: `${pct}%`, background: color }}
          />
        </span>
        <span className="font-mono text-[11px] opacity-85">{total} problems</span>
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";
import { cn } from "@upsolve/ui";

/** Accent colour (one of the four theme accents) + monogram per curated sheet (falls back to sky + initials). */
export const SHEET_IDENTITY: Record<string, { color: string; mono: string }> = {
  "striver-a2z": { color: "#7cb7ff", mono: "A2Z" },
  "striver-sde": { color: "#f5b94d", mono: "SDE" },
  "neetcode-150": { color: "#bfe85a", mono: "150" },
  "blind-75": { color: "#f26d82", mono: "B75" },
  "grind-75": { color: "#7cb7ff", mono: "G75" },
};

export function sheetIdentity(slug: string, name: string) {
  return (
    SHEET_IDENTITY[slug] ?? {
      color: "#7cb7ff",
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

// DsaKaro

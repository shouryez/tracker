import type { CSSProperties, ReactNode } from "react";

// Small marks for the places a problem lives. Simple shapes in each site's
// colour (not their logos), always paired with a text label for screen readers.

type Props = { className?: string };

export function YouTubeMark({ className }: Props) {
  return (
    <svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true" className={className}>
      <rect width="20" height="14" rx="4" fill="#ff0033" />
      <path d="M8 4.2v5.6L12.8 7z" fill="#fff" />
    </svg>
  );
}

/** LeetCode: a chevron and bar in its amber. */
export function LeetCodeMark({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" className={className}>
      <path
        d="M9.5 2.5 4.2 7.8a1 1 0 0 0 0 1.4l3.6 3.6"
        fill="none"
        stroke="#ffa116"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M7.5 8.5h5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A two-letter tag for sites without a simple shape (GFG, TUF, NeetCode). */
export function LetterMark({
  text,
  className,
  color,
}: {
  text: string;
  className?: string;
  color: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid h-[15px] min-w-[15px] place-items-center rounded-[4px] px-[3px] font-mono text-[8.5px] leading-none font-bold tracking-[-0.02em] text-white ${className ?? ""}`}
      style={{ background: color }}
    >
      {text}
    </span>
  );
}

/** "https://youtu.be/ID?t=485" or "…watch?v=ID&t=485s" → { id, start }. */
export function parseYouTube(url: string): { id: string; start: number } | null {
  try {
    const u = new URL(url);
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : (u.searchParams.get("v") ??
          (u.pathname.startsWith("/embed/") ? u.pathname.slice(7) : null));
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const t = u.searchParams.get("t") ?? u.searchParams.get("start") ?? "0";
    return { id, start: Number.parseInt(t, 10) || 0 };
  } catch {
    return null;
  }
}

export type PlatformId =
  | "leetcode"
  | "gfg"
  | "codeforces"
  | "tuf"
  | "neetcode"
  | "youtube"
  | "article"
  | "codechef"
  | "atcoder";

/** Brand colour per platform, used on hover and for accents. */
export const PLATFORM_COLOR: Record<PlatformId, string> = {
  leetcode: "#ffa116",
  gfg: "#2f8d46",
  codeforces: "#1f8acb",
  tuf: "#e8491d",
  neetcode: "#3b82f6",
  youtube: "#ff0033",
  article: "#a48bff",
  codechef: "#8d6e63",
  atcoder: "#9a9a9a",
};

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  leetcode: "LeetCode",
  gfg: "GeeksforGeeks",
  codeforces: "Codeforces",
  tuf: "takeUforward",
  neetcode: "NeetCode",
  youtube: "YouTube",
  article: "Article",
  codechef: "CodeChef",
  atcoder: "AtCoder",
};

/**
 * Monochrome platform mark (currentColor) that takes its brand colour when a parent with
 * `group` is hovered, or always with `brand`. Simple shapes, not the companies' logos.
 */
export function PlatformMark({
  site,
  size = 16,
  brand,
  className,
}: {
  site: PlatformId;
  size?: number;
  brand?: boolean;
  className?: string;
}) {
  const glyph: Record<PlatformId, ReactNode> = {
    leetcode: (
      <>
        <path d="M9.5 2.5 4.2 7.8a1 1 0 0 0 0 1.4l3.6 3.6" strokeWidth="2" />
        <path d="M7.5 8.5h5.5" strokeWidth="2" />
      </>
    ),
    gfg: (
      <path
        d="M2 8h12M5.5 4.5A3.5 3.5 0 1 0 5.5 11.5M10.5 4.5a3.5 3.5 0 1 1 0 7"
        strokeWidth="1.7"
      />
    ),
    codeforces: (
      <>
        <rect x="2" y="7" width="3" height="7" rx="1" fill="currentColor" stroke="none" />
        <rect x="6.5" y="2" width="3" height="12" rx="1" fill="currentColor" stroke="none" />
        <rect x="11" y="5" width="3" height="9" rx="1" fill="currentColor" stroke="none" />
      </>
    ),
    tuf: <path d="M3 4h10M8 4v9M5 13h6" strokeWidth="2" />,
    neetcode: <path d="M3 13V3l10 10V3" strokeWidth="2" />,
    youtube: (
      <>
        <rect x="1.5" y="3.5" width="13" height="9" rx="2.5" strokeWidth="1.6" />
        <path d="M7 6v4l3.2-2Z" fill="currentColor" stroke="none" />
      </>
    ),
    article: <path d="M4 2.5h5.5L12 5v8.5H4ZM6 8h4M6 10.5h4" strokeWidth="1.6" />,
    codechef: (
      <path
        d="M4 12.5h8M5 12.5 4 6.5a2.5 2.5 0 0 1 2-3 2.5 2.5 0 0 1 4 0 2.5 2.5 0 0 1 2 3l-1 6"
        strokeWidth="1.6"
      />
    ),
    atcoder: <path d="M8 2.5 3 13.5M8 2.5l5 11M5 10h6" strokeWidth="1.7" />,
  };
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-colors duration-[var(--dur-fast)] group-hover:text-[var(--brand)] ${brand ? "text-[var(--brand)]" : ""} ${className ?? ""}`}
      style={{ "--brand": PLATFORM_COLOR[site] } as CSSProperties}
    >
      {glyph[site]}
    </svg>
  );
}

/** Maps a stored platform id to its mark, when we have one. */
export function platformMarkId(platform: string): PlatformId | null {
  if (platform === "geeksforgeeks") return "gfg";
  return platform in PLATFORM_COLOR ? (platform as PlatformId) : null;
}

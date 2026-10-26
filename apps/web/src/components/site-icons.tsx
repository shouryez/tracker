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

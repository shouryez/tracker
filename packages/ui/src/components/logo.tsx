import { BRAND, MARK, WORDMARK, markCells } from "../brand";
import { cn } from "../cn";

/**
 * The mark, "Accepted grid": a 5×5 practice grid whose lit squares draw a tick, under the
 * headline bar. The bar follows the text colour; the tick and the bar's fill use
 * --signal-mark (mint on dark, deep mint on light); unlit squares are a faint text tint.
 * `size` is the height; the width follows.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  const b = MARK.bar;
  return (
    <svg
      height={size}
      width={Math.round((size * MARK.width) / MARK.height)}
      viewBox={MARK.viewBox}
      role="img"
      aria-label={BRAND.label}
      className={cn("inline-block shrink-0", className)}
    >
      <rect {...b} fill="currentColor" />
      <rect {...b} width={b.width * MARK.fill} fill="var(--signal-mark)" />
      {markCells().map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x}
          y={c.y}
          width={MARK.cell}
          height={MARK.cell}
          rx={MARK.radius}
          fill={c.on ? "var(--signal-mark)" : "color-mix(in srgb, currentColor 20%, transparent)"}
        />
      ))}
    </svg>
  );
}

/**
 * The DSA करो lockup: the grid mark beside the wordmark. One headline bar runs across the
 * name, "DSA" hangs from it like the Devanagari does, and it fills with mint from the left
 * like progress. `height` is the wordmark's height; pass `mark={false}` for the name alone.
 */
export function Logo({
  height = 22,
  mark = true,
  className,
}: {
  height?: number;
  mark?: boolean;
  className?: string;
}) {
  const { bar } = WORDMARK;
  const word = (
    <svg
      height={height}
      width={Math.round((height * WORDMARK.width) / WORDMARK.height)}
      viewBox={WORDMARK.viewBox}
      role={mark ? undefined : "img"}
      aria-label={mark ? undefined : BRAND.label}
      aria-hidden={mark || undefined}
      className="inline-block shrink-0"
    >
      <path d={WORDMARK.dsa} fill="currentColor" />
      <path d={WORDMARK.karo} fill="currentColor" />
      <rect {...bar} fill="currentColor" />
      <rect {...bar} width={bar.width * WORDMARK.fill} fill="var(--signal-mark)" />
    </svg>
  );
  if (!mark) return <span className={cn("inline-flex shrink-0", className)}>{word}</span>;
  return (
    <span
      role="img"
      aria-label={BRAND.label}
      className={cn("inline-flex shrink-0 items-center", className)}
      style={{ gap: Math.round(height * 0.42) }}
    >
      {/* Sized so the mark's grid matches the letters' cap height and the bars line up. */}
      <span aria-hidden="true" className="inline-flex">
        <LogoMark size={Math.round(height * 1.3)} />
      </span>
      {word}
    </span>
  );
}

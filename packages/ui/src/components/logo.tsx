import { BRAND, MARK, WORDMARK } from "../brand";
import { cn } from "../cn";

/**
 * "क" hanging from a lime headline (the Devanagari shirorekha). Ink follows the text colour;
 * the bar uses --signal-mark, lime on dark and olive on light.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK.viewBox}
      role="img"
      aria-label={BRAND.label}
      className={className}
    >
      <path d={MARK.ka} fill="currentColor" />
      <rect {...MARK.bar} rx="3" fill="var(--signal-mark)" />
    </svg>
  );
}

/**
 * The DSA करो wordmark: one headline bar runs across the whole name, "DSA" hangs from it like
 * the Devanagari does, and it fills with lime from the left like progress.
 */
export function Logo({ height = 22, className }: { height?: number; className?: string }) {
  const { bar } = WORDMARK;
  return (
    <svg
      height={height}
      width={Math.round((height * WORDMARK.width) / WORDMARK.height)}
      viewBox={WORDMARK.viewBox}
      role="img"
      aria-label={BRAND.label}
      className={cn("inline-block shrink-0", className)}
    >
      <path d={WORDMARK.dsa} fill="currentColor" />
      <path d={WORDMARK.karo} fill="currentColor" />
      <rect {...bar} fill="currentColor" />
      <rect {...bar} width={bar.width * WORDMARK.fill} fill="var(--signal-mark)" />
    </svg>
  );
}

// DsaKaro

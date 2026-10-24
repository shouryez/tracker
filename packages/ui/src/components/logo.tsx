import { cn } from "../cn";

/** Three pixels climbing a staircase; the top one is always lime. */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className={className}>
      <rect x="0" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity=".35" />
      <rect x="7.5" y="7" width="7" height="7" rx="1.5" fill="currentColor" opacity=".7" />
      <rect x="15" y="0" width="7" height="7" rx="1.5" fill="var(--signal)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[9px] text-[17px] font-[650] tracking-[-0.03em]",
        className,
      )}
    >
      <LogoMark />
      upsolve
    </span>
  );
}

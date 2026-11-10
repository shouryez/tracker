import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type CardTier = "standard" | "hero" | "inset";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** hero = one per page (gradient + beam + grain); inset = recessed, for nested content. */
  tier?: CardTier;
  /** Clickable card: lifts 4px, brightens its border and deepens its shadow on hover. */
  interactive?: boolean;
  /** Light that follows the cursor and brightens the nearest border (needs <SpotlightTracker />). */
  spotlight?: boolean;
  /** Animated light travelling around the border. Use on the one hero element per view. */
  beam?: boolean;
  /** Tints the corner glow with a data colour, e.g. "var(--easy)". */
  glow?: string;
};

const tiers: Record<CardTier, string> = {
  standard: "surface-card",
  hero: "surface-hero",
  inset: "surface-inset",
};

export function cardClasses({
  tier = "standard",
  interactive,
  spotlight,
  beam,
  padded = true,
}: {
  tier?: CardTier;
  interactive?: boolean;
  spotlight?: boolean;
  beam?: boolean;
  padded?: boolean;
} = {}) {
  return cn(
    // A card holding an open dropdown/popover rises above its neighbours.
    "group/card relative isolate rounded-lg has-[[aria-expanded=true]]:z-30",
    padded && "p-[18px]",
    tiers[tier],
    "transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]",
    interactive && "hover:-translate-y-1 hover:border-line-2 hover:shadow-e2",
    (spotlight || beam) && "overflow-hidden",
    spotlight &&
      // Fill light + a border ring lit only near the cursor (masked to the 1px edge).
      "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-[var(--dur-slow)] hover:before:opacity-100 " +
        "before:bg-[radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,0%),var(--spotlight),transparent_65%)] " +
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:p-px after:opacity-0 after:transition-opacity after:duration-[var(--dur-slow)] hover:after:opacity-100 " +
        "after:bg-[radial-gradient(220px_circle_at_var(--mx,50%)_var(--my,0%),color-mix(in_srgb,var(--violet)_70%,transparent),transparent_70%)] " +
        "after:[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]",
    beam && "border-beam",
  );
}

export function Card({
  className,
  tier,
  interactive,
  spotlight,
  beam,
  glow,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-spotlight={spotlight || undefined}
      // cn() doesn't merge, so skip the default padding when the caller sets its own.
      className={cn(
        cardClasses({
          tier,
          interactive,
          spotlight,
          beam,
          padded: !/(^|\s)p-/.test(className ?? ""),
        }),
        className,
      )}
      style={glow ? ({ "--card-glow": glow, ...style } as CSSProperties) : style}
      {...props}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 -z-10 size-48 scale-[1.5] bg-[radial-gradient(closest-side,var(--card-glow),transparent)] opacity-[.14]"
        />
      )}
      {tier === "hero" && (
        <span aria-hidden="true" className="grain absolute inset-0 -z-10 rounded-[inherit]" />
      )}
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-3.5 flex items-center justify-between gap-2.5", className)} {...props} />
  );
}

/** Title with a 28px tinted icon square. `tint` is any colour (defaults to neutral). */
export function CardTitle({
  icon,
  tint,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { icon?: ReactNode; tint?: string }) {
  return (
    <h3
      className={cn("flex items-center gap-2 text-[14.5px] font-[600] tracking-[-0.01em]", className)}
      {...props}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            "grid shrink-0 place-items-center [&_svg]:size-[15px]",
            tint ? "text-[var(--tint)]" : "text-ink-3",
          )}
          style={tint ? ({ "--tint": tint } as CSSProperties) : undefined}
        >
          {icon}
        </span>
      )}
      {children}
    </h3>
  );
}

/** Muted meta line on the right of a card header. */
export function CardSub({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("tnum text-12 leading-tight text-ink-3", className)} {...props} />;
}

/**
 * Corner ↗ button for clickable cards: on card hover the arrow exits top-right and a
 * fresh one slides in from bottom-left over a filling circle. Purely decorative.
 */
export function CornerArrow({ className }: { className?: string }) {
  const arrow = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
    </svg>
  );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-line-2 text-ink-2",
        "transition-[color,border-color] duration-[var(--dur-base)] group-hover/card:border-transparent group-hover/card:text-signal-ink",
        className,
      )}
    >
      <span className="absolute inset-0 scale-0 rounded-full bg-signal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/card:scale-100" />
      <span className="relative transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/card:translate-x-4 group-hover/card:-translate-y-4">
        {arrow}
      </span>
      <span className="absolute -translate-x-4 translate-y-4 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/card:translate-0">
        {arrow}
      </span>
    </span>
  );
}

/** Big number with a smaller, dimmer unit. */
export function Stat({
  value,
  unit,
  className,
}: {
  value: ReactNode;
  unit?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("num text-[40px]", className)}>
      {value}
      {unit && (
        <small className="ml-1 text-[.5em] font-[500] tracking-[-0.01em] text-ink-3">
          {unit}
        </small>
      )}
    </div>
  );
}

// DsaKaro

import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

/**
 * signal  = the one primary CTA per view (lime, glow + sheen)
 * primary = strong neutral (ink), for secondary-but-important actions
 * indigo  = kept for older call sites; now a calm violet-tinted secondary, never a CTA
 */
export type ButtonVariant =
  | "signal"
  | "primary"
  | "indigo"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "group/btn relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-[550] tracking-[-0.005em] select-none " +
  "transition-[transform,background-color,box-shadow,border-color,color,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "active:scale-[.97] active:duration-[var(--dur-instant)] " +
  "disabled:pointer-events-none disabled:opacity-40 aria-busy:pointer-events-none " +
  // Icon nudges: arrows slide, refresh spins, plus rotates (mark the svg with data-nudge).
  "[&_[data-nudge=arrow]]:transition-transform [&_[data-nudge=arrow]]:duration-[var(--dur-base)] hover:[&_[data-nudge=arrow]]:translate-x-[3px] " +
  "[&_[data-nudge=spin]]:transition-transform [&_[data-nudge=spin]]:duration-[var(--dur-slow)] hover:[&_[data-nudge=spin]]:rotate-180 " +
  "[&_[data-nudge=plus]]:transition-transform [&_[data-nudge=plus]]:duration-[var(--dur-base)] hover:[&_[data-nudge=plus]]:rotate-90";

const sizes: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3.5 text-13",
  md: "h-[42px] px-[18px] text-14",
  lg: "h-[50px] px-6 text-15",
  icon: "size-[42px] p-0",
  "icon-sm": "size-[34px] p-0",
};

/** Solid variants lift 2px and rise to e2 on hover. */
const lift = "hover:-translate-y-0.5";

const sheen =
  "overflow-hidden before:absolute before:inset-y-0 before:-left-1/2 before:-z-10 before:w-1/3 before:-skew-x-12 before:bg-white/45 before:opacity-0 before:blur-[2px] " +
  "before:transition-[transform,opacity] before:duration-[var(--dur-slower)] hover:before:translate-x-[420%] hover:before:opacity-100";

const variants: Record<ButtonVariant, string> = {
  signal: cn(
    "bg-signal text-signal-ink shadow-[0_0_0_1px_rgba(0,0,0,.06),0_8px_24px_-12px_var(--signal)] hover:shadow-glow-signal",
    sheen,
    lift,
  ),
  primary: cn("bg-ink text-bg hover:shadow-e2", lift),
  indigo: cn(
    "border border-violet-line bg-violet-soft text-ink hover:border-violet hover:shadow-glow-violet",
    lift,
  ),
  secondary: cn(
    "border border-line-2 bg-surface-2/80 text-ink shadow-xs backdrop-blur-sm hover:border-line-3 hover:bg-surface-3 hover:shadow-e2",
    lift,
  ),
  outline: "border border-line-2 bg-transparent text-ink hover:border-ink-3 hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: cn("bg-bad text-white hover:shadow-glow-danger", lift),
  success: cn("bg-success text-[#06210f] hover:shadow-[0_8px_24px_-10px_var(--success)]", lift),
  link:
    "h-auto rounded-sm px-0 text-ink active:scale-100 " +
    "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-px " +
    "transition-[background-size,color] hover:bg-[length:100%_1px]",
};

/** Class string for anything that should look like a button (e.g. a Next `<Link>`). */
export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {},
): string {
  return cn(base, sizes[opts.size ?? "md"], variants[opts.variant ?? "primary"], opts.className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Cross-fades the label to a spinner, keeps the width, and blocks clicks. */
  loading?: boolean;
  /** Briefly shows a drawn check in place of the label (e.g. after "Saved"). */
  done?: boolean;
};

export function Button({
  variant,
  size,
  loading,
  done,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const swapped = loading || done;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      <span
        aria-hidden={!swapped}
        className={cn(
          "absolute inset-0 grid place-items-center transition-[opacity,transform] duration-[var(--dur-fast)]",
          swapped ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
      >
        {loading ? <Spinner /> : done ? <CheckDraw /> : null}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-[opacity,transform] duration-[var(--dur-fast)]",
          swapped && "scale-95 opacity-0",
        )}
      >
        {children}
      </span>
    </button>
  );
}

/** Small circular spinner in the current text colour. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      className={cn("animate-spin", className)}
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".25"
        strokeWidth="2"
      />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A check that draws itself in (stroke-dashoffset). */
export function CheckDraw({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        pathLength={100}
        strokeDasharray="100"
        className="animate-draw"
      />
    </svg>
  );
}

/** Trailing arrow that nudges right on hover of its parent button. */
export function ButtonArrow() {
  return (
    <span aria-hidden="true" data-nudge="arrow" className="inline-block">
      →
    </span>
  );
}

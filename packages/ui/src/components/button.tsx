import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

/**
 * Orbit buttons are pills.
 * signal  = the one primary action per view: glossy ember
 * primary = an emphasised glass button, for important secondary actions
 * indigo  = kept for older call sites; same as secondary
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
  "group/btn relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-[600] tracking-[-0.005em] select-none " +
  "transition-[transform,background-color,box-shadow,border-color,color,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "active:scale-[.97] active:duration-[var(--dur-instant)] " +
  "disabled:pointer-events-none disabled:opacity-40 aria-busy:pointer-events-none " +
  // Icon nudges: arrows slide, refresh spins, plus rotates (mark the svg with data-nudge).
  "[&_[data-nudge=arrow]]:transition-transform [&_[data-nudge=arrow]]:duration-[var(--dur-base)] hover:[&_[data-nudge=arrow]]:translate-x-[3px] " +
  "[&_[data-nudge=spin]]:transition-transform [&_[data-nudge=spin]]:duration-[var(--dur-slow)] hover:[&_[data-nudge=spin]]:rotate-180 " +
  "[&_[data-nudge=plus]]:transition-transform [&_[data-nudge=plus]]:duration-[var(--dur-base)] hover:[&_[data-nudge=plus]]:rotate-90";

const sizes: Record<ButtonSize, string> = {
  sm: "h-[32px] px-3.5 text-[13px]",
  md: "h-[40px] px-4 text-[14px]",
  lg: "h-[48px] px-6 text-[15px]",
  icon: "size-[40px] p-0",
  "icon-sm": "size-[32px] p-0",
};

/** Orbit buttons lift 1px on hover and press in on click. */
const lift = "hover:-translate-y-px";
const glass =
  "text-ink bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] shadow-[inset_0_0_0_1px_var(--line-2),var(--highlight)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]";

const variants: Record<ButtonVariant, string> = {
  signal: cn("gloss hover:brightness-105", lift),
  primary: cn(glass, "bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--ink)_14%,transparent)]", lift),
  indigo: cn(glass, lift),
  secondary: cn(glass, lift),
  outline: "text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--line-3)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]",
  ghost: "text-ink-2 hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-ink",
  danger: cn("bg-bad text-white hover:shadow-glow-danger", lift),
  success: cn("bg-success text-signal-ink hover:shadow-glow-signal", lift),
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

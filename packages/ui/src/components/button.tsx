import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

export type ButtonVariant =
  "signal" | "primary" | "indigo" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "group/btn relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-[550] tracking-[-0.005em] select-none " +
  "transition-[transform,background-color,box-shadow,border-color,color,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "active:scale-[.97] active:duration-[var(--dur-instant)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-40 aria-busy:pointer-events-none";

const sizes: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3.5 text-[13px]",
  md: "h-[42px] px-[18px] text-sm",
  lg: "h-[50px] px-6 text-[15px]",
  icon: "size-[42px] p-0",
  "icon-sm": "size-[34px] p-0",
};

/** Solid variants lift 1px on hover; flat ones only change colour. */
const lift = "hover:-translate-y-px";

const variants: Record<ButtonVariant, string> = {
  // The one lime CTA per screen (DESIGN.md §4.1 colour budget). A light sheen sweeps across on hover.
  signal: cn(
    "overflow-hidden bg-signal text-signal-ink hover:shadow-glow-signal",
    "before:absolute before:inset-y-0 before:-left-1/2 before:-z-10 before:w-1/3 before:-skew-x-12 before:bg-white/45 before:opacity-0 before:blur-[2px]",
    "before:transition-[transform,opacity] before:duration-[var(--dur-slower)] hover:before:translate-x-[420%] hover:before:opacity-100",
    lift,
  ),
  primary: cn("bg-ink text-bg hover:shadow-[0_0_0_4px_var(--line-2)]", lift),
  indigo: cn("bg-primary text-primary-ink hover:bg-primary-2 hover:shadow-glow", lift),
  secondary: cn(
    "border border-line-2 bg-surface-2 text-ink shadow-xs hover:border-line-3 hover:bg-surface-3",
    lift,
  ),
  outline: "border border-line-2 bg-transparent text-ink hover:border-ink-3 hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: cn("bg-bad text-white hover:shadow-[0_8px_24px_-8px_var(--bad)]", lift),
  link: "h-auto rounded-sm px-0 text-ink underline-offset-4 decoration-line-3 hover:underline active:scale-100",
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
  /** Shows a spinner, keeps the width, and blocks clicks. */
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
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

/** Trailing arrow that nudges right on hover of its parent button. */
export function ButtonArrow() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover/btn:translate-x-[3px]"
    >
      →
    </span>
  );
}

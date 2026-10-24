import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

export type ButtonVariant = "signal" | "primary" | "indigo" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const base =
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-[550] tracking-[-0.005em] " +
  "transition-[transform,background-color,box-shadow,border-color,color] duration-[240ms] ease-out active:scale-[.97] " +
  "disabled:pointer-events-none disabled:opacity-40";

const sizes: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3.5 text-[13px]",
  md: "h-[42px] px-[18px] text-sm",
};

const variants: Record<ButtonVariant, string> = {
  // The one lime CTA per screen (DESIGN.md §4.1 colour budget).
  signal:
    "bg-signal text-signal-ink hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--signal)_30%,transparent),0_10px_40px_-8px_color-mix(in_srgb,var(--signal)_60%,transparent)]",
  primary: "bg-ink text-bg hover:shadow-[0_0_0_4px_var(--line-2)]",
  indigo: "bg-primary text-primary-ink hover:bg-primary-2",
  secondary: "border border-line-2 bg-surface-2 text-ink hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
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
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}

/** Trailing arrow that nudges right on hover of its parent button. */
export function ButtonArrow() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-[240ms] ease-out group-hover/btn:translate-x-[3px]"
    >
      →
    </span>
  );
}

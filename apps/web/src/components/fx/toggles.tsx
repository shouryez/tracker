"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@upsolve/ui";

/**
 * Animated checkbox: the check draws itself and the box pops. Presentational: the caller
 * owns state and the click (so existing server actions stay where they are).
 */
export function AnimatedCheckbox({
  checked,
  className,
  size = 20,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { checked: boolean; size?: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-[6px] border transition-[background-color,border-color,box-shadow,transform] duration-[var(--dur-fast)] active:scale-90",
        checked
          ? "animate-[pop-in_var(--dur-slow)_var(--ease-spring)] border-transparent bg-success text-[#06210f] shadow-[0_0_12px_-4px_var(--success)]"
          : "border-line-3 bg-surface-2 hover:border-ink-3",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {checked && (
        <svg
          viewBox="0 0 16 16"
          width={size * 0.65}
          height={size * 0.65}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            pathLength={100}
            strokeDasharray="100"
            className="animate-draw"
          />
        </svg>
      )}
    </button>
  );
}

/** Star toggle with a pop when turned on. */
export function StarToggle({
  on,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-colors hover:bg-surface-3",
        on ? "text-medium" : "text-ink-4 hover:text-ink-2",
        className,
      )}
      {...props}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn(
          on &&
            "animate-[pop-in_var(--dur-slow)_var(--ease-spring)] drop-shadow-[0_0_6px_var(--medium)]",
        )}
      >
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
      </svg>
    </button>
  );
}

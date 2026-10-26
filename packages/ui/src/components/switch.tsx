"use client";

import { cn } from "../cn";

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name when there's no visible <label>. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
};

/** On/off switch with a springy thumb. Lime when on (DESIGN.md: lime = "yes, active"). */
export function Switch({
  checked,
  onCheckedChange,
  label,
  labelledBy,
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-[var(--dur-base)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
        checked
          ? "border-transparent bg-signal shadow-[0_0_16px_-4px_var(--signal)]"
          : "border-line-2 bg-surface-3 hover:border-line-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] left-[3px] size-[18px] rounded-full shadow-xs transition-[transform,background-color] duration-[var(--dur-slow)] ease-[var(--ease-spring)]",
          checked ? "translate-x-5 bg-signal-ink" : "translate-x-0 bg-ink-2",
        )}
      />
    </button>
  );
}

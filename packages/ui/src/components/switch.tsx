"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../cn";

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name when there's no visible <label>. */
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
};

/** On/off switch: springy thumb with a check/× inside, lime track when on. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  labelledBy,
  describedBy,
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
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-[var(--dur-base)] disabled:opacity-50",
        checked
          ? "border-transparent bg-signal shadow-[0_0_16px_-4px_var(--signal)]"
          : "border-line-2 bg-surface-3 shadow-inset hover:border-line-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] left-[3px] grid size-[18px] place-items-center rounded-full shadow-xs transition-[transform,background-color,color] duration-[var(--dur-slow)] ease-[var(--ease-spring)]",
          checked
            ? "translate-x-5 bg-signal-ink text-signal"
            : "translate-x-0 bg-ink-2 text-surface",
        )}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {checked ? (
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          ) : (
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
          )}
        </svg>
      </span>
    </button>
  );
}

/** Switch with a title and a description block, the whole row labelled for screen readers. */
export function SwitchField({
  title,
  description,
  className,
  ...props
}: Omit<SwitchProps, "label" | "labelledBy" | "describedBy"> & {
  title: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <p id={`${id}-t`} className="text-14 font-[550]">
          {title}
        </p>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-13 text-ink-3">
            {description}
          </p>
        )}
      </div>
      <Switch {...props} labelledBy={`${id}-t`} describedBy={description ? `${id}-d` : undefined} />
    </div>
  );
}

"use client";

import {
  useId,
  useRef,
  type ComponentType,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../cn";

/* ---------- Segmented control ---------- */

export type SegmentItem<V extends string> = {
  value: V;
  label: ReactNode;
  count?: number;
  /** Render as a link (e.g. a range in the URL) instead of a button. */
  href?: string;
};

type LinkLike = ComponentType<{
  href: string;
  className?: string;
  children?: ReactNode;
  role?: string;
  "aria-checked"?: boolean;
  tabIndex?: number;
  scroll?: boolean;
}>;

/**
 * Equal-width segments with a sliding pill (pure CSS transform, so it also works with
 * links on server pages). radiogroup semantics + arrow-key navigation.
 */
export function SegmentedControl<V extends string>({
  items,
  value,
  onChange,
  linkComponent: LinkComp,
  size = "md",
  label,
  className,
}: {
  items: SegmentItem<V>[];
  value: V;
  onChange?: (v: V) => void;
  /** Pass next/link's Link when items have href. */
  linkComponent?: LinkLike;
  size?: "sm" | "md";
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  );

  function onKeyDown(e: KeyboardEvent) {
    if (!onChange || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length;
    onChange(items[next]!.value);
    ref.current?.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
  }

  const itemCls = cn(
    "relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 font-[550] whitespace-nowrap transition-colors duration-[var(--dur-fast)]",
    size === "sm" ? "h-7 text-12" : "h-[34px] text-13",
  );

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "relative inline-flex rounded-full border border-line bg-surface-2 p-[3px] shadow-inset",
        className,
      )}
      style={{ "--n": items.length, "--i": index } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/var(--n))] translate-x-[calc(100%*var(--i))] rounded-full border border-line-2 bg-surface-4 shadow-e1 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)]"
      />
      {items.map((it, i) => {
        const selected = i === index;
        const content = (
          <>
            {it.label}
            {it.count != null && (
              <span
                className={cn(
                  "tnum rounded-full px-1.5 text-[10.5px] leading-4",
                  selected ? "bg-signal text-signal-ink" : "bg-surface-3 text-ink-3",
                )}
              >
                {it.count}
              </span>
            )}
          </>
        );
        const cls = cn(itemCls, selected ? "text-ink" : "text-ink-3 hover:text-ink-2");
        if (it.href && LinkComp) {
          return (
            <LinkComp
              key={it.value}
              href={it.href}
              scroll={false}
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className={cls}
            >
              {content}
            </LinkComp>
          );
        }
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange?.(it.value)}
            className={cls}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Text field ---------- */

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  icon?: ReactNode;
  /** Trailing slot inside the input (e.g. a button or Kbd). */
  trailing?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  success?: boolean;
  inputClassName?: string;
};

/** Input with icon slot, top label, helper/error line and a success check. */
export function Field({
  label,
  icon,
  trailing,
  helper,
  error,
  success,
  className,
  inputClassName,
  id,
  ...props
}: FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  const msgId = `${fid}-msg`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={fid} className="text-13 font-[550] text-ink-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3 [&>svg]:size-4">
            {icon}
          </span>
        )}
        <input
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helper ? msgId : undefined}
          className={inputClasses({
            icon: !!icon,
            trailing: !!trailing || success,
            error: !!error,
            className: inputClassName,
          })}
          {...props}
        />
        {(trailing || success) && (
          <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
            {success && (
              <span className="grid size-5 animate-[pop-in_var(--dur-slow)_var(--ease-spring)] place-items-center rounded-full bg-success text-[#06210f]">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              </span>
            )}
            {trailing}
          </span>
        )}
      </div>
      {(error || helper) && (
        <p
          id={msgId}
          className={cn("flex items-center gap-1.5 text-12", error ? "text-bad" : "text-ink-3")}
        >
          {error && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 4.8v3.6M8 11v.2" />
            </svg>
          )}
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

/** Shared input styling so plain <input>/<select>/<textarea> can match Field. */
export function inputClasses({
  icon,
  trailing,
  error,
  className,
}: { icon?: boolean; trailing?: boolean; error?: boolean; className?: string } = {}) {
  return cn(
    "h-[42px] w-full rounded-[12px] border bg-surface-2 px-3.5 text-14 text-ink shadow-inset placeholder:text-ink-4",
    "transition-[border-color,box-shadow] duration-[var(--dur-fast)] outline-none",
    "focus:border-signal-2 focus:shadow-[var(--e-inset),0_0_0_4px_color-mix(in_srgb,var(--signal)_16%,transparent)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    error ? "border-bad/60" : "border-line-2 hover:border-line-3",
    icon && "pl-10",
    trailing && "pr-11",
    className,
  );
}

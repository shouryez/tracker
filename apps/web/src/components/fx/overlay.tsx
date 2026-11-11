"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@upsolve/ui";

/**
 * Glass modal on the native <dialog>: focus is trapped and Esc closes for free.
 * Springs in from 96%; clicking the dimmed backdrop closes it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        "glass-overlay m-auto w-[min(520px,calc(100vw-32px))] rounded-[24px] p-0 text-ink",
        "backdrop:bg-[rgba(4,4,8,.55)] backdrop:backdrop-blur-[6px]",
        "open:animate-[modal-in_var(--dur-slow)_var(--ease-spring)]",
        className,
      )}
    >
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-20 font-[600]">
              {title}
            </h2>
            {description && <p className="mt-1 text-13 text-ink-2">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/**
 * Destructive button you must hold for `ms` to confirm. A fill sweeps across while held;
 * releasing early cancels. Keyboard: hold Space/Enter.
 */
export function HoldToConfirm({
  onConfirm,
  children,
  ms = 1200,
  disabled,
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  ms?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef(0);
  const start = () => {
    if (disabled) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onConfirm();
    }, ms);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={stop}
      className={cn(
        "relative isolate inline-flex h-[42px] items-center justify-center overflow-hidden rounded-full border border-bad/40 px-[18px] text-14 font-[550] text-bad select-none",
        "transition-[transform,border-color] duration-[var(--dur-base)] hover:border-bad active:scale-[.98] disabled:opacity-40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-left bg-bad/20"
        style={{
          transform: holding ? "scaleX(1)" : "scaleX(0)",
          transition: `transform ${holding ? ms : 200}ms ${holding ? "linear" : "var(--ease-out)"}`,
        }}
      />
      {holding ? "Keep holding…" : children}
    </button>
  );
}

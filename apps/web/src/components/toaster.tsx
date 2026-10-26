"use client";

import { Toaster as Sonner } from "sonner";

/** Themed toasts: slide in, stack, auto-dismiss, swipe away. Use `toast()` from "sonner". */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      gap={8}
      duration={3200}
      offset={{ bottom: 96 }}
      mobileOffset={{ bottom: 96 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(380px,calc(100vw-32px))] items-center gap-3 rounded-[16px] border border-line-2 bg-surface px-4 py-3 text-[13.5px] text-ink shadow-lg",
          title: "font-medium",
          description: "text-[12.5px] text-ink-2",
          icon: "text-ok",
          success: "[&_[data-icon]]:text-ok",
          error: "[&_[data-icon]]:text-bad",
          actionButton: "ml-auto rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-bg",
        },
      }}
    />
  );
}

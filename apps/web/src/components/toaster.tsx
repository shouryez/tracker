"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Frosted toasts (glass-overlay): slide in and stack with depth (the ones behind shrink and
 * soften, see globals.css "Toasts"), auto-dismiss, swipe away. Use `toast()` from "sonner".
 */
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
            "glass-overlay flex w-[min(380px,calc(100vw-32px))] items-center gap-3 rounded-[18px] px-4 py-3 text-[13.5px] text-ink",
          title: "font-medium",
          description: "text-[12.5px] text-ink-2",
          icon: "text-ok",
          success: "[&_[data-icon]]:text-ok",
          error: "[&_[data-icon]]:text-bad",
          actionButton:
            "ml-auto shrink-0 rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-bg transition-transform active:scale-95",
        },
      }}
    />
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button, EmptyState, buttonClasses } from "@upsolve/ui";

/** Friendly error screen for any dashboard page, with a retry that re-renders the segment. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="w-full max-w-[460px] rounded-[24px] border border-line bg-surface shadow-md">
        <EmptyState
          icon={<TriangleAlert size={20} className="text-warn" />}
          title="Something went wrong loading this page"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="sm" onClick={reset}>
                <RotateCw size={14} aria-hidden="true" /> Try again
              </Button>
              <Link
                href="/dashboard"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Back to overview
              </Link>
            </div>
          }
        >
          It&apos;s usually a hiccup reaching the database. Your data is safe; trying again normally
          fixes it.
          {error.digest && (
            <span className="mt-2 block font-mono text-[11px] text-ink-3">ref {error.digest}</span>
          )}
        </EmptyState>
      </div>
    </div>
  );
}

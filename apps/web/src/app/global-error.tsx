"use client";

import { useEffect } from "react";

/**
 * Last-resort error page (replaces the root layout, so it styles itself inline and loads
 * no app CSS). Same voice as the 404: a verdict chip and a retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#08080d",
          color: "#f4f4f6",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,90,120,.4)",
              background: "rgba(255,90,120,.12)",
              color: "#ff8aa0",
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
            }}
          >
            Verdict: Runtime Error
          </span>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 44, margin: "18px 0 8px" }}>
            Wrong answer. <em style={{ color: "#d7ff3a" }}>Let&apos;s retry.</em>
          </h1>
          <p style={{ color: "rgba(255,255,255,.7)", margin: "0 0 24px" }}>
            Something broke on our side. Your data is safe.
            {error.digest ? ` (ref ${error.digest})` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 22px",
              borderRadius: 999,
              border: 0,
              background: "#d7ff3a",
              color: "#0b0b0f",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

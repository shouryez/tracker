import { cn } from "@upsolve/ui";

/**
 * Pixel progress: a row of small squares, done ones lit in violet (the last with a glow),
 * the rest a quiet track. Echoes the logo's pixel grid.
 */
export function SegmentedProgress({
  done,
  total,
  segments = 30,
  className,
}: {
  done: number;
  total: number;
  segments?: number;
  className?: string;
}) {
  const filled = total > 0 ? (done / total) * segments : 0;
  const whole = Math.floor(filled);
  return (
    <div
      role="img"
      aria-label={`${done} of ${total} done`}
      className={cn("grid h-2.5 gap-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "animate-[fade-in-pop_400ms_var(--ease-out)_backwards] rounded-[2px]",
            i < whole
              ? i === whole - 1
                ? "bg-violet shadow-[0_0_8px_-1px_var(--violet)]"
                : "bg-violet/75"
              : i < filled
                ? "bg-violet/35"
                : "bg-surface-3",
          )}
          style={{ animationDelay: `${i * 15}ms` }}
        />
      ))}
    </div>
  );
}

export function formatEta(eta: string | null): string | null {
  if (!eta) return null;
  return new Date(`${eta}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// DsaKaro

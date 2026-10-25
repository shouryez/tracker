import { cn } from "@upsolve/ui";

/** Segmented progress (DESIGN.md §5): solid = done, grey = partial, hatched = remaining. */
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
  return (
    <div
      role="img"
      aria-label={`${done} of ${total} done`}
      className={cn("grid h-3 gap-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-[2px]",
            i < Math.floor(filled) ? "bg-ink" : i < filled ? "bg-ink-3" : "hatch",
          )}
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

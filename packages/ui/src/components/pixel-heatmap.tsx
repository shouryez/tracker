import { cn } from "../cn";

// 5-step violet → lime ramp (tokens.css heat-0..4).
const levelClass = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;

export type PixelHeatmapProps = {
  /** One activity level (0–4) per day, oldest first. Missing days render empty. */
  levels?: number[];
  weeks?: number;
  /** Highlight the last cell in signal lime. */
  markToday?: boolean;
  className?: string;
  label?: string;
};

/** 7-row pixel heatmap; one square = one day (DESIGN.md §8). */
export function PixelHeatmap({
  levels = [],
  weeks = 26,
  markToday = true,
  className,
  label = "Activity heatmap",
}: PixelHeatmapProps) {
  const total = weeks * 7;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("grid grid-flow-col grid-rows-7 gap-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const level = Math.max(0, Math.min(4, levels[i] ?? 0));
        const isToday = markToday && i === total - 1;
        return (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[3px]",
              levelClass[level],
              isToday && "ring-2 ring-signal ring-offset-1 ring-offset-[var(--surface)]",
            )}
          />
        );
      })}
    </div>
  );
}

import { cn } from "../cn";

const levelClass = [
  "bg-pixel-off",
  "bg-primary/30",
  "bg-primary/55",
  "bg-primary/80",
  "bg-primary",
] as const;

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
              "aspect-square rounded-[2px]",
              isToday
                ? "bg-signal shadow-[0_0_0_2px_color-mix(in_srgb,var(--signal)_30%,transparent)]"
                : levelClass[level],
            )}
          />
        );
      })}
    </div>
  );
}

import { Download } from "lucide-react";
import { LogoMark, PixelHeatmap } from "@upsolve/ui";

/**
 * The holographic stat card (FRONTEND-PLAN §8 Public profile 1, §9.3): name, streak, solved,
 * top topics and a quarter of the heatmap, on a card with a foil that shifts as it tilts
 * (data-tilt). "Download card" saves the share image.
 */
export function HoloCard({
  name,
  handle,
  streak,
  solved,
  topics,
  levels,
}: {
  name: string;
  handle: string;
  streak: number;
  solved: { total: number; easy: number; medium: number; hard: number };
  topics: string[];
  /** Heatmap levels, oldest first; the last 13 weeks are shown. */
  levels: number[];
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        data-tilt="12"
        className="group/holo relative isolate flex aspect-[5/7] w-full max-w-[300px] flex-col justify-between overflow-hidden rounded-[22px] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_30px_50px_-24px_rgba(0,0,0,.8)] transition-transform duration-300 data-[tilting]:duration-75"
        style={{
          background:
            "radial-gradient(120% 70% at 20% 0%, color-mix(in srgb, #f0884f 30%, #131317), #0b0b0e 70%)",
        }}
      >
        {/* Foil and glare */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[.12] mix-blend-color-dodge transition-opacity duration-300 group-data-[tilting]/holo:opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, rgba(255,110,190,.0) 0%, rgba(255,110,190,.45) 6%, rgba(120,220,255,.45) 12%, rgba(255,235,130,.4) 18%, rgba(140,255,200,.4) 24%, rgba(255,110,190,0) 30%)",
            backgroundSize: "300% 300%",
            backgroundPosition: "var(--gx, 30%) var(--gy, 30%)",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-data-[tilting]/holo:opacity-100"
          style={{
            background:
              "radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), rgba(255,255,255,.75), transparent 50%)",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[7px] rounded-[16px] border border-white/15"
        />

        <div className="relative flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate font-display text-[22px] leading-tight font-[650] tracking-[-0.02em]">
              {name}
            </p>
            <p className="text-12 text-white/60">@{handle}</p>
          </div>
          <span className="text-white">
            <LogoMark size={26} />
          </span>
        </div>

        <div className="relative grid grid-cols-2 gap-2">
          <div className="rounded-[12px] bg-white/8 p-2.5">
            <p className="font-display text-[30px] leading-none font-[650] tabular-nums">
              {solved.total}
            </p>
            <p className="mt-1 text-[11px] text-white/60">solved</p>
          </div>
          <div className="rounded-[12px] bg-white/8 p-2.5">
            <p className="font-display text-[30px] leading-none font-[650] text-[#f0884f] tabular-nums">
              {streak}
            </p>
            <p className="mt-1 text-[11px] text-white/60">day streak</p>
          </div>
        </div>

        <div className="relative">
          <PixelHeatmap
            levels={levels.slice(-91)}
            weeks={13}
            markToday={false}
            className="gap-[2px]"
          />
        </div>

        <div className="relative flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate text-white/70">{topics.slice(0, 3).join(" · ") || "DSA"}</span>
          <span className="flex shrink-0 gap-1 tabular-nums">
            <span className="text-[#86d9c2]">{solved.easy}</span>/
            <span className="text-[#e2c27d]">{solved.medium}</span>/
            <span className="text-[#f26d82]">{solved.hard}</span>
          </span>
        </div>
      </div>
      <a
        href={`/api/share-card?handle=${encodeURIComponent(handle)}&download=1`}
        className="inline-flex items-center gap-1.5 text-13 font-[600] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
      >
        <Download size={13} aria-hidden="true" /> Download card
      </a>
    </div>
  );
}

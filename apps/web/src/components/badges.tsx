import type { CSSProperties } from "react";
import {
  BookOpenCheck,
  Brain,
  Check,
  Flame,
  GraduationCap,
  Layers,
  Moon,
  RotateCcw,
  Sun,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@upsolve/ui";
import type { Badge, BadgeIcon, BadgeTone } from "@/lib/badges";

const ICON: Record<BadgeIcon, LucideIcon> = {
  flame: Flame,
  check: Check,
  graduate: GraduationCap,
  book: BookOpenCheck,
  target: Target,
  trophy: Trophy,
  layers: Layers,
  rewind: RotateCcw,
  moon: Moon,
  sun: Sun,
  brain: Brain,
};

const TONE: Record<BadgeTone, string> = {
  ember: "#f0884f",
  mint: "#86d9c2",
  sky: "#9db5e8",
  sand: "#e2c27d",
  rose: "#f26d82",
};

/**
 * One collectible badge. Earned: a dark card with a holographic foil that shifts as it tilts
 * towards the pointer (data-tilt, components/fx/experience.tsx). Not yet: dim, dashed, with
 * how to earn it and the progress so far.
 */
export function BadgeTile({ badge }: { badge: Badge }) {
  const Icon = ICON[badge.icon];
  const tone = TONE[badge.tone];
  const pct = badge.progress
    ? Math.min(100, (badge.progress.value / Math.max(1, badge.progress.goal)) * 100)
    : 0;
  return (
    <div
      data-tilt={badge.earned ? "14" : undefined}
      title={badge.hint}
      className={cn(
        "group/badge relative isolate flex aspect-[3/4] flex-col items-center justify-between overflow-hidden rounded-[18px] p-3 text-center text-white transition-[transform,box-shadow] duration-300 data-[tilting]:duration-75",
        badge.earned
          ? "shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_16px_30px_-16px_rgba(0,0,0,.75)]"
          : "border border-dashed border-line-2 bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] text-ink",
      )}
      style={
        badge.earned
          ? ({
              background: `radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, ${tone} 34%, #121216), #0c0c0f 75%)`,
              "--tone": tone,
            } as CSSProperties)
          : undefined
      }
    >
      {badge.earned && (
        <>
          {/* Holographic foil: rainbow bands that slide with the tilt. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-0 opacity-[.14] mix-blend-color-dodge transition-opacity duration-300 group-hover/badge:opacity-30 group-data-[tilting]/badge:opacity-55"
            style={{
              backgroundImage:
                "linear-gradient(115deg, transparent 18%, rgba(255,110,190,.55) 32%, rgba(120,220,255,.55) 42%, rgba(255,235,130,.5) 52%, rgba(140,255,200,.45) 60%, transparent 74%)",
              backgroundSize: "260% 260%",
              backgroundPosition: "var(--gx, 30%) var(--gy, 30%)",
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 group-data-[tilting]/badge:opacity-100"
            style={{
              background:
                "radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), rgba(255,255,255,.7), transparent 55%)",
            }}
          />
        </>
      )}
      <span className="relative text-[10px] font-[650] tracking-[.12em] uppercase opacity-60">
        {badge.earned ? "Earned" : "Locked"}
      </span>
      <span
        className={cn(
          "relative grid size-14 place-items-center rounded-full",
          badge.earned
            ? "bg-white/10 shadow-[0_0_28px_-4px_var(--tone)]"
            : "bg-surface-3 text-ink-4",
        )}
        style={badge.earned ? { color: tone } : undefined}
      >
        <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="relative flex w-full flex-col items-center gap-1.5">
        <span className={cn("text-13 leading-tight font-[650]", !badge.earned && "text-ink-2")}>
          {badge.name}
        </span>
        {badge.progress && (
          <span
            className={cn(
              "h-1 w-full overflow-hidden rounded-full",
              badge.earned ? "bg-white/15" : "bg-surface-3",
            )}
            aria-label={`${badge.progress.value} of ${badge.progress.goal}`}
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${pct}%`, background: badge.earned ? tone : "var(--ink-3)" }}
            />
          </span>
        )}
      </span>
    </div>
  );
}

/** A shelf of badges, earned first. Each tile's hint is its tooltip and screen-reader text. */
export function BadgeShelf({ badges, className }: { badges: Badge[]; className?: string }) {
  const sorted = [...badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <ul className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6", className)}>
      {sorted.map((b) => (
        <li key={b.id} aria-label={`${b.name}: ${b.earned ? "earned" : "not yet"}. ${b.hint}`}>
          <BadgeTile badge={b} />
        </li>
      ))}
    </ul>
  );
}

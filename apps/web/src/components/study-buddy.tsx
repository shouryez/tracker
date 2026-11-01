/* eslint-disable @next/next/no-img-element -- small static PNGs; no optimisation needed */
import type { CSSProperties } from "react";
import { cn } from "@upsolve/ui";
import { buddyById, buddyImage, type BuddyLevel } from "@/lib/buddies";

/** The level's colour: the glow behind the character and its ring. */
const TONE: Record<string, string> = {
  idle: "var(--ink-3)",
  paused: "#f5b544",
  1: "#a3e635",
  2: "#facc15",
  3: "#fb923c",
  4: "#ef4444",
};
const BADGE: Partial<Record<string, string>> = {
  idle: "zzz",
  paused: "coffee",
  2: "bolt",
  3: "fire",
  4: "fire",
};

/**
 * A study buddy: a 3D character in a glowing disc. Idle naps (Zzz), a break gets a coffee,
 * and a running session builds up: at the laptop, a bolt from 1 h, fire from 2 h, a blaze
 * with a spinning ring from 3 h. Animation is CSS and respects reduced motion.
 */
export function StudyBuddy({
  buddy,
  level,
  size = 64,
  className,
}: {
  buddy: string | null | undefined;
  level: BuddyLevel;
  size?: number;
  className?: string;
}) {
  const b = buddyById(buddy);
  const studying = typeof level === "number";
  const lv = typeof level === "number" ? level : 0;
  const tone = TONE[String(level)]!;
  const badge = BADGE[String(level)];
  const badgePx = Math.round(size * 0.36);

  return (
    <span
      role="img"
      aria-label={b.label}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size, "--buddy-tone": tone } as CSSProperties}
    >
      {/* Disc: a soft glow of the level colour, ringed; a spinning ring from 3 h. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 rounded-full", lv >= 4 && "buddy-ring")}
        style={{
          background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--buddy-tone) ${studying ? 34 : 16}%, transparent), color-mix(in srgb, var(--buddy-tone) ${studying ? 10 : 5}%, transparent) 72%)`,
          boxShadow: `inset 0 0 0 ${size >= 80 ? 2 : 1.5}px color-mix(in srgb, var(--buddy-tone) ${studying ? 65 : 28}%, transparent)${
            lv >= 3
              ? `, 0 0 ${Math.round(size * 0.28)}px -${Math.round(size * 0.06)}px var(--buddy-tone)`
              : ""
          }`,
        }}
      />
      {/* Flames rising behind the character from 3 h. */}
      {lv >= 4 && (
        <>
          <img
            src="/buddies/badge-fire.png"
            alt=""
            aria-hidden="true"
            className="buddy-flame absolute bottom-[8%] left-[-6%] w-[44%]"
            draggable={false}
          />
          <img
            src="/buddies/badge-fire.png"
            alt=""
            aria-hidden="true"
            className="buddy-flame absolute right-[-6%] bottom-[8%] w-[44%] [animation-delay:-.45s]"
            draggable={false}
          />
        </>
      )}
      {/* Inside the disc, the laptop pose is zoomed so the character, not the laptop, fills it. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 overflow-hidden rounded-full", studying && "buddy-bob")}
      >
        <img
          src={buddyImage(b, studying)}
          alt=""
          width={size}
          height={size}
          draggable={false}
          className={cn(
            "absolute left-1/2 max-w-none -translate-x-1/2 drop-shadow-[0_4px_6px_rgba(0,0,0,.28)] select-none",
            studying ? "top-[6%] w-[118%]" : "top-[8%] w-[86%]",
            level === "idle" && "opacity-85 saturate-[.7]",
          )}
        />
      </span>
      {badge && (
        <img
          src={`/buddies/badge-${badge}.png`}
          alt=""
          aria-hidden="true"
          width={badgePx}
          height={badgePx}
          draggable={false}
          className={cn(
            "absolute -top-[4%] -right-[6%] drop-shadow-[0_2px_3px_rgba(0,0,0,.3)]",
            level === "idle" && "buddy-zz",
            lv >= 3 && "buddy-flame",
          )}
          style={{ width: badgePx, height: badgePx }}
        />
      )}
      {lv >= 4 && (
        <img
          src="/buddies/badge-100.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute -bottom-[4%] -left-[6%] w-[32%] drop-shadow-[0_2px_3px_rgba(0,0,0,.3)]"
        />
      )}
    </span>
  );
}

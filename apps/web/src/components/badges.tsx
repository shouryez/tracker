import type { CSSProperties, ReactNode } from "react";
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
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@upsolve/ui";
import {
  FAMILY_LABEL,
  nextBadge,
  type Badge,
  type BadgeFamily,
  type BadgeIcon,
  type BadgeMetal,
  type BadgeTone,
} from "@/lib/badges";

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

/** Physical metals, so these are fixed colours in both themes. */
const METAL: Record<BadgeMetal, { face: string; ring: string; ink: string; label: string }> = {
  bronze: {
    face: "radial-gradient(circle at 34% 28%, #f6cda6, #c47e4b 46%, #6b3a1c 100%)",
    ring: "rgba(255,226,196,.55)",
    ink: "#3b1c08",
    label: "Bronze",
  },
  silver: {
    face: "radial-gradient(circle at 34% 28%, #ffffff, #c8cdd5 46%, #757c88 100%)",
    ring: "rgba(255,255,255,.7)",
    ink: "#262a31",
    label: "Silver",
  },
  gold: {
    face: "radial-gradient(circle at 34% 28%, #fff3bf, #e2b54a 46%, #85600f 100%)",
    ring: "rgba(255,246,206,.7)",
    ink: "#3a2804",
    label: "Gold",
  },
  holo: {
    face: "conic-gradient(from 200deg, #ffb6dc, #b6e4ff, #fff1a6, #b8ffd8, #d6bbff, #ffb6dc)",
    ring: "rgba(255,255,255,.8)",
    ink: "#1c1b25",
    label: "Holo",
  },
};

const DATE = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const SHORT = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

const pctOf = (b: Badge) =>
  b.progress ? Math.min(100, (b.progress.value / Math.max(1, b.progress.goal)) * 100) : 0;

/** The medal disc of a milestone tier: metal face, inner ring, the number in the centre. */
function Medal({ badge, size = 68 }: { badge: Badge; size?: number }) {
  const metal = METAL[badge.metal ?? "bronze"];
  const Icon = ICON[badge.icon];
  const long = (badge.mark ?? "").length > 3;
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full transition-transform duration-300",
        badge.earned
          ? "shadow-[inset_0_-3px_6px_rgba(0,0,0,.28),inset_0_2px_3px_rgba(255,255,255,.55),0_10px_22px_-12px_rgba(0,0,0,.7)] group-hover/medal:-translate-y-0.5"
          : "border-[1.5px] border-dashed border-line-2 bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]",
      )}
      style={{ width: size, height: size, background: badge.earned ? metal.face : undefined }}
    >
      {badge.earned && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[11%] rounded-full border"
          style={{ borderColor: metal.ring }}
        />
      )}
      <span className="relative flex flex-col items-center leading-none">
        <Icon
          size={Math.round(size * 0.17)}
          strokeWidth={2.6}
          aria-hidden="true"
          className={badge.earned ? undefined : "text-ink-4"}
          style={badge.earned ? { color: metal.ink, opacity: 0.7 } : undefined}
        />
        <span
          className={cn(
            "mt-0.5 font-mono font-[750] tracking-tight",
            !badge.earned && "text-ink-3",
          )}
          style={{
            fontSize: Math.round(size * (long ? 0.24 : 0.29)),
            color: badge.earned ? metal.ink : undefined,
          }}
        >
          {badge.mark}
        </span>
      </span>
    </span>
  );
}

/** Tap a badge for this: what it is, how to earn it, progress and when you got it. */
function BadgeDetail({ badge, pid }: { badge: Badge; pid: string }) {
  const Icon = ICON[badge.icon];
  return (
    <div
      id={pid}
      popover="auto"
      className="m-auto w-[min(calc(100vw-32px),340px)] rounded-[22px] border border-line-2 bg-surface p-0 text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] backdrop:bg-black/45"
    >
      <div className="relative flex flex-col items-center gap-3 px-5 pt-6 pb-5 text-center">
        <button
          type="button"
          popoverTarget={pid}
          popoverTargetAction="hide"
          aria-label="Close"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <X size={15} aria-hidden="true" />
        </button>
        {badge.family ? (
          <Medal badge={badge} size={96} />
        ) : (
          <span
            className={cn(
              "grid size-20 place-items-center rounded-full",
              badge.earned ? "bg-[#121216]" : "bg-surface-3 text-ink-4",
            )}
            style={badge.earned ? { color: TONE[badge.tone] } : undefined}
          >
            <Icon size={34} strokeWidth={2.2} aria-hidden="true" />
          </span>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-[650] tracking-[.12em] text-ink-3 uppercase">
            {badge.family
              ? `${FAMILY_LABEL[badge.family]} · ${METAL[badge.metal!].label}`
              : "Badge"}
          </p>
          <p className="text-18 font-[700]">{badge.name}</p>
        </div>
        <dl className="flex w-full flex-col gap-2 rounded-[14px] bg-surface-2 px-4 py-3 text-left text-13">
          <div>
            <dt className="text-[11px] text-ink-3">How to earn it</dt>
            <dd>{badge.how}.</dd>
          </div>
          {badge.earned ? (
            <div>
              <dt className="text-[11px] text-ink-3">Earned</dt>
              <dd className="text-signal-text">
                {badge.did ?? "Yes"}
                {badge.earnedAt ? ` · ${DATE.format(badge.earnedAt)}` : ""}
              </dd>
            </div>
          ) : badge.progress ? (
            <div>
              <dt className="text-[11px] text-ink-3">Your progress</dt>
              <dd className="flex items-center gap-2.5">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className="block h-full rounded-full bg-ink-2"
                    style={{ width: `${pctOf(badge)}%` }}
                  />
                </span>
                <span className="font-mono text-12">
                  {badge.progress.value}/{badge.progress.goal}
                </span>
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-[11px] text-ink-3">Status</dt>
              <dd>Not yet</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

/** A milestone tier: the medal, its name, and a short visible line (date, or what to do). */
function MedalTile({ badge, pid, next }: { badge: Badge; pid: string; next: boolean }) {
  const toGo = badge.progress ? badge.progress.goal - badge.progress.value : 0;
  return (
    <>
      <button
        type="button"
        popoverTarget={pid}
        title={badge.hint}
        aria-label={`${badge.name}: ${badge.earned ? "earned" : "not yet"}. ${badge.hint}`}
        className={cn(
          "group/medal flex h-full w-full flex-col items-center gap-2 rounded-[16px] px-1.5 pt-3 pb-2.5 text-center transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]",
          next && "bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] ring-1 ring-line-2",
        )}
      >
        <Medal badge={badge} />
        <span
          className={cn("text-[12.5px] leading-tight font-[650]", !badge.earned && "text-ink-2")}
        >
          {badge.name}
        </span>
        <span className="text-[11px] leading-snug text-ink-3">
          {badge.earned
            ? badge.earnedAt
              ? SHORT.format(badge.earnedAt)
              : "Earned"
            : next
              ? `${toGo} to go`
              : badge.how}
        </span>
        {next && badge.progress && (
          <span className="h-1 w-4/5 overflow-hidden rounded-full bg-surface-3">
            <span
              className="block h-full rounded-full bg-ink-3"
              style={{ width: `${pctOf(badge)}%` }}
            />
          </span>
        )}
      </button>
      <BadgeDetail badge={badge} pid={pid} />
    </>
  );
}

/**
 * One collectible badge. Earned: a dark card with a holographic foil that shifts as it tilts
 * towards the pointer (data-tilt, components/fx/experience.tsx). Not yet: dim and dashed.
 * Both show what it's for in a visible line, and open the detail on tap.
 */
export function BadgeTile({ badge, pid }: { badge: Badge; pid: string }) {
  const Icon = ICON[badge.icon];
  const tone = TONE[badge.tone];
  return (
    <>
      <button
        type="button"
        popoverTarget={pid}
        data-tilt={badge.earned ? "14" : undefined}
        title={badge.hint}
        aria-label={`${badge.name}: ${badge.earned ? "earned" : "not yet"}. ${badge.hint}`}
        className={cn(
          "group/badge relative isolate flex h-full min-h-[184px] w-full flex-col items-center justify-between gap-2 overflow-hidden rounded-[18px] p-3 text-center text-white transition-[transform,box-shadow] duration-300 data-[tilting]:duration-75",
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
            "relative grid size-12 place-items-center rounded-full",
            badge.earned
              ? "bg-white/10 shadow-[0_0_28px_-4px_var(--tone)]"
              : "bg-surface-3 text-ink-4",
          )}
          style={badge.earned ? { color: tone } : undefined}
        >
          <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className="relative flex w-full flex-col items-center gap-1">
          <span className={cn("text-13 leading-tight font-[650]", !badge.earned && "text-ink-2")}>
            {badge.name}
          </span>
          <span
            className={cn(
              "text-[11px] leading-snug",
              badge.earned ? "text-white/65" : "text-ink-3",
            )}
          >
            {badge.earned ? (badge.did ?? badge.how) : badge.how}
          </span>
          {badge.progress && (
            <span
              className={cn(
                "mt-1 h-1 w-full overflow-hidden rounded-full",
                badge.earned ? "bg-white/15" : "bg-surface-3",
              )}
              aria-hidden="true"
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pctOf(badge)}%`,
                  background: badge.earned ? tone : "var(--ink-3)",
                }}
              />
            </span>
          )}
        </span>
      </button>
      <BadgeDetail badge={badge} pid={pid} />
    </>
  );
}

function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-baseline gap-2 text-13 font-[650] text-ink-2">
        {title}
        {meta && <span className="font-mono text-[11px] font-[500] text-ink-3">{meta}</span>}
      </h3>
      {children}
    </section>
  );
}

/** Locked tiers shown past the last earned one; the rest of the ladder stays hidden. */
const LOCKED_AHEAD = 3;
const FAMILIES: BadgeFamily[] = ["solved", "streak", "graduated"];

/**
 * The badge shelf: one row of medals per milestone ladder (earned tiers plus the next few,
 * the nearest one highlighted with "N to go"), then the one-off badges, earned first.
 */
export function BadgeShelf({
  badges,
  className,
  idPrefix = "badge",
}: {
  badges: Badge[];
  className?: string;
  idPrefix?: string;
}) {
  const next = nextBadge(badges);
  const singles = badges
    .filter((b) => !b.family)
    .sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <div className="flex flex-col gap-6">
      {FAMILIES.map((f) => {
        const all = badges.filter((b) => b.family === f);
        if (!all.length) return null;
        const earned = all.filter((b) => b.earned).length;
        const shown = all.slice(0, earned + LOCKED_AHEAD);
        const hidden = all.length - shown.length;
        return (
          <Section
            key={f}
            title={FAMILY_LABEL[f]}
            meta={`${earned} of ${all.length}${hidden > 0 ? ` · goes up to ${all.at(-1)!.mark}` : ""}`}
          >
            <ul className={cn("grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-6", className)}>
              {shown.map((b) => (
                <li key={b.id}>
                  <MedalTile badge={b} pid={`${idPrefix}-${b.id}`} next={next?.id === b.id} />
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
      <Section
        title="More badges"
        meta={`${singles.filter((b) => b.earned).length} of ${singles.length}`}
      >
        <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6", className)}>
          {singles.map((b) => (
            <li key={b.id}>
              <BadgeTile badge={b} pid={`${idPrefix}-${b.id}`} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

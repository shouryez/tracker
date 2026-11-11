import { CalendarCheck, Crown, Layers, RotateCcw, Timer } from "lucide-react";
import { MAX_SCORE, SCORE_PARTS } from "@upsolve/core";
import { cn } from "@upsolve/ui";
import { NumberTicker } from "@/components/fx/number-ticker";
import { RangeControl } from "@/components/range-control";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatDuration } from "@/lib/sessions-data";
import { BOARD_METRICS, rankBoard, type BoardMetric, type BoardRow } from "@/lib/social-data";

/** Metric tabs as a segmented control with a sliding pill; `href` builds each link. */
export function MetricTabs({
  metric,
  href,
}: {
  metric: BoardMetric;
  href: (m: BoardMetric) => string;
}) {
  return (
    <RangeControl
      label="Rank by"
      value={metric}
      items={BOARD_METRICS.map((m) => ({
        value: m.value,
        label: m.value === "solved" ? "Solved" : m.value === "rating" ? "Rating" : m.label,
        href: href(m.value),
      }))}
    />
  );
}

function Avatar({ r, size = 32 }: { r: BoardRow; size?: number }) {
  const name = r.name ?? r.handle ?? "?";
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] text-[11px] font-[650] text-ink"
      style={{ width: size, height: size }}
    >
      {r.avatarUrl ? (
        // Provider avatar, already small.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

const MEDAL = ["var(--signal)", "#c9cdd6", "#d79a62"];

/** A ranked board: a podium for the top three, then rows. The viewer's row is highlighted. */
export function Leaderboard({
  rows,
  metric,
  viewerId,
  empty,
}: {
  rows: BoardRow[];
  metric: BoardMetric;
  viewerId: string;
  empty: string;
}) {
  const ranked = rankBoard(rows, metric);
  if (ranked.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span aria-hidden="true" className="mb-4 flex items-end gap-1.5">
          {[3, 5, 2].map((h, i) => (
            <span key={i} className="flex flex-col-reverse gap-[3px]">
              {Array.from({ length: h }, (_, k) => (
                <i key={k} className="block size-3 rounded-[3px] bg-line-3" />
              ))}
            </span>
          ))}
        </span>
        <p className="text-14 text-ink-2">{empty}</p>
      </div>
    );
  }
  const top = Math.max(1, ...ranked.map((r) => value(r, metric)));
  const podium = ranked.length >= 3 ? ranked.slice(0, 3) : [];
  // Order on the podium: 2nd, 1st, 3rd.
  const stage = podium.length ? [podium[1]!, podium[0]!, podium[2]!] : [];

  return (
    <div className="flex flex-col gap-5">
      {stage.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-3 pt-2">
          {stage.map((r) => {
            const place = r.rank;
            const me = r.userId === viewerId;
            return (
              <div key={r.userId} className="flex flex-col items-center gap-2 text-center">
                <span className="relative">
                  {place === 1 && (
                    <Crown
                      size={18}
                      aria-hidden="true"
                      className="absolute -top-4 left-1/2 -translate-x-1/2 text-signal-mark drop-shadow-[0_0_6px_var(--signal)]"
                    />
                  )}
                  <span
                    className="block rounded-full p-[2px]"
                    style={{ background: MEDAL[place - 1] }}
                  >
                    <Avatar r={r} size={place === 1 ? 52 : 42} />
                  </span>
                </span>
                <span className="w-full truncate text-13 font-[600]">
                  {r.name ?? r.handle ?? "Someone"}
                  {r.verified && <VerifiedBadge size={13} className="ml-1" />}
                  {me && <span className="ml-1 text-11 text-ink-3">you</span>}
                </span>
                <span
                  className={cn(
                    "flex w-full flex-col items-center justify-start rounded-t-[14px] border border-b-0 border-line pt-2",
                    place === 1
                      ? "h-24 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--signal)_18%,transparent),transparent)]"
                      : place === 2
                        ? "h-16 bg-surface-2"
                        : "h-12 bg-surface-2",
                  )}
                >
                  <span className="num text-24">
                    <NumberTicker value={value(r, metric)} />
                  </span>
                  <span className="font-mono text-11 text-ink-3">#{place}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <ol className="flex flex-col gap-1">
        {ranked.map((r, i) => {
          const me = r.userId === viewerId;
          return (
            <li
              key={r.userId}
              className={cn(
                "grid grid-cols-[28px_auto_1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-[12px] px-2.5 py-2.5 transition-colors",
                me
                  ? "bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] shadow-[inset_0_0_0_1px_var(--line-2)]"
                  : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]",
              )}
              style={{ animation: `rise-in 420ms var(--ease-out) ${i * 40}ms backwards` }}
            >
              <span
                className={cn(
                  "num grid size-7 place-items-center rounded-[8px] text-[14px]",
                  r.rank <= 3 ? "text-bg" : "text-ink-3",
                )}
                style={r.rank <= 3 ? { background: MEDAL[r.rank - 1] } : undefined}
              >
                {r.rank}
              </span>
              <Avatar r={r} />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-[550]">
                  {r.name ?? r.handle ?? "Someone"}
                  {r.verified && <VerifiedBadge size={13} className="ml-1" />}
                  {me && <span className="ml-1.5 text-11 text-ink-3">you</span>}
                </span>
                <span className="tnum block truncate text-11 text-ink-3">
                  {r.activeDays}/7 days · {r.reviews} revised · {formatDuration(r.focusMs)} focus ·{" "}
                  {r.solved} solved
                </span>
              </span>
              <span className="num text-right text-[18px]">{label(r, metric)}</span>
              <span className="relative col-span-3 col-start-2 h-1.5 overflow-hidden rounded-full bg-line">
                <span
                  className="absolute inset-y-0 left-0 origin-left animate-[grow-x_800ms_var(--ease-out)_backwards] rounded-full"
                  style={{
                    width: `${Math.max(2, (value(r, metric) / top) * 100)}%`,
                    // Your bar in mint (data); everyone else's neutral.
                    background: me ? "var(--signal)" : "var(--line-3)",
                  }}
                />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function value(r: BoardRow, metric: BoardMetric) {
  return metric === "consistency" ? r.score : metric === "solved" ? r.solved : (r.rating ?? 0);
}

function label(r: BoardRow, metric: BoardMetric) {
  return metric === "consistency"
    ? `${r.score}`
    : metric === "solved"
      ? `${r.solved}`
      : `${r.rating ?? "—"}`;
}

const SP = SCORE_PARTS;
const PARTS = [
  {
    label: "Active days",
    sp: SP.activeDays,
    unit: "day",
    color: "var(--easy)",
    Icon: CalendarCheck,
  },
  { label: "Revisions", sp: SP.reviews, unit: "revision", color: "var(--violet)", Icon: RotateCcw },
  {
    label: "Focus hours",
    sp: SP.focusHours,
    unit: "hour",
    color: "var(--signal-mark)",
    Icon: Timer,
  },
  { label: "Problems", sp: SP.solved, unit: "problem", color: "var(--medium)", Icon: Layers },
].map((p) => ({
  ...p,
  max: p.sp.per * p.sp.cap,
  rule: `${p.sp.per} per ${p.unit}, up to ${p.sp.cap}`,
}));

/** How the consistency score is made, as four small meters, so it never feels arbitrary. */
export function ScoreExplainer() {
  const total = MAX_SCORE;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-13 text-ink-2">
        <span className="font-[600] text-ink">Consistency</span> (out of {MAX_SCORE}) resets every
        Monday. Showing up daily beats a one-night grind.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PARTS.map((p) => (
          <div key={p.label} className="surface-inset rounded-[12px] p-3">
            <p className="flex items-center gap-1.5 text-12 font-[600]">
              <p.Icon size={12} aria-hidden="true" style={{ color: p.color }} /> {p.label}
            </p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(p.max / total) * 100}%`, background: p.color }}
              />
            </span>
            <p className="tnum mt-1.5 text-11 text-ink-3">
              {p.rule} · max {p.max}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// DsaKaro

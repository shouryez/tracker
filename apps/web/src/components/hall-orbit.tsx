import type { CSSProperties } from "react";
import { StudyBuddy } from "@/components/study-buddy";
import type { HallMember } from "@/lib/daily-data";

/**
 * The study hall in orbit (FRONTEND-PLAN §8 People 1): the group at the centre, members
 * studying right now circling close with a live dot, everyone else on the outer ring. The
 * rings turn slowly and the buddies stay upright. CSS only, so it renders on the server;
 * reduced motion stops the turn.
 */
export function HallOrbit({
  members,
  label,
  size = 132,
}: {
  members: HallMember[];
  label: string;
  size?: number;
}) {
  const live = members.filter((m) => m.live && !m.live.pausedAt).slice(0, 6);
  const rest = members.filter((m) => !live.includes(m)).slice(0, 8);
  const c = size / 2;
  const rings = [
    { list: live, r: size * 0.27, dur: 38, dir: "normal" as const },
    { list: rest, r: size * 0.44, dur: 64, dir: "reverse" as const },
  ];
  const avatar = Math.round(size * 0.2);
  return (
    <div
      role="img"
      aria-label={`${label}: ${live.length} studying now, ${members.length} members`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden="true">
        {rings.map((g) => (
          <circle
            key={g.r}
            cx={c}
            cy={c}
            r={g.r}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity=".1"
            strokeDasharray="2 5"
          />
        ))}
      </svg>
      <span
        aria-hidden="true"
        className="absolute grid place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffc39e,#e2753f)] font-display text-[13px] font-[700] text-[#2a1205] shadow-[0_0_24px_-4px_rgba(240,136,79,.7)]"
        style={{ left: c - size * 0.1, top: c - size * 0.1, width: size * 0.2, height: size * 0.2 }}
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
      {rings.map((g) =>
        g.list.length === 0 ? null : (
          <div
            key={g.r}
            aria-hidden="true"
            className="hall-ring absolute inset-0"
            style={{ "--dur": `${g.dur}s`, animationDirection: g.dir } as CSSProperties}
          >
            {g.list.map((m, i) => {
              const a = (i / g.list.length) * Math.PI * 2 - Math.PI / 2;
              const studying = g.list === live;
              return (
                <span
                  key={m.userId}
                  className="absolute"
                  style={{
                    left: c + g.r * Math.cos(a) - avatar / 2,
                    top: c + g.r * Math.sin(a) - avatar / 2,
                  }}
                >
                  {/* Counter-turn so the buddy stays upright. */}
                  <span
                    className="hall-upright relative block"
                    style={
                      {
                        "--dur": `${g.dur}s`,
                        animationDirection: g.dir === "normal" ? "reverse" : "normal",
                      } as CSSProperties
                    }
                  >
                    <StudyBuddy buddy={m.avatar} level={studying ? 1 : "idle"} size={avatar} />
                    {studying && (
                      <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[var(--surface)] bg-primary" />
                    )}
                  </span>
                </span>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
}

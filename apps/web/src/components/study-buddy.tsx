import { useId, type CSSProperties } from "react";
import { cn } from "@upsolve/ui";
import { buddyById, type BuddyLevel, type HairStyle } from "@/lib/buddies";

/** Backdrop colours per level: inner glow, outer edge. */
const BACKDROP: Record<string, [string, string]> = {
  idle: ["#33333b", "#1d1d22"],
  paused: ["#4a3d1c", "#1f1a10"],
  1: ["#4d5e16", "#171a0d"],
  2: ["#6b4c0f", "#21170a"],
  3: ["#7a3210", "#250f07"],
  4: ["#8f1d12", "#2a0806"],
};

function HairBack({ style, color }: { style: HairStyle; color: string }) {
  if (style === "long")
    return (
      <g fill={color}>
        <path d="M37 50 C33 68 33 84 39 96 L51 96 C46 82 44 66 45 54 Z" />
        <path d="M83 50 C87 68 87 84 81 96 L69 96 C74 82 76 66 75 54 Z" />
      </g>
    );
  if (style === "bob")
    return (
      <path
        fill={color}
        d="M35 54 C33 33 46 27 60 27 C74 27 87 33 85 54 L86 73 C80 76 74 74 72 71 L48 71 C46 74 40 76 34 73 Z"
      />
    );
  if (style === "bun") return <circle cx="60" cy="27" r="9" fill={color} />;
  return null;
}

function HairFront({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case "short":
      return (
        <path
          fill={color}
          d="M37 54 C35 36 47 28 61 28 C75 28 86 36 83 53 C80 47 73 42 65 41 C57 44 47 44 41 48 C39 50 38 52 37 54 Z"
        />
      );
    case "curly":
      return (
        <g fill={color}>
          {[
            [43, 42, 8],
            [51, 34, 9],
            [61, 31, 9.5],
            [71, 34, 9],
            [79, 42, 7.5],
            [39, 50, 5.5],
            [82, 50, 5],
            [56, 40, 6],
            [67, 40, 6],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "spiky":
      return (
        <path
          fill={color}
          d="M37 53 L35 40 L43 43 L43 31 L51 37 L55 25 L61 35 L67 25 L71 36 L79 29 L78 42 L86 40 L83 53 C76 45 67 41 60 41 C52 41 43 45 37 53 Z"
        />
      );
    case "long":
      return (
        <path
          fill={color}
          d="M37 55 C34 35 49 27 61 27 C75 27 87 36 83 55 C79 45 71 39 62 38 C55 42 45 46 37 55 Z"
        />
      );
    case "bun":
      return (
        <path
          fill={color}
          d="M38 53 C37 37 48 31 60 31 C72 31 83 37 82 53 C77 45 69 41 60 41 C51 41 43 45 38 53 Z"
        />
      );
    case "bob":
      return (
        <path
          fill={color}
          d="M38 51 C38 37 48 31 60 31 C72 31 82 37 82 51 C78 45 72 42 66 43 L60 47 L54 43 C48 42 42 45 38 51 Z"
        />
      );
  }
}

/** A teardrop flame centred at (x, y), `s` times the base size. */
function Flame({
  x,
  y,
  s,
  delay,
  id,
}: {
  x: number;
  y: number;
  s: number;
  delay: number;
  id: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="buddy-flame" style={{ animationDelay: `${delay}ms` }}>
        <path
          fill={`url(#${id}-flame)`}
          d="M0 -28 C7 -18 15 -11 12 0 C11 7 5 11 0 11 C-5 11 -11 7 -12 0 C-15 -11 -7 -18 0 -28 Z"
        />
        <path
          fill="#ffe08a"
          opacity=".9"
          d="M0 -12 C3 -7 7 -3 6 2 C5 6 2 8 0 8 C-2 8 -5 6 -6 2 C-7 -3 -3 -7 0 -12 Z"
        />
      </g>
    </g>
  );
}

/**
 * A study buddy: an original chibi character at their desk. Idle naps, a break gets a mug,
 * and a running session builds up: focused, a headband from 1 h, flames from 2 h, a blaze
 * from 3 h. Pure SVG; animation is CSS and respects reduced motion.
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
  const id = useId().replace(/:/g, "");
  const studying = typeof level === "number";
  const atDesk = studying || level === "paused";
  const lv = typeof level === "number" ? level : 0;
  const [inner, outer] = BACKDROP[String(level)]!;
  const tone =
    level === "paused"
      ? "#f5b544"
      : lv >= 4
        ? "#ff5a36"
        : lv === 3
          ? "#ff8a3d"
          : lv === 2
            ? "#ffc53d"
            : lv === 1
              ? "#d7ff3a"
              : "#8a8a96";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", lv >= 4 && "buddy-aura", className)}
      style={{ "--buddy-tone": tone } as CSSProperties}
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor={inner} />
          <stop offset="1" stopColor={outer} />
        </radialGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff3d1f" />
          <stop offset=".55" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ffd23f" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="60" cy="60" r="58" />
        </clipPath>
      </defs>

      <circle cx="60" cy="60" r="58" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Flames behind the character from 2 h. */}
        {lv >= 3 && (
          <g>
            <Flame id={id} x={26} y={80} s={1} delay={0} />
            <Flame id={id} x={94} y={80} s={1} delay={180} />
            {lv >= 4 && (
              <>
                <Flame id={id} x={60} y={40} s={1.9} delay={90} />
                <Flame id={id} x={18} y={58} s={0.9} delay={260} />
                <Flame id={id} x={102} y={58} s={0.9} delay={340} />
              </>
            )}
          </g>
        )}

        <g className={cn(studying && "buddy-bob")}>
          <HairBack style={b.hairStyle} color={b.hair} />
          {/* Body */}
          <path fill={b.shirt} d="M20 122 C20 94 38 82 60 82 C82 82 100 94 100 122 Z" />
          <path fill="rgba(0,0,0,.12)" d="M50 82 L60 92 L70 82 Z" />
          <rect x="54" y="72" width="12" height="12" rx="4" fill={b.skin} />
          {/* Head */}
          <circle cx="38.5" cy="57" r="4" fill={b.skin} />
          <circle cx="81.5" cy="57" r="4" fill={b.skin} />
          <circle cx="60" cy="54" r="22" fill={b.skin} />
          <HairFront style={b.hairStyle} color={b.hair} />

          {/* Face */}
          {level === "idle" ? (
            <g stroke="#2a1d17" strokeWidth="1.8" strokeLinecap="round" fill="none">
              <path d="M49 58 Q52 60.5 55 58" />
              <path d="M65 58 Q68 60.5 71 58" />
              <path d="M58 66 Q60 67 62 66" />
            </g>
          ) : (
            <g>
              <circle
                cx="52"
                cy={studying ? 58.5 : 57}
                r="2.4"
                fill={lv >= 4 ? "#ffd23f" : "#2a1d17"}
              />
              <circle
                cx="68"
                cy={studying ? 58.5 : 57}
                r="2.4"
                fill={lv >= 4 ? "#ffd23f" : "#2a1d17"}
              />
              <circle cx="47" cy="63" r="3" fill="#ff7a8a" opacity=".28" />
              <circle cx="73" cy="63" r="3" fill="#ff7a8a" opacity=".28" />
              {lv >= 2 ? (
                <path
                  d="M56.5 66.5 L63.5 66.5"
                  stroke="#2a1d17"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M56 65.5 Q60 68.5 64 65.5"
                  stroke="#2a1d17"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {lv >= 2 && (
                <g stroke="#2a1d17" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M47.5 51.5 L55.5 53.5" />
                  <path d="M72.5 51.5 L64.5 53.5" />
                </g>
              )}
            </g>
          )}

          {b.accessory === "glasses" && (
            <g stroke="#1c1a1f" strokeWidth="1.8" fill="rgba(255,255,255,.14)">
              <circle cx="52" cy="57.5" r="5.6" />
              <circle cx="68" cy="57.5" r="5.6" />
              <path d="M57.6 57.5 L62.4 57.5" fill="none" />
            </g>
          )}
          {b.accessory === "headphones" && (
            <g>
              <path
                d="M36 54 C35 27 85 27 84 54"
                stroke="#26262e"
                strokeWidth="4.5"
                fill="none"
                strokeLinecap="round"
              />
              <rect x="31.5" y="49" width="8" height="14" rx="3.5" fill="#26262e" />
              <rect x="80.5" y="49" width="8" height="14" rx="3.5" fill="#26262e" />
              <rect x="33" y="52" width="2.5" height="8" rx="1.2" fill={tone} opacity=".9" />
              <rect x="84.5" y="52" width="2.5" height="8" rx="1.2" fill={tone} opacity=".9" />
            </g>
          )}

          {/* A headband from 1 h, and a drop of sweat from 2 h. */}
          {lv >= 2 && (
            <g>
              <path
                fill="#e5484d"
                d="M38.5 45 C46 39.5 74 39.5 81.5 45 L82 49.5 C74 44 46 44 38 49.5 Z"
              />
              <path fill="#e5484d" d="M81 46 L92 41.5 L90 48 Z" />
              <path fill="#c93a3f" d="M81 48 L91 53 L86 55 Z" />
            </g>
          )}
          {lv >= 3 && (
            <path fill="#7dd3fc" d="M80 38 C77.5 42.5 77.5 45 80 46.5 C82.5 45 82.5 42.5 80 38 Z" />
          )}

          {/* The screen's light on the face while studying. */}
          {studying && <ellipse cx="60" cy="72" rx="26" ry="13" fill={tone} opacity=".14" />}
        </g>

        {/* Desk */}
        <rect x="0" y="103" width="120" height="20" fill="#2b221d" />
        <rect x="0" y="103" width="120" height="2" fill="#4a3a30" />
        {atDesk ? (
          <g>
            <path fill="#c7cad3" d="M38 104 L43 82 L77 82 L82 104 Z" />
            <path fill="#aeb2bd" d="M38 104 L82 104 L84 106 L36 106 Z" />
            <circle cx="60" cy="93" r="3.2" fill={tone} className={cn(studying && "buddy-glow")} />
          </g>
        ) : (
          <path fill="#9ea2ad" d="M42 101 L78 101 L81 104 L39 104 Z" />
        )}
        {level === "paused" && (
          <g>
            <rect x="88" y="91" width="11" height="13" rx="2.5" fill="#f4efe6" />
            <path d="M99 94 C104 94 104 101 99 101" stroke="#f4efe6" strokeWidth="2" fill="none" />
            <path
              className="buddy-steam"
              d="M92 88 C90 85 94 83 92 80 M96 88 C94 85 98 83 96 80"
              stroke="#ffffff"
              strokeOpacity=".55"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>

      {level === "idle" && (
        <g
          fill="#ffffff"
          className="buddy-zz"
          fontFamily="ui-monospace, monospace"
          fontWeight="700"
        >
          <text x="84" y="32" fontSize="11" opacity=".75">
            z
          </text>
          <text x="93" y="22" fontSize="8" opacity=".5">
            z
          </text>
        </g>
      )}
      <circle
        cx="60"
        cy="60"
        r="58"
        fill="none"
        stroke={tone}
        strokeOpacity={studying ? 0.55 : 0.18}
        strokeWidth="2"
      />
    </svg>
  );
}

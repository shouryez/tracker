import type { ReactNode } from "react";

/**
 * Hand-drawn chibi study buddies (original art, one skin tone for everyone): they differ by
 * vibe, i.e. hair, outfit and accessories. viewBox 0 0 120 120, a bust facing forward. The
 * pose changes with the study state (eyes closed when idle, at a laptop when studying).
 */

const INK = "#5b4033";
const SKIN = "#fde4d2";
const BLUSH = "#f6a29b";
const S = {
  stroke: INK,
  strokeWidth: 1.6,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

const HAIR = {
  brown: "#8b5d40",
  dark: "#5b3b29",
  black: "#2f2723",
  light: "#a97a55",
  chestnut: "#74452d",
};

type Art = { back?: ReactNode; front: ReactNode; outfit: ReactNode; over?: ReactNode };

const body = (fill: string) => (
  <path {...S} fill={fill} d="M24 124 C24 99 38 87 60 87 C82 87 96 99 96 124 Z" />
);

/** The twelve buddies' hair, outfit and accessories. */
const ARTS: Record<string, Art> = {
  // ---------------------------------------------------------------- boys
  "b-scout": {
    front: (
      <>
        <path
          {...S}
          fill={HAIR.brown}
          d="M29 58 C26 33 42 21 60 21 C79 21 95 33 91 58 C89 52 87 48 84 45 C81 51 76 52 72 47 C69 53 63 53 60 47 C56 53 50 53 47 47 C43 52 38 51 36 46 C33 49 31 53 29 58 Z"
        />
        <path {...S} fill="none" d="M57 21 C58 16 63 14 66 17" />
      </>
    ),
    outfit: (
      <>
        {body("#8cc0ec")}
        <path {...S} fill="#f2c14e" d="M45 89 L60 106 L75 89 C68 94 52 94 45 89 Z" />
        <circle {...S} cx="60" cy="93" r="3.4" fill="#e7ad2f" />
      </>
    ),
  },
  "b-prep": {
    front: (
      <path
        {...S}
        fill={HAIR.dark}
        d="M29 57 C27 32 43 21 61 21 C80 21 94 33 91 56 C89 50 87 46 84 44 L80 51 C76 46 71 43 65 43 C63 48 58 51 52 50 C55 47 56 44 55 42 C48 46 41 47 35 46 C33 49 31 53 29 57 Z"
      />
    ),
    outfit: (
      <>
        {body("#f6dc8c")}
        <path {...S} fill="#7fa36b" d="M24 124 C24 101 35 90 49 88 L56 124 Z" />
        <path {...S} fill="#7fa36b" d="M96 124 C96 101 85 90 71 88 L64 124 Z" />
        <path {...S} fill="#e98a4a" d="M57 89 L63 89 L64 106 L60 111 L56 106 Z" />
        <path {...S} fill="#fff8ec" d="M50 88 L60 93 L70 88 L66 86 L60 89 L54 86 Z" />
      </>
    ),
  },
  "b-soft": {
    front: (
      <>
        <path
          {...S}
          fill={HAIR.light}
          d="M29 61 C26 34 42 21 60 21 C78 21 94 34 91 61 C89 51 84 44 77 41 C71 39 64 41 61 47 C58 41 51 39 44 41 C37 44 31 51 29 61 Z"
        />
        <path {...S} fill="none" d="M60 24 C61 32 61 40 61 46" />
      </>
    ),
    outfit: (
      <>
        {body("#fffaf3")}
        <path {...S} fill="#f4b3c2" d="M24 124 C24 100 36 89 50 87 L54 98 L52 124 Z" />
        <path {...S} fill="#f4b3c2" d="M96 124 C96 100 84 89 70 87 L66 98 L68 124 Z" />
        <path {...S} fill="#f9c9d4" d="M50 87 L56 97 L49 99 Z M70 87 L64 97 L71 99 Z" />
      </>
    ),
  },
  "b-beanie": {
    front: (
      <>
        <path
          {...S}
          fill={HAIR.chestnut}
          d="M31 57 C33 64 38 63 41 58 C44 64 50 63 52 58 C55 63 62 63 64 58 C67 63 74 63 77 58 C80 63 86 63 89 57 L89 52 L31 52 Z"
        />
        <path {...S} fill="#f3eee2" d="M28 53 C27 30 42 17 60 17 C78 17 93 30 92 53 Z" />
        <path {...S} fill="#e7e0cf" d="M26 49 C40 43 80 43 94 49 L94 57 C80 51 40 51 26 57 Z" />
        <path
          stroke={INK}
          strokeOpacity=".35"
          strokeWidth="1.2"
          d="M38 47 V54 M48 45.5 V52.5 M60 45 V52 M72 45.5 V52.5 M82 47 V54"
        />
        <rect {...S} x="66" y="30" width="13" height="7" rx="2" fill="#f7f4ec" />
      </>
    ),
    outfit: (
      <>
        {body("#a8d3b0")}
        <path {...S} fill="#fffaf2" d="M48 88 C52 94 68 94 72 88 C68 86 52 86 48 88 Z" />
      </>
    ),
  },
  "b-denim": {
    front: (
      <>
        <path
          {...S}
          fill={HAIR.black}
          d="M29 58 C25 36 40 21 60 21 C80 21 95 35 91 58 C90 52 88 49 85 47 C84 53 80 55 77 50 C73 55 68 55 65 49 C62 55 56 56 53 50 C49 55 43 54 41 48 C38 52 33 54 29 58 Z"
        />
        <path
          {...S}
          fill={HAIR.black}
          d="M47 24 C49 15 56 14 58 21 Z M63 22 C66 14 73 15 74 23 Z"
        />
      </>
    ),
    outfit: (
      <>
        {body("#86aee0")}
        <path
          {...S}
          fill="#a9c7ee"
          d="M44 88 L60 100 L51 103 L41 92 Z M76 88 L60 100 L69 103 L79 92 Z"
        />
        <path stroke={INK} strokeWidth="1.4" d="M60 100 V124" />
        <circle cx="60" cy="108" r="1.6" fill={INK} />
        <circle cx="60" cy="117" r="1.6" fill={INK} />
      </>
    ),
  },
  "b-cap": {
    front: (
      <>
        <path
          {...S}
          fill={HAIR.brown}
          d="M31 50 C29 57 31 62 34 64 L38 52 Z M89 50 C91 57 89 62 86 64 L82 52 Z"
        />
        <path {...S} fill="#f4efe3" d="M30 51 C29 30 43 19 60 19 C77 19 91 30 90 51 Z" />
        <path
          {...S}
          fill="#ebe4d3"
          d="M27 49 C40 42 80 42 94 47 C99 50 98 55 91 55 C79 51 44 51 30 55 C26 55 25 51 27 49 Z"
        />
        <path
          fill="#7bb38f"
          d="M60 26 L62.2 31 L67.5 31.3 L63.4 34.6 L64.8 39.8 L60 36.8 L55.2 39.8 L56.6 34.6 L52.5 31.3 L57.8 31 Z"
        />
      </>
    ),
    outfit: (
      <>
        {body("#f8d867")}
        <path {...S} fill="#8aaed6" d="M42 124 L44 101 L76 101 L78 124 Z" />
        <path
          {...S}
          fill="#8aaed6"
          d="M44 101 L40 89 L45 88 L49 101 Z M76 101 L80 89 L75 88 L71 101 Z"
        />
        <circle {...S} cx="47" cy="104" r="2" fill="#f8d867" />
        <circle {...S} cx="73" cy="104" r="2" fill="#f8d867" />
      </>
    ),
  },
  // ---------------------------------------------------------------- girls
  "g-bun": {
    back: (
      <>
        <circle {...S} cx="60" cy="19" r="13" fill={HAIR.dark} />
        <path {...S} fill="none" d="M52 14 C56 10 64 10 67 15 M50 22 C55 26 66 26 70 21" />
      </>
    ),
    front: (
      <>
        <path
          {...S}
          fill={HAIR.dark}
          d="M30 61 C27 36 42 26 60 26 C78 26 93 36 90 61 C88 51 84 45 78 42 C70 39 62 41 58 45 C52 40 42 42 37 48 C33 52 31 56 30 61 Z"
        />
        <path {...S} fill="none" d="M32 61 C30 70 34 76 31 83 M88 61 C90 70 86 76 89 83" />
        <ellipse {...S} cx="60" cy="29" rx="9" ry="4" fill="#f59ab8" />
      </>
    ),
    outfit: (
      <>
        {body("#f7b3c6")}
        <path {...S} fill="#fffaf5" d="M48 88 L60 103 L72 88 C66 91 54 91 48 88 Z" />
        <path {...S} fill="#ef7fa2" d="M55 96 L60 99 L65 96 L65 101 L60 99 L55 101 Z" />
      </>
    ),
  },
  "g-waves": {
    back: (
      <path
        {...S}
        fill={HAIR.chestnut}
        d="M29 55 C24 30 44 21 60 21 C76 21 96 30 91 55 C97 70 92 84 99 98 C95 106 99 112 93 118 L27 118 C21 112 25 106 21 98 C28 84 23 70 29 55 Z"
      />
    ),
    front: (
      <>
        <path
          {...S}
          fill={HAIR.chestnut}
          d="M31 66 C28 38 44 26 60 26 C76 26 92 38 89 66 C86 53 80 43 70 38 C66 40 62 43 60 47 C58 43 54 40 50 38 C40 43 34 53 31 66 Z"
        />
        <path
          {...S}
          fill="#f48fb1"
          d="M76 36 C76 33 80 33 80 36 C80 33 84 33 84 36 C84 39 80 41 80 42 C80 41 76 39 76 36 Z"
        />
      </>
    ),
    outfit: (
      <>
        {body("#c9b6ec")}
        <path
          {...S}
          fill="#fffaf5"
          d="M46 88 C48 96 58 96 60 90 C62 96 72 96 74 88 C66 86 54 86 46 88 Z"
        />
        <path
          fill="#fffaf5"
          d="M57 106 C57 104 59.5 104 60 106 C60.5 104 63 104 63 106 C63 108 60 110 60 110 C60 110 57 108 57 106 Z"
        />
      </>
    ),
  },
  "g-braids": {
    back: (
      <g {...S} fill={HAIR.black}>
        {[66, 75, 84, 93].map((y) => (
          <ellipse key={`l${y}`} cx={33 - (y - 66) * 0.08} cy={y} rx="6" ry="5.2" />
        ))}
        {[66, 75, 84, 93].map((y) => (
          <ellipse key={`r${y}`} cx={87 + (y - 66) * 0.08} cy={y} rx="6" ry="5.2" />
        ))}
        <path d="M30 98 L28 106 L34 106 L33 98 Z M90 98 L92 106 L86 106 L87 98 Z" />
      </g>
    ),
    front: (
      <>
        <path
          {...S}
          fill={HAIR.black}
          d="M30 64 C27 39 43 28 60 28 C77 28 93 39 90 64 C89 56 88 52 86 49 C82 53 78 53 75 49 C71 53 66 53 63 49 C59 53 54 53 51 49 C47 53 42 53 39 49 C36 52 32 56 30 64 Z"
        />
        <ellipse {...S} cx="57" cy="28" rx="31" ry="11" fill="#f5e6c6" />
        <path {...S} fill="#f5e6c6" d="M56 17 L58 12 L61 17 Z" />
        <path {...S} fill="#b07a4b" d="M76 31 L81 28 L81 34 Z M86 31 L81 28 L81 34 Z" />
      </>
    ),
    outfit: (
      <>
        {body("#f6e7c8")}
        <path stroke="#9a6b43" strokeWidth="3" strokeLinecap="round" d="M40 92 L74 124" />
        <circle {...S} cx="66" cy="104" r="5" fill="#c68b5a" />
        <circle cx="63.5" cy="100.5" r="1.8" fill="#c68b5a" stroke={INK} strokeWidth="1" />
        <circle cx="68.5" cy="100.5" r="1.8" fill="#c68b5a" stroke={INK} strokeWidth="1" />
      </>
    ),
  },
  "g-bow": {
    back: (
      <path
        {...S}
        fill={HAIR.light}
        d="M29 56 C26 30 44 22 60 22 C76 22 94 30 91 56 L95 116 L25 116 Z"
      />
    ),
    front: (
      <>
        <path
          {...S}
          fill={HAIR.light}
          d="M31 64 C28 37 44 26 60 26 C76 26 92 37 89 64 C87 53 82 46 76 43 C68 44 58 46 50 52 C52 47 54 44 54 42 C44 45 36 52 31 64 Z"
        />
        <path
          {...S}
          fill="#f7d36b"
          d="M60 24 L44 15 C40 15 39 28 44 29 Z M60 24 L76 15 C80 15 81 28 76 29 Z"
        />
        <circle {...S} cx="60" cy="23" r="4" fill="#f2c445" />
      </>
    ),
    outfit: (
      <>
        {body("#f8e08e")}
        <path
          {...S}
          fill="#fffaf5"
          d="M46 88 C48 96 58 96 60 90 C62 96 72 96 74 88 C66 86 54 86 46 88 Z"
        />
        <path {...S} fill="none" stroke="#e0a53a" d="M60 92 L56 100 M60 92 L64 100" />
        <circle cx="60" cy="108" r="1.5" fill="#e0a53a" />
        <circle cx="60" cy="116" r="1.5" fill="#e0a53a" />
      </>
    ),
  },
  "g-cap": {
    back: (
      <path
        {...S}
        fill={HAIR.dark}
        d="M28 56 C26 40 40 31 60 31 C80 31 94 40 92 56 C96 70 93 81 98 92 C90 97 85 92 84 87 L36 87 C35 92 30 97 22 92 C27 81 24 70 28 56 Z"
      />
    ),
    front: (
      <>
        <path
          {...S}
          fill={HAIR.dark}
          d="M31 62 C30 46 40 41 60 41 C80 41 90 46 89 62 C87 56 85 54 83 52 C79 56 74 56 71 52 C67 56 62 56 60 52 C57 56 52 56 49 52 C46 56 41 56 37 52 C34 55 32 58 31 62 Z"
        />
        <path {...S} fill="#f7a8c0" d="M29 47 C28 28 43 18 60 18 C77 18 92 28 91 47 Z" />
        <path
          {...S}
          fill="#f392b0"
          d="M26 46 C42 40 78 40 94 46 C96 50 92 53 88 51 C76 47 44 47 32 51 C28 53 24 50 26 46 Z"
        />
        <path
          fill="#fffaf5"
          d="M56 29 C56 26.5 59.5 26.5 60 29 C60.5 26.5 64 26.5 64 29 C64 31.5 60 34 60 34 C60 34 56 31.5 56 29 Z"
        />
      </>
    ),
    outfit: (
      <>
        {body("#f8b9cc")}
        <path {...S} fill="#f6a5bd" d="M42 90 C46 98 74 98 78 90 C70 86 50 86 42 90 Z" />
        <path stroke={INK} strokeWidth="1.3" d="M54 96 V106 M66 96 V106" />
        <circle cx="54" cy="107" r="1.6" fill="#fffaf5" stroke={INK} strokeWidth="1" />
        <circle cx="66" cy="107" r="1.6" fill="#fffaf5" stroke={INK} strokeWidth="1" />
      </>
    ),
  },
  "g-pony": {
    back: (
      <path
        {...S}
        fill={HAIR.brown}
        d="M74 24 C97 18 106 40 99 60 C96 73 101 86 93 96 C89 83 88 72 86 61 C84 46 80 35 72 30 Z"
      />
    ),
    front: (
      <>
        <path
          {...S}
          fill={HAIR.brown}
          d="M30 62 C27 36 43 25 60 25 C78 25 93 36 90 62 C88 53 84 47 79 44 C70 44 60 47 52 53 C54 48 55 45 55 43 C45 46 36 53 30 62 Z"
        />
        <ellipse
          {...S}
          cx="76"
          cy="26"
          rx="5"
          ry="6.5"
          fill="#8fc3ef"
          transform="rotate(-25 76 26)"
        />
        <g {...S} fill="#a9d4f7" fillOpacity=".85">
          <path
            d="M40 34 C40 29 47 29 48 34 C49 29 56 29 56 34 C56 40 48 44 48 44 C48 44 40 40 40 34 Z"
            transform="rotate(-8 48 36)"
          />
          <path
            d="M64 33 C64 28 71 28 72 33 C73 28 80 28 80 33 C80 39 72 43 72 43 C72 43 64 39 64 33 Z"
            transform="rotate(8 72 35)"
          />
        </g>
        <path {...S} fill="none" d="M55 35 C58 33 62 33 65 34" />
      </>
    ),
    outfit: (
      <>
        {body("#fffaf5")}
        <path stroke="#8fbde8" strokeWidth="3.4" d="M27 108 H93 M25 117 H95 M33 99 H87" />
        <path {...S} fill="none" d="M24 124 C24 99 38 87 60 87 C82 87 96 99 96 124" />
        <path stroke={INK} strokeWidth="1.6" d="M46 89 L48 97 M74 89 L72 97" />
        <path {...S} fill="#8fbde8" d="M56 94 L60 97 L64 94 L64 98 L60 97 L56 98 Z" />
      </>
    ),
  },
};

export const ART_IDS = Object.keys(ARTS);

export type ArtPose = {
  /** Eyes closed, a little nap. */
  asleep: boolean;
  /** Sitting at the laptop. */
  atDesk: boolean;
  /** Determined brows from 1 h; a sweat drop from 2 h. */
  intensity: 0 | 1 | 2;
};

/** One buddy's portrait as SVG content (no <svg> wrapper), in the given pose. */
export function BuddyArt({ id, pose }: { id: string; pose: ArtPose }) {
  const a = ARTS[id] ?? ARTS["b-scout"]!;
  const eyeY = pose.atDesk ? 59.5 : 58;
  return (
    <g>
      {a.back}
      {a.outfit}
      <rect {...S} x="54" y="79" width="12" height="10" rx="3" fill={SKIN} />
      {/* Ears, head */}
      <ellipse {...S} cx="31.5" cy="59" rx="5" ry="5.6" fill={SKIN} />
      <ellipse {...S} cx="88.5" cy="59" rx="5" ry="5.6" fill={SKIN} />
      <ellipse {...S} cx="60" cy="55" rx="29" ry="27" fill={SKIN} />
      {/* Face */}
      <ellipse cx="44" cy="67" rx="5.4" ry="3.2" fill={BLUSH} opacity=".7" />
      <ellipse cx="76" cy="67" rx="5.4" ry="3.2" fill={BLUSH} opacity=".7" />
      {pose.asleep ? (
        <g {...S} fill="none" strokeWidth="1.8">
          <path d="M45 59 Q49.5 62.5 54 59" />
          <path d="M66 59 Q70.5 62.5 75 59" />
        </g>
      ) : (
        <g>
          <ellipse cx="49.5" cy={eyeY} rx="3.3" ry="4.2" fill="#3b2a22" />
          <ellipse cx="70.5" cy={eyeY} rx="3.3" ry="4.2" fill="#3b2a22" />
          <circle cx="50.8" cy={eyeY - 1.6} r="1.2" fill="#fff" />
          <circle cx="71.8" cy={eyeY - 1.6} r="1.2" fill="#fff" />
        </g>
      )}
      {pose.intensity >= 1 && !pose.asleep && (
        <g {...S} fill="none" strokeWidth="1.7">
          <path d="M44.5 51 L53.5 53" />
          <path d="M75.5 51 L66.5 53" />
        </g>
      )}
      {pose.asleep ? (
        <ellipse cx="60" cy="68" rx="1.8" ry="1.4" fill="#c46f6a" />
      ) : pose.intensity >= 1 ? (
        <path {...S} fill="none" d="M57 68.5 Q60 70 63 68.5" />
      ) : (
        <path {...S} fill="none" d="M56.5 67.5 Q60 71 63.5 67.5" />
      )}
      {pose.intensity >= 2 && (
        <path
          stroke={INK}
          strokeWidth="1.2"
          fill="#9fd6f5"
          d="M84 40 C81.5 44.5 81.5 47 84 48.5 C86.5 47 86.5 44.5 84 40 Z"
        />
      )}
      {a.front}
      {a.over}
      {/* The laptop, seen from behind, with a heart sticker. */}
      {pose.atDesk && (
        <g>
          <rect {...S} x="39" y="103" width="42" height="26" rx="5" fill="#e6e1fb" />
          <path
            fill="#f59ab8"
            d="M57.5 113 C57.5 111 60 111 60 113 C60 111 62.5 111 62.5 113 C62.5 115 60 116.6 60 116.6 C60 116.6 57.5 115 57.5 113 Z"
          />
        </g>
      )}
    </g>
  );
}

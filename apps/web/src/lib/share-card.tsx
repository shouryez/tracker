import "server-only";
import { ImageResponse } from "next/og";
import { WORDMARK } from "@upsolve/ui/brand";

// Share card (DESIGN.md §9.5): dark, serif name, heatmap, three big numbers,
// the DSA करो wordmark. 1200×630, rendered by next/og (flexbox only, no grid).

export type ShareCardData = {
  name: string;
  subtitle: string | null;
  handle: string | null;
  solved: number;
  streak: number;
  /** Best current contest rating, or active days when unrated. */
  third: { value: string; label: string };
  /** Activity level 0–4 per day, oldest first (26 weeks). */
  heatmap: number[];
};

const INK = "#f4f4f6";
const MUTED = "#a3a3b5";
const LIME = "#d7ff3a";
// Same 5-step ramp as the app heatmap (tokens.css heat-0..4): empty → violet → lime.
const PIXELS = ["rgba(255,255,255,0.07)", "#2c2f6b", "#4d57d9", "#9aa2ff", LIME];
const STAT_TINT = ["#a48bff", "#ff7a45", "#ffb938"];

/** Fetches a Google Font as TTF (older user agents get TTF, which next/og needs). */
async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`,
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.30" } },
      )
    ).text();
    const url = /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

let fonts: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[]
> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    googleFont("Instrument Serif", 400),
    googleFont("Geist", 400),
    googleFont("Geist", 600),
  ]).then(([serif, regular, bold]) => {
    const out: { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[] = [];
    if (serif) out.push({ name: "Serif", data: serif, weight: 400, style: "normal" });
    if (regular) out.push({ name: "Geist", data: regular, weight: 400, style: "normal" });
    if (bold) out.push({ name: "Geist", data: bold, weight: 600, style: "normal" });
    if (out.length === 0) fonts = null; // offline: retry next time, render with the default font
    return out;
  });
  return fonts;
}

export async function shareCard(d: ShareCardData, init: { download?: string } = {}) {
  const weeks = 26;
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, day) => d.heatmap[w * 7 + day] ?? 0),
  );
  const stat = (value: string, label: string, i: number) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontFamily: "Geist",
          fontWeight: 600,
          fontSize: 68,
          letterSpacing: -3,
          color: INK,
        }}
      >
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: STAT_TINT[i] }} />
        <div
          style={{
            fontFamily: "Geist",
            fontSize: 18,
            color: MUTED,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        backgroundColor: "#08080b",
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(124,92,255,0.55) 0%, rgba(8,8,11,0) 45%), radial-gradient(circle at 100% 100%, rgba(215,255,58,0.18) 0%, rgba(8,8,11,0) 40%), radial-gradient(circle at 85% 10%, rgba(110,123,255,0.35) 0%, rgba(8,8,11,0) 40%)",
        color: INK,
        fontFamily: "Geist",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* The DSA करो wordmark: one headline bar across the name, filling lime. */}
          <svg
            height="40"
            width={Math.round((40 * WORDMARK.width) / WORDMARK.height)}
            viewBox={WORDMARK.viewBox}
          >
            <path d={WORDMARK.dsa} fill={INK} />
            <path d={WORDMARK.karo} fill={INK} />
            <rect {...WORDMARK.bar} fill={INK} />
            <rect {...WORDMARK.bar} width={WORDMARK.bar.width * WORDMARK.fill} fill={LIME} />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            fontSize: 18,
            color: MUTED,
          }}
        >
          {d.handle ? `dsakaro.site/u/${d.handle}` : "DSA practice, remembered"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
          <div
            style={{
              fontFamily: "Serif",
              fontSize: 100,
              lineHeight: 1,
              letterSpacing: -2,
              color: INK,
            }}
          >
            {d.name}
          </div>
          {d.subtitle && (
            <div style={{ fontSize: 26, color: MUTED, marginTop: 14 }}>{d.subtitle}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {columns.map((col, w) => (
            <div key={w} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {col.map((level, day) => (
                <div
                  key={day}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: PIXELS[Math.min(4, level)],
                    border:
                      w === weeks - 1 && day === 6 ? `2px solid ${LIME}` : "2px solid transparent",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 80,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 30,
        }}
      >
        {stat(d.solved.toLocaleString("en-IN"), "problems solved", 0)}
        {stat(`${d.streak}`, "day streak", 1)}
        {stat(d.third.value, d.third.label, 2)}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: await loadFonts(),
      headers: {
        "Cache-Control": "public, max-age=3600",
        ...(init.download
          ? { "Content-Disposition": `attachment; filename="${init.download}"` }
          : {}),
      },
    },
  );
}

import "server-only";
import { ImageResponse } from "next/og";
import { WORDMARK } from "@upsolve/ui/brand";

// Share card in the Orbit look: ink ground, Inter Tight name, a mint heatmap, three big
// numbers and the DSA करो wordmark; optionally a milestone headline. 1200×630, next/og.

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
  /** A milestone to celebrate, e.g. "100 problems solved". */
  milestone?: string | null;
};

const INK = "#f3f1ec";
const MUTED = "#a19e98";
const MINT = "#86d9c2";
const EMBER = "#f0884f";
// The app's heatmap ramp: empty → deep mint → mint.
const PIXELS = ["rgba(255,255,255,0.07)", "#1f3a33", "#2f6355", "#56a08b", MINT];
const STAT_TINT = [MINT, EMBER, "#9db5e8"];

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
export function loadFonts() {
  fonts ??= Promise.all([
    googleFont("Inter Tight", 600),
    googleFont("Geist", 400),
    googleFont("Geist", 600),
  ]).then(([serif, regular, bold]) => {
    const out: { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[] = [];
    if (serif) out.push({ name: "Display", data: serif, weight: 600, style: "normal" });
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
            letterSpacing: 0,
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
        backgroundColor: "#0b0b0c",
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.07) 0%, rgba(11,11,12,0) 45%), radial-gradient(circle at 100% 100%, rgba(134,217,194,0.16) 0%, rgba(11,11,12,0) 40%), radial-gradient(circle at 88% 8%, rgba(240,136,79,0.16) 0%, rgba(11,11,12,0) 40%)",
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
            <rect {...WORDMARK.bar} width={WORDMARK.bar.width * WORDMARK.fill} fill={MINT} />
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
          {d.milestone && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                marginBottom: 18,
                borderRadius: 999,
                background: "rgba(240,136,79,0.16)",
                border: "1px solid rgba(240,136,79,0.45)",
                color: EMBER,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {d.milestone}
            </div>
          )}
          <div
            style={{
              fontFamily: "Display",
              fontWeight: 600,
              fontSize: d.milestone ? 84 : 96,
              lineHeight: 1,
              letterSpacing: -4,
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
                      w === weeks - 1 && day === 6 ? `2px solid ${MINT}` : "2px solid transparent",
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

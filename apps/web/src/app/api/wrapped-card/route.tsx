import { ImageResponse } from "next/og";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getWeekReview } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { getLearning, getTopicTargets, masteryOf } from "@/lib/learning";
import { loadFonts } from "@/lib/share-card";
import { WRAPPED_TONE, wrappedCards } from "@/lib/wrapped";

/**
 * One Weekly Wrapped card as a 1080×1350 PNG (FRONTEND-PLAN B7), for saving and sharing.
 * Signed-in only, and drawn from your own week on the server: no text comes from the URL,
 * just which card (`?card=solved`).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return new Response("Sign in first", { status: 401 });
  const id = new URL(request.url).searchParams.get("card") ?? "intro";
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const now = Date.now();
  const [week, learning, targets] = await Promise.all([
    getWeekReview(user.id, tz, now),
    getLearning(user.id),
    getTopicTargets(),
  ]);
  const weakest =
    masteryOf(learning, targets, now)
      .filter((m) => m.solved > 0)
      .sort((a, b) => a.score - b.score)[0] ?? null;
  const cards = wrappedCards(week, weakest);
  const card = cards.find((c) => c.id === id);
  if (!card) return new Response("Not found", { status: 404 });
  const tone = WRAPPED_TONE[card.tone];
  const bigSize = card.big.length > 14 ? 84 : card.big.length > 6 ? 128 : 240;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 88,
        color: "#f3f1ec",
        backgroundColor: "#0b0b0c",
        backgroundImage: `radial-gradient(circle at 15% 0%, ${tone}55 0%, rgba(11,11,12,0) 55%)`,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: "#a19e98" }}
      >
        <span style={{ fontFamily: "Display" }}>DSA karo · my week</span>
        <span>dsakaro.site</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <span style={{ fontSize: 40, fontWeight: 600, color: tone }}>{card.kicker}</span>
        <span
          style={{
            fontFamily: "Display",
            fontSize: bigSize,
            lineHeight: 0.95,
            letterSpacing: -6,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {card.big}
        </span>
        {card.unit && <span style={{ fontSize: 52, color: "#c9c5bd" }}>{card.unit}</span>}
        <span style={{ fontSize: 40, lineHeight: 1.35, color: "#d8d4cc", maxWidth: 820 }}>
          {card.line}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {cards.map((c) => (
          <span
            key={c.id}
            style={{
              height: 8,
              flex: 1,
              borderRadius: 4,
              background: c.id === card.id ? tone : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: await loadFonts(),
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="dsakaro-week-${card.id}.png"`,
      },
    },
  );
}

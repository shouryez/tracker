import { z } from "zod";
import { videoWatches } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db } from "@/lib/db";

const MIN_MS = 20_000;
const MAX_MS = 6 * 3_600_000;

const View = z.object({
  sheetId: z.uuid().nullable(),
  itemKey: z.string().min(1).max(300).nullable(),
  title: z.string().trim().min(1).max(300),
  url: z
    .url()
    .max(500)
    .refine(
      (u) => /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(u),
      "YouTube links only",
    ),
  startedAt: z.number().int(),
  watchedMs: z.number().int().min(MIN_MS).max(MAX_MS),
});

/**
 * A video watched in the app's player, for the study-session summary. Sent with
 * `fetch(..., { keepalive: true })` when the player closes or the page is left.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return new Response(null, { status: 204 });
  const parsed = View.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad view" }, { status: 400 });
  const v = parsed.data;
  const now = Date.now();
  // The view must have happened recently, and can't have lasted longer than it's been open.
  if (
    v.startedAt > now ||
    v.startedAt < now - 24 * 3_600_000 ||
    v.watchedMs > now - v.startedAt + 5_000
  ) {
    return Response.json({ error: "Bad time" }, { status: 400 });
  }
  try {
    await db()
      .insert(videoWatches)
      .values({
        userId: user.id,
        sheetId: v.sheetId,
        itemKey: v.itemKey,
        title: v.title,
        url: v.url,
        startedAt: new Date(v.startedAt),
        watchedMs: v.watchedMs,
      });
  } catch {
    // An unknown sheet id fails the foreign key; log the view without it.
    await db()
      .insert(videoWatches)
      .values({
        userId: user.id,
        title: v.title,
        url: v.url,
        startedAt: new Date(v.startedAt),
        watchedMs: v.watchedMs,
      });
  }
  return new Response(null, { status: 204 });
}

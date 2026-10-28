import { ExtSaveRequest } from "@upsolve/contracts";
import { savedItems } from "@upsolve/db";
import { classifySaved } from "@/lib/daily-data";
import { db } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";

/** Save-for-later from the extension popup or right-click menu. */
export async function POST(request: Request) {
  return handleExtPost(request, ExtSaveRequest, async (userId, body) => {
    if (!/^https?:/.test(body.url)) return 0;
    const title = body.title.trim() || new URL(body.url).hostname;
    const { kind, topic } = classifySaved(body.url, title);
    await db()
      .insert(savedItems)
      .values({
        userId,
        url: body.url,
        title: title.slice(0, 300),
        kind,
        topic,
        atSeconds: body.atSeconds,
      })
      .onConflictDoUpdate({
        target: [savedItems.userId, savedItems.url],
        set: { atSeconds: body.atSeconds, doneAt: null },
      });
    return 1;
  });
}

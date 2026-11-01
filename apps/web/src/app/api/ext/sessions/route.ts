import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { ExtSessionsRequest } from "@upsolve/contracts";
import { userTag } from "@/lib/db";
import { saveExtSessions } from "@/lib/ext-ingest";
import { handleExtPost } from "@/lib/ext-route";
import { syncAfterSolve } from "@/lib/sync";

/** Timed sessions from the extension (PLAN.md §5.4). Idempotent per session clientId. */
export async function POST(request: Request) {
  return handleExtPost(request, ExtSessionsRequest, async (userId, body) => {
    const stored = await saveExtSessions(userId, body.sessions);
    // A solve: pull that platform's new totals in the background, so the dashboard follows.
    const solvedOn = new Set(
      body.sessions.filter((s) => s.outcome === "solved").map((s) => s.platform),
    );
    if (solvedOn.size)
      after(async () => {
        for (const p of solvedOn) await syncAfterSolve(userId, p);
        revalidateTag(userTag(userId), { expire: 0 });
      });
    return stored;
  });
}

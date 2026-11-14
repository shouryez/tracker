import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { ExtCodeRequest } from "@upsolve/contracts";
import { insertSubmissions, linkCatalog, submissionCode } from "@upsolve/db";
import { aiEnabled } from "@/lib/ai";
import { runAutopsy } from "@/lib/autopsy";
import { db, userTag } from "@/lib/db";
import { handleExtPost } from "@/lib/ext-route";
import { ensureLeetcodeProblems } from "@/lib/leetcode-problems";

/**
 * The code of one submission, captured by the extension on submit (FINAL-FEATURES A2).
 * Stores the submission if the session upload hasn't yet, then its code; a failed one is
 * sent for WA autopsy in the background.
 */
export async function POST(request: Request) {
  return handleExtPost(request, ExtCodeRequest, async (userId, body) => {
    const ids = await ensureLeetcodeProblems([{ slug: body.titleSlug, title: body.title }]);
    await linkCatalog(db());
    const sub = body.submission;
    await insertSubmissions(db(), userId, body.platform, "extension", [
      {
        platformProblemId: ids.get(body.titleSlug)!,
        externalId: sub.id,
        verdict: sub.verdict,
        language: sub.language,
        runtimeMs: sub.runtimeMs,
        memoryKb: sub.memoryKb,
        submittedAt: new Date(sub.at),
      },
    ]);
    const [row] = (await db().execute(sql`
      select id from submissions
      where user_id = ${userId} and platform = ${body.platform} and external_id = ${sub.id}`)) as unknown as {
      id: string;
    }[];
    if (!row) return 0;
    await db()
      .insert(submissionCode)
      .values({
        submissionId: row.id,
        userId,
        language: sub.language,
        code: body.code,
        failingInput: body.failingInput,
        expected: body.expected,
        actual: body.actual,
      })
      .onConflictDoNothing();
    if (sub.verdict !== "AC" && sub.verdict !== "CE" && aiEnabled())
      after(async () => {
        if (await runAutopsy(userId, row.id)) revalidateTag(userTag(userId), { expire: 0 });
      });
    return 1;
  });
}

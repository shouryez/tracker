import "server-only";
import { revalidateTag } from "next/cache";
import type { z } from "zod";
import { authenticateExtension, unauthorized } from "@/lib/ext-auth";
import { userTag } from "@/lib/db";

const MAX_BODY_BYTES = 1_000_000;

/**
 * Shared wrapper for extension POST endpoints: token auth, size limit,
 * schema validation, then cache invalidation so the dashboard shows new data.
 */
export async function handleExtPost<S extends z.ZodType>(
  request: Request,
  schema: S,
  save: (userId: string, body: z.infer<S>) => Promise<number>,
): Promise<Response> {
  const userId = await authenticateExtension(request);
  if (!userId) return unauthorized();

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return Response.json({ ok: false, error: "Request too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: `Invalid ${issue?.path.join(".") || "body"}: ${issue?.message}` },
      { status: 422 },
    );
  }

  try {
    const stored = await save(userId, parsed.data);
    revalidateTag(userTag(userId), { expire: 0 });
    return Response.json({ ok: true, stored });
  } catch (err) {
    console.error("[ext] save failed", err);
    return Response.json({ ok: false, error: "Couldn't save. Will retry." }, { status: 500 });
  }
}

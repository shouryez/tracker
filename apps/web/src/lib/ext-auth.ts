import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { extensionTokens } from "@upsolve/db";
import { db } from "@/lib/db";

const TOUCH_EVERY_MS = 5 * 60 * 1000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a new extension token. The plain value is shown once and never stored. */
export async function issueExtensionToken(userId: string, label: string | null): Promise<string> {
  const token = `ups_${randomBytes(32).toString("base64url")}`;
  await db()
    .insert(extensionTokens)
    .values({ userId, tokenHash: hashToken(token), label: label?.slice(0, 80) ?? null });
  return token;
}

/** Resolves `Authorization: Bearer ups_…` to a user id, or null. */
export async function authenticateExtension(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (ups_[A-Za-z0-9_-]{43})$/.exec(header);
  if (!match) return null;

  const hash = hashToken(match[1]!);
  const [row] = await db()
    .select({ id: extensionTokens.id, userId: extensionTokens.userId })
    .from(extensionTokens)
    .where(and(eq(extensionTokens.tokenHash, hash), isNull(extensionTokens.revokedAt)));
  if (!row) return null;

  // Record usage at most every few minutes, so Settings can show "last used".
  const now = new Date();
  await db()
    .update(extensionTokens)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(extensionTokens.id, row.id),
        or(
          isNull(extensionTokens.lastUsedAt),
          lt(extensionTokens.lastUsedAt, new Date(now.getTime() - TOUCH_EVERY_MS)),
        ),
      ),
    );
  return row.userId;
}

export function unauthorized() {
  return Response.json(
    { ok: false, error: "Extension not connected. Open the extension and connect again." },
    { status: 401 },
  );
}

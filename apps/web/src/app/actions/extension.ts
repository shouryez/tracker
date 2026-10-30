"use server";

import { and, eq, isNull } from "drizzle-orm";
import { updateTag } from "next/cache";
import { extensionTokens } from "@upsolve/db";
import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { db, userTag } from "@/lib/db";
import { issueExtensionToken } from "@/lib/ext-auth";

/** Issues a token for the extension. Returned once, handed to the extension via postMessage. */
export async function createExtensionToken(
  label: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, error: "Sign in first." };
  const token = await issueExtensionToken(user.id, label.trim() || null);
  updateTag(userTag(user.id));
  return { ok: true, token };
}

export async function revokeExtensionToken(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return;
  await db()
    .update(extensionTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(extensionTokens.id, id),
        eq(extensionTokens.userId, user.id),
        isNull(extensionTokens.revokedAt),
      ),
    );
  updateTag(userTag(user.id));
}

// DsaKaro

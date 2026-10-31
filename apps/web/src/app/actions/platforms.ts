"use server";

import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import {
  HandleNotFoundError,
  PlatformError,
  getAdapter,
  newVerifyCode,
  normaliseHandle,
  type Platform,
} from "@upsolve/adapters";
import { platformAccounts, profiles } from "@upsolve/db";
import { getCurrentUser, isDemoUser, type CurrentUser } from "@/lib/auth";
import { CONNECTABLE } from "@/lib/data";
import { db, userTag } from "@/lib/db";
import { syncAccount } from "@/lib/sync";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireUser(): Promise<CurrentUser | ActionResult> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, error: "Sign in first." };
  return user;
}

async function ownedAccount(userId: string, accountId: string) {
  const [account] = await db()
    .select()
    .from(platformAccounts)
    .where(and(eq(platformAccounts.id, accountId), eq(platformAccounts.userId, userId)));
  return account ?? null;
}

async function invalidate(userId: string) {
  updateTag(userTag(userId));
  const [p] = await db()
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  if (p?.handle) updateTag(`profile:${p.handle}`);
}

export async function connectPlatform(
  platform: Platform,
  rawHandle: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if ("ok" in user) return user;
  if (!(CONNECTABLE as readonly string[]).includes(platform)) {
    return { ok: false, error: "That platform isn't supported yet." };
  }
  const handle = normaliseHandle(rawHandle);
  if (!handle) return { ok: false, error: "That doesn't look like a valid handle." };

  // Check the handle exists before saving anything.
  let snapshot;
  try {
    snapshot = await getAdapter(platform).fetchSnapshot(handle);
  } catch (err) {
    if (err instanceof HandleNotFoundError || err instanceof PlatformError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  const [account] = await db()
    .insert(platformAccounts)
    .values({ userId: user.id, platform, handle: snapshot.handle })
    .onConflictDoUpdate({
      target: [platformAccounts.userId, platformAccounts.platform],
      // Changing handle resets verification and history cursor.
      set: {
        handle: snapshot.handle,
        verifiedAt: null,
        verifyCode: null,
        verifyRequestedAt: null,
        syncCursor: null,
        snapshot: null,
        status: "pending",
        lastError: null,
      },
    })
    .returning({ id: platformAccounts.id });

  const result = await syncAccount(account!.id, user.id, { snapshot });
  await invalidate(user.id);
  return result.ok ? { ok: true, message: `Connected ${snapshot.handle}.` } : result;
}

export async function syncPlatform(accountId: string): Promise<ActionResult> {
  const user = await requireUser();
  if ("ok" in user) return user;
  const result = await syncAccount(accountId, user.id);
  await invalidate(user.id);
  return result.ok ? { ok: true, message: "Synced." } : result;
}

/** Called by the dashboard on load; refreshes any account older than 6 hours. */
export async function syncStaleAccounts(): Promise<{ synced: number }> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { synced: 0 };
  const accounts = await db()
    .select({ id: platformAccounts.id })
    .from(platformAccounts)
    .where(eq(platformAccounts.userId, user.id));
  let synced = 0;
  for (const a of accounts) {
    const r = await syncAccount(a.id, user.id, { onlyIfStale: true });
    if (r.ok) synced++;
  }
  await invalidate(user.id);
  return { synced };
}

export async function startVerification(accountId: string): Promise<ActionResult> {
  const user = await requireUser();
  if ("ok" in user) return user;
  const account = await ownedAccount(user.id, accountId);
  if (!account) return { ok: false, error: "Account not found." };
  if (account.verifiedAt) return { ok: true, message: "Already verified." };

  await db()
    .update(platformAccounts)
    .set({ verifyCode: account.verifyCode ?? newVerifyCode(), verifyRequestedAt: new Date() })
    .where(eq(platformAccounts.id, account.id));
  updateTag(userTag(user.id));
  return { ok: true };
}

export async function checkVerification(accountId: string): Promise<ActionResult> {
  const user = await requireUser();
  if ("ok" in user) return user;
  const account = await ownedAccount(user.id, accountId);
  if (!account?.verifyCode || !account.verifyRequestedAt) {
    return { ok: false, error: "Start verification first." };
  }

  try {
    const result = await getAdapter(account.platform).verify(account.handle, {
      code: account.verifyCode,
      requestedAt: account.verifyRequestedAt,
    });
    if (!result.ok) return { ok: false, error: result.reason };
  } catch (err) {
    if (err instanceof PlatformError || err instanceof HandleNotFoundError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  await db()
    .update(platformAccounts)
    .set({ verifiedAt: new Date(), verifyCode: null, verifyRequestedAt: null })
    .where(eq(platformAccounts.id, account.id));
  await invalidate(user.id);
  return { ok: true, message: "Verified. You can remove the code from your profile now." };
}

export async function disconnectPlatform(accountId: string): Promise<ActionResult> {
  const user = await requireUser();
  if ("ok" in user) return user;
  const account = await ownedAccount(user.id, accountId);
  if (!account) return { ok: false, error: "Account not found." };
  // Removing a platform removes its history too; reconnecting re-syncs it. One statement,
  // so it's all-or-nothing without a transaction (our pool runs one query per connection
  // at a time, which postgres.js can't combine with sql.begin).
  await db().execute(sql`
    with gone as (
      delete from platform_accounts where id = ${account.id} and user_id = ${user.id}
      returning platform
    ), subs as (
      delete from submissions
      where user_id = ${user.id} and platform = (select platform from gone)
    ), contests as (
      delete from contest_results
      where user_id = ${user.id} and platform = (select platform from gone)
    )
    select count(*)::int as n from gone`);
  await invalidate(user.id);
  return { ok: true, message: "Disconnected." };
}

import "server-only";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  HandleNotFoundError,
  PlatformError,
  getAdapter,
  type PlatformSnapshot,
} from "@upsolve/adapters";
import { linkCatalog, platformAccounts, saveContests, saveSubmissions } from "@upsolve/db";
import { db } from "@/lib/db";

/** Data older than this is refreshed automatically when the dashboard opens. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
/** A sync that started longer ago than this is assumed dead and may be retried. */
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

export type SyncOutcome = { ok: true } | { ok: false; error: string };

/**
 * Pulls snapshot, submissions and contests for one account and stores them.
 * Takes a row lock via `sync_started_at` so concurrent syncs don't overlap.
 * With `onlyIfStale`, does nothing when the account synced recently.
 */
export async function syncAccount(
  accountId: string,
  userId: string,
  opts: { onlyIfStale?: boolean; snapshot?: PlatformSnapshot } = {},
): Promise<SyncOutcome> {
  const now = new Date();
  const lockExpired = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_MS);

  const [account] = await db()
    .update(platformAccounts)
    .set({ syncStartedAt: now })
    .where(
      and(
        eq(platformAccounts.id, accountId),
        eq(platformAccounts.userId, userId),
        or(isNull(platformAccounts.syncStartedAt), lt(platformAccounts.syncStartedAt, lockExpired)),
        opts.onlyIfStale
          ? or(
              isNull(platformAccounts.lastSyncedAt),
              lt(platformAccounts.lastSyncedAt, staleBefore),
            )
          : undefined,
      ),
    )
    .returning();

  if (!account) {
    return opts.onlyIfStale ? { ok: true } : { ok: false, error: "A sync is already running." };
  }

  try {
    const adapter = getAdapter(account.platform);
    const snapshot = opts.snapshot ?? (await adapter.fetchSnapshot(account.handle));
    const { submissions: subs, cursor } = await adapter.fetchSubmissions(
      snapshot.handle,
      account.syncCursor,
    );
    const contests = await adapter.fetchContests(snapshot.handle);

    await saveSubmissions(db(), userId, account.platform, subs);
    await linkCatalog(db());
    await saveContests(db(), userId, account.platform, contests);

    await db()
      .update(platformAccounts)
      .set({
        handle: snapshot.handle, // platform's canonical casing
        snapshot,
        syncCursor: { ...account.syncCursor, ...cursor },
        status: "ok",
        lastError: null,
        lastSyncedAt: new Date(),
        syncStartedAt: null,
      })
      .where(eq(platformAccounts.id, account.id));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof HandleNotFoundError || err instanceof PlatformError
        ? err.message
        : "Something went wrong while syncing. We'll retry later.";
    if (!(err instanceof HandleNotFoundError) && !(err instanceof PlatformError)) {
      console.error(`[sync] ${account.platform}/${account.handle}`, err);
    }
    await db()
      .update(platformAccounts)
      .set({
        status: err instanceof PlatformError && err.retryable ? "rate_limited" : "error",
        lastError: message,
        syncStartedAt: null,
      })
      .where(eq(platformAccounts.id, account.id));
    return { ok: false, error: message };
  }
}

import "server-only";
import { waitUntil } from "@vercel/functions";
import { createDb, DB_IDLE_TIMEOUT_S, type Db } from "@upsolve/db";

const globalForDb = globalThis as unknown as { __upsolveDb?: Db };

/** Shared Drizzle client. Reused across hot reloads in dev so connections don't pile up. */
export function db(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See apps/web/.env.example.");
  keepAliveUntilIdle();
  return (globalForDb.__upsolveDb ??= createDb(url));
}

// Vercel freezes a function once no request is running. A query still in flight then
// stops mid-message, the pooler holds its connection until the statement timeout, and
// every query queued behind it hangs. Like `attachDatabasePool` (which only knows `pg`-style
// pools), keep the function alive until the pool's connections have gone idle and closed.
// Outside Vercel there is no request context and `waitUntil` does nothing.
const KEEP_ALIVE_MS = (DB_IDLE_TIMEOUT_S + 3) * 1000;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let releaseIdle: () => void = () => {};

function keepAliveUntilIdle() {
  if (!process.env.VERCEL) return;
  if (idleTimer) {
    clearTimeout(idleTimer);
    releaseIdle();
  }
  waitUntil(new Promise<void>((resolve) => (releaseIdle = resolve)));
  idleTimer = setTimeout(() => {
    idleTimer = null;
    releaseIdle();
  }, KEEP_ALIVE_MS);
}

/** Cache tag for everything derived from one user's data. */
export const userTag = (userId: string) => `user:${userId}`;

import "server-only";
import { createDb, type Db } from "@upsolve/db";

const globalForDb = globalThis as unknown as { __upsolveDb?: Db };

/** Shared Drizzle client. Reused across hot reloads in dev so connections don't pile up. */
export function db(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See apps/web/.env.example.");
  return (globalForDb.__upsolveDb ??= createDb(url));
}

/** Cache tag for everything derived from one user's data. */
export const userTag = (userId: string) => `user:${userId}`;

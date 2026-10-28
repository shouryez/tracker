import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Seconds an unused connection stays open. Serverless hosts keep the function alive this long. */
export const DB_IDLE_TIMEOUT_S = 5;

/**
 * Creates a Drizzle client. `prepare: false` keeps it compatible with
 * Supabase's transaction-mode connection pooler (port 6543).
 *
 * The pool stays small and closes idle connections quickly: Supabase's session pooler
 * (port 5432) allows only ~15 clients in total, shared by the dev server,
 * scripts and migrations. Over that, queries fail with "max clients reached".
 * On Vercel one instance serves many requests at once (a dashboard visit plus its
 * prefetches runs ~150 queries), so a single connection would queue all of them.
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: DB_IDLE_TIMEOUT_S,
    // Recycle connections so one left in a bad state by a frozen function doesn't live on.
    max_lifetime: 60 * 5,
    connect_timeout: 15,
  });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** Whether the user has a password (never the hash itself). Null if it can't be read. */
export async function getHasPassword(userId: string): Promise<boolean | null> {
  try {
    const [row] = (await db().execute(sql`
      select coalesce(encrypted_password, '') <> '' as has
      from auth.users where id = ${userId}`)) as unknown as { has: boolean }[];
    return row ? Boolean(row.has) : null;
  } catch {
    return null;
  }
}

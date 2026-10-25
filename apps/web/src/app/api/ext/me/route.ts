import { and, eq, gte, sql } from "drizzle-orm";
import type { ExtMeResponse } from "@upsolve/contracts";
import { practiceSessions, profiles } from "@upsolve/db";
import { db } from "@/lib/db";
import { authenticateExtension, unauthorized } from "@/lib/ext-auth";

/** Who the extension is connected as, plus today's numbers for the popup. */
export async function GET(request: Request) {
  const userId = await authenticateExtension(request);
  if (!userId) return unauthorized();

  const [profile] = await db()
    .select({ name: profiles.name, handle: profiles.handle, timezone: profiles.timezone })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  const tz = profile?.timezone ?? "Asia/Kolkata";
  // Midnight today in the user's timezone.
  const startOfDay = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`;

  const [today] = await db()
    .select({
      sessions: sql<number>`count(*)::int`,
      solved: sql<number>`count(*) filter (where ${practiceSessions.outcome} = 'solved')::int`,
      activeMs: sql<number>`coalesce(sum(${practiceSessions.activeMs}), 0)::int`,
    })
    .from(practiceSessions)
    .where(and(eq(practiceSessions.userId, userId), gte(practiceSessions.startedAt, startOfDay)));

  const body: ExtMeResponse = {
    user: { name: profile?.name ?? null, handle: profile?.handle ?? null },
    today: today ?? { sessions: 0, solved: 0, activeMs: 0 },
    dashboardUrl: new URL("/dashboard", request.url).toString(),
  };
  return Response.json(body);
}

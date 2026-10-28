import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { getLiveSession } from "@/lib/sessions-data";

/** What you're solving right now, for the "Now solving" card. Polled; never cached. */
export async function GET() {
  const user = await getCurrentUser();
  const session = isDemoUser(user) ? null : await getLiveSession(user.id);
  return Response.json(
    { session, serverNow: Date.now() },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

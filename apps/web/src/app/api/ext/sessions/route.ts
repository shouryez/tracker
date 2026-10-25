import { ExtSessionsRequest } from "@upsolve/contracts";
import { saveExtSessions } from "@/lib/ext-ingest";
import { handleExtPost } from "@/lib/ext-route";

/** Timed sessions from the extension (PLAN.md §5.4). Idempotent per session clientId. */
export async function POST(request: Request) {
  return handleExtPost(request, ExtSessionsRequest, (userId, body) =>
    saveExtSessions(userId, body.sessions),
  );
}

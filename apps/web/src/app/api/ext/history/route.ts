import { ExtHistoryRequest } from "@upsolve/contracts";
import { saveExtHistory } from "@/lib/ext-ingest";
import { handleExtPost } from "@/lib/ext-route";

/** Past LeetCode submissions imported from the user's account. Duplicates are ignored. */
export async function POST(request: Request) {
  return handleExtPost(request, ExtHistoryRequest, (userId, body) =>
    saveExtHistory(userId, body.items),
  );
}

// DsaKaro

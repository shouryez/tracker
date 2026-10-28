import { eq } from "drizzle-orm";
import { collegeVerifications } from "@upsolve/db";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** A pending college ID photo, for the admin review page only. Never cached anywhere. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/verifications/[id]/image">,
) {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await db()
    .select({ image: collegeVerifications.image, type: collegeVerifications.imageType })
    .from(collegeVerifications)
    .where(eq(collegeVerifications.id, id));
  if (!row?.image || !row.type) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: {
      "Content-Type": row.type,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}

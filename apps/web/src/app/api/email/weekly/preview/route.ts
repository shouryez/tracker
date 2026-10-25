import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { buildDigest, emailLinks } from "@/lib/weekly-email";
import { renderWeeklyEmail } from "@/lib/weekly-email-render";

/** The signed-in user's weekly email, as it would be sent today. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return new Response("Sign in first.", { status: 401 });
  const digest = await buildDigest(user.id);
  if (!digest) return new Response("Finish onboarding first.", { status: 404 });
  const { html } = renderWeeklyEmail(digest, emailLinks(new URL(request.url).origin, user.id));
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

import { getCurrentUser, isDemoUser } from "@/lib/auth";
import { buildReminder } from "@/lib/daily-email";
import { renderDailyReminder } from "@/lib/daily-email-render";
import { emailLinks } from "@/lib/weekly-email";

/** The signed-in user's daily reminder email, as it would be sent right now. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return new Response("Sign in first.", { status: 401 });
  const reminder = await buildReminder(user.id);
  if (!reminder)
    return new Response("Nothing due and nothing left on today's list, so no email today.", {
      status: 404,
    });
  const origin = new URL(request.url).origin;
  const links = emailLinks(origin, user.id, "daily");
  const { html } = renderDailyReminder(reminder, {
    revision: links.revision,
    today: `${origin}/dashboard/today`,
    settings: `${origin}/dashboard/settings#reminders`,
    unsubscribe: links.unsubscribe,
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

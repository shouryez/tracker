import type { ExtTodayResponse } from "@upsolve/contracts";
import { getUpcomingContests } from "@/lib/contest-calendar";
import { bestHour, getActiveFocus, getUnseenNudges } from "@/lib/daily-data";
import { getProfile } from "@/lib/data";
import { authenticateExtension, unauthorized } from "@/lib/ext-auth";
import { getLearning, getTopicTargets, masteryOf, revisionQueue } from "@/lib/learning";
import { getTodayPlan } from "@/lib/plan";

/**
 * Polled by the extension's background worker every few minutes: what's due, the
 * reminder hour, contests starting soon, new nudges and a running focus session.
 */
export async function GET(request: Request) {
  const userId = await authenticateExtension(request);
  if (!userId) return unauthorized();
  const now = Date.now();
  const profile = await getProfile(userId);
  const tz = profile?.timezone ?? "Asia/Kolkata";
  const cap = profile?.reviewCap ?? 5;

  const [learning, targets, plan, contests, nudges, focus, hour] = await Promise.all([
    getLearning(userId),
    getTopicTargets(),
    getTodayPlan(userId, tz, cap, now),
    getUpcomingContests(),
    getUnseenNudges(userId),
    getActiveFocus(userId),
    profile?.reminderHour != null ? Promise.resolve(profile.reminderHour) : bestHour(userId, tz),
  ]);
  const queue = revisionQueue(learning, masteryOf(learning, targets, now), { tz, cap, now });

  const body: ExtTodayResponse = {
    timezone: tz,
    remindersOn: profile?.remindersOn ?? true,
    reminderHour: hour,
    due: queue.today.length,
    planLeft: plan.total - plan.done,
    planTotal: plan.total,
    contestReminders: profile?.contestReminders ?? true,
    contests: contests
      .filter((c) => c.startsAt > now && c.startsAt < now + 6 * 3_600_000)
      .map((c) => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        startsAt: c.startsAt,
        url: c.url,
      })),
    nudges: nudges.map((n) => ({ id: n.id, from: n.from, group: n.group })),
    // A paused session isn't sent: the extension stops tracking until it's resumed.
    focus:
      focus && !focus.pausedAt
        ? { id: focus.id, startedAt: focus.startedAt, label: focus.label }
        : null,
    dashboardUrl: new URL("/dashboard", request.url).toString(),
  };
  return Response.json(body);
}

// DsaKaro

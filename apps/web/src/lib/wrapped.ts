import type { WeekReview } from "@/lib/daily-data";

/**
 * Weekly Wrapped (FRONTEND-PLAN §9.2): the week as 5–8 story cards, built from the weekly
 * review. Pure, so the page and the image route (api/wrapped-card) say exactly the same thing.
 */
export type WrappedTone = "ember" | "mint" | "sky" | "sand" | "rose";
export type WrappedCard = {
  id: string;
  kicker: string;
  big: string;
  unit?: string;
  line: string;
  tone: WrappedTone;
  href?: string;
  cta?: string;
};

const day = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });

const vs = (now: number, prev: number, what: string) =>
  prev === 0
    ? now > 0
      ? `Up from none last week.`
      : `Same as last week.`
    : now === prev
      ? `Same as last week.`
      : now > prev
        ? `${now - prev} more ${what} than last week.`
        : `${prev - now} fewer ${what} than last week.`;

export function wrappedCards(
  week: WeekReview,
  weakest: { label: string; score: number; topic: string } | null,
): WrappedCard[] {
  const focusH = Math.round((week.progress.focusMs / 3_600_000) * 10) / 10;
  const cards: WrappedCard[] = [
    {
      id: "intro",
      kicker: `Week of ${new Date(`${week.weekStart}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`,
      big: "Your week,",
      unit: "wrapped.",
      line: "Tap to go through it. Save any card to share.",
      tone: "ember",
    },
    {
      id: "solved",
      kicker: "New problems",
      big: String(week.progress.solved),
      unit: week.progress.solved === 1 ? "problem" : "problems",
      line: vs(week.progress.solved, week.lastWeek.solved, "problems"),
      tone: "mint",
    },
  ];
  if (week.progress.mediums > 0 || week.goals.mediums > 0)
    cards.push({
      id: "mediums",
      kicker: "Mediums",
      big: String(week.progress.mediums),
      unit: `of ${week.goals.mediums}`,
      line:
        week.progress.mediums >= week.goals.mediums
          ? "Target met. The middle of the curve is where interviews live."
          : `${week.goals.mediums - week.progress.mediums} short of your target.`,
      tone: "sand",
    });
  if (week.hardest)
    cards.push({
      id: "hardest",
      kicker: "Hardest solve",
      big: week.hardest.title,
      line: week.hardest.difficulty
        ? `A ${week.hardest.difficulty}. Worth remembering.`
        : "Worth remembering.",
      tone: "rose",
    });
  cards.push({
    id: "revisions",
    kicker: "Revisions",
    big: String(week.progress.revisions),
    unit: week.progress.revisions === 1 ? "re-solve" : "re-solves",
    line: vs(week.progress.revisions, week.lastWeek.revisions, "revisions"),
    tone: "sky",
  });
  if (week.progress.focusMs > 0)
    cards.push({
      id: "focus",
      kicker: "Focus",
      big: String(focusH),
      unit: "hours",
      line:
        focusH >= week.goals.focusHours
          ? `Past your ${week.goals.focusHours}-hour target. No fake hours: idle time never counts.`
          : `${Math.round((week.goals.focusHours - focusH) * 10) / 10} hours short of your target.`,
      tone: "ember",
    });
  if (week.bestDay)
    cards.push({
      id: "best",
      kicker: "Best day",
      big: day(week.bestDay.date),
      line: `${week.bestDay.solved} solved. Do that again.`,
      tone: "mint",
    });
  if (weakest)
    cards.push({
      id: "weakest",
      kicker: "Next week",
      big: weakest.label,
      line: `Your weakest topic (${weakest.score}/100). One stretch problem moves it.`,
      tone: "rose",
      href: "/dashboard/analytics#mastery",
      cta: "Practise it",
    });
  return cards;
}

export const WRAPPED_TONE: Record<WrappedTone, string> = {
  ember: "#f0884f",
  mint: "#86d9c2",
  sky: "#9db5e8",
  sand: "#e2c27d",
  rose: "#f26d82",
};

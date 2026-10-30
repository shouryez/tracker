// "What to solve next" (PLAN.md §6.5): unsolved problems from the user's
// sheets in their weakest topics, at their comfortable level plus a nudge.
import type { TopicMastery } from "./mastery.ts";
import type { Difficulty } from "./srs.ts";
import { topicLabel, topicsOf, type TopicId } from "./topics.ts";

export type Candidate = {
  problemId: string;
  difficulty: Difficulty | null;
  tags: readonly string[];
};

export type Suggestion<C extends Candidate> = C & { topic: TopicId; reason: string };

const LEVELS: Difficulty[] = ["easy", "medium", "hard"];
/** Solves needed at a level before we nudge you up from it. */
const LEVEL_UP_AFTER = { easy: 15, medium: 30 } as const;
const MAX_PER_TOPIC = 2;

/** Comfortable level from how many problems of each difficulty you've solved. */
export function comfortableLevel(solved: Record<Difficulty, number>): Difficulty {
  if (solved.medium < LEVEL_UP_AFTER.easy) return "easy";
  if (solved.hard < LEVEL_UP_AFTER.easy || solved.medium < LEVEL_UP_AFTER.medium) return "medium";
  return "hard";
}

/**
 * Picks up to `n` candidates. Candidates must already exclude solved problems
 * and ones seen in the last 14 days, and come in sheet order (earlier = better).
 */
export function suggestNext<C extends Candidate>(
  candidates: C[],
  mastery: TopicMastery[],
  solved: Record<Difficulty, number>,
  n = 3,
): Suggestion<C>[] {
  const level = comfortableLevel(solved);
  const nudge = LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)]!;
  const allowed = new Set([level, nudge]);
  const score = new Map(mastery.map((m) => [m.topic, m.score]));

  const ranked = candidates
    .map((c, order) => {
      if (!c.difficulty || !allowed.has(c.difficulty)) return null;
      const topics = topicsOf(c.tags);
      if (topics.length === 0) return null;
      const topic = topics.reduce((a, b) => ((score.get(b) ?? 0) < (score.get(a) ?? 0) ? b : a));
      return { c, topic, weak: score.get(topic) ?? 0, order };
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.weak - b.weak || a.order - b.order);

  const perTopic = new Map<TopicId, number>();
  const out: Suggestion<C>[] = [];
  for (const r of ranked) {
    if (out.length >= n) break;
    const used = perTopic.get(r.topic) ?? 0;
    if (used >= MAX_PER_TOPIC) continue;
    perTopic.set(r.topic, used + 1);
    out.push({
      ...r.c,
      topic: r.topic,
      reason: `${topicLabel(r.topic)} is at ${r.weak}/100${r.c.difficulty === nudge && nudge !== level ? " · a step up" : ""}`,
    });
  }
  return out;
}

// DsaKaro

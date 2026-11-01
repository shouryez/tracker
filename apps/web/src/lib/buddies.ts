/**
 * Study buddies: the character each person picks in Settings, shown in groups and the
 * timer. Original chibi art (components/buddy-art.tsx): one skin tone for everyone, told
 * apart by vibe (hair, outfit, accessories).
 */

export type Buddy = {
  id: string;
  group: "boys" | "girls";
  /** For screen readers only; buddies have no names. */
  label: string;
};

export const BUDDIES: readonly Buddy[] = [
  { id: "b-scout", group: "boys", label: "Fluffy hair, blue tee and scarf" },
  { id: "b-prep", group: "boys", label: "Side fringe, vest and tie" },
  { id: "b-soft", group: "boys", label: "Middle part, pink open shirt" },
  { id: "b-beanie", group: "boys", label: "Beanie and green sweater" },
  { id: "b-denim", group: "boys", label: "Messy black hair, denim jacket" },
  { id: "b-cap", group: "boys", label: "Cap and overalls" },
  { id: "g-bun", group: "girls", label: "Top bun and pink cardigan" },
  { id: "g-waves", group: "girls", label: "Long waves and heart clip" },
  { id: "g-braids", group: "girls", label: "Braids and beret" },
  { id: "g-bow", group: "girls", label: "Long hair and yellow bow" },
  { id: "g-cap", group: "girls", label: "Pink cap and hoodie" },
  { id: "g-pony", group: "girls", label: "Ponytail and heart sunglasses" },
];

export const DEFAULT_BUDDY = "b-scout";

/** Picks saved before these buddies, mapped to a similar one. */
const LEGACY: Record<string, string> = {
  aarav: "b-scout",
  kabir: "b-prep",
  rehan: "b-denim",
  ananya: "g-waves",
  meera: "g-bun",
  zoya: "g-pony",
  "man-light": "b-scout",
  "man-medium": "b-soft",
  "man-dark": "b-denim",
  "woman-light": "g-bow",
  "woman-medium": "g-waves",
  "woman-dark": "g-braids",
  "person-medium-light": "b-beanie",
  "person-medium-dark": "g-cap",
};

export const buddyById = (id: string | null | undefined): Buddy => {
  const key = id ? (LEGACY[id] ?? id) : DEFAULT_BUDDY;
  return BUDDIES.find((b) => b.id === key) ?? BUDDIES.find((b) => b.id === DEFAULT_BUDDY)!;
};
export const isBuddyId = (id: unknown): id is string =>
  typeof id === "string" && BUDDIES.some((b) => b.id === id);

/**
 * How a buddy looks: idle (not studying), on a break (paused), then four levels that build
 * up with the session: focused, locked in at 1 h, on fire at 2 h, inferno from 3 h.
 */
export type BuddyLevel = "idle" | "paused" | 1 | 2 | 3 | 4;

const H = 3_600_000;
export function buddyLevel(state: "idle" | "paused" | "studying", sessionMs: number): BuddyLevel {
  if (state !== "studying") return state;
  return sessionMs >= 3 * H ? 4 : sessionMs >= 2 * H ? 3 : sessionMs >= H ? 2 : 1;
}

export const LEVEL_LABEL: Record<BuddyLevel, string> = {
  idle: "Idle",
  paused: "On a break",
  1: "Focused",
  2: "Locked in",
  3: "On fire",
  4: "Inferno",
};

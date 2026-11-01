/**
 * Study buddies: the 3D character each person picks in Settings, shown in groups and the
 * timer. Art: Microsoft Fluent Emoji 3D (MIT, public/buddies/LICENSE.txt).
 */

export type Buddy = {
  id: string;
  group: "boys" | "girls" | "anyone";
  /** For screen readers only; buddies have no names. */
  label: string;
};

export const BUDDIES: readonly Buddy[] = [
  { id: "man-light", group: "boys", label: "Boy, light skin" },
  { id: "man-medium", group: "boys", label: "Boy, medium skin" },
  { id: "man-dark", group: "boys", label: "Boy, dark skin" },
  { id: "woman-light", group: "girls", label: "Girl, light skin" },
  { id: "woman-medium", group: "girls", label: "Girl, medium skin" },
  { id: "woman-dark", group: "girls", label: "Girl, dark skin" },
  { id: "person-medium-light", group: "anyone", label: "Person, medium-light skin" },
  { id: "person-medium-dark", group: "anyone", label: "Person, medium-dark skin" },
];

export const DEFAULT_BUDDY = "person-medium-light";

/** Picks saved before the 3D buddies, mapped to the closest new one. */
const LEGACY: Record<string, string> = {
  aarav: "man-medium",
  kabir: "man-dark",
  rehan: "man-light",
  ananya: "woman-medium",
  meera: "woman-dark",
  zoya: "woman-light",
};

export const buddyById = (id: string | null | undefined): Buddy => {
  const key = id ? (LEGACY[id] ?? id) : DEFAULT_BUDDY;
  return BUDDIES.find((b) => b.id === key) ?? BUDDIES.find((b) => b.id === DEFAULT_BUDDY)!;
};
export const isBuddyId = (id: unknown): id is string =>
  typeof id === "string" && BUDDIES.some((b) => b.id === id);

/** At the laptop while studying, otherwise the plain portrait. */
export const buddyImage = (b: Buddy, atDesk: boolean) =>
  `/buddies/${b.id}-${atDesk ? "study" : "idle"}.png`;

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

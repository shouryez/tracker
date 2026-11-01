/** Study buddies: the character each person picks in Settings, shown in groups and the timer. */

export type HairStyle = "short" | "curly" | "spiky" | "long" | "bun" | "bob";
export type Buddy = {
  id: string;
  name: string;
  group: "boys" | "girls";
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  accessory: "glasses" | "headphones" | null;
};

export const BUDDIES: readonly Buddy[] = [
  {
    id: "aarav",
    name: "Aarav",
    group: "boys",
    skin: "#f1c27d",
    hair: "#1c1a1f",
    hairStyle: "short",
    shirt: "#5b7cfa",
    accessory: null,
  },
  {
    id: "kabir",
    name: "Kabir",
    group: "boys",
    skin: "#c68642",
    hair: "#2a1c14",
    hairStyle: "curly",
    shirt: "#22a06b",
    accessory: "glasses",
  },
  {
    id: "rehan",
    name: "Rehan",
    group: "boys",
    skin: "#e0ac69",
    hair: "#3b2a1f",
    hairStyle: "spiky",
    shirt: "#f97316",
    accessory: "headphones",
  },
  {
    id: "ananya",
    name: "Ananya",
    group: "girls",
    skin: "#f1c27d",
    hair: "#1c1a1f",
    hairStyle: "long",
    shirt: "#e1528f",
    accessory: null,
  },
  {
    id: "meera",
    name: "Meera",
    group: "girls",
    skin: "#c68642",
    hair: "#2a1c14",
    hairStyle: "bun",
    shirt: "#8b5cf6",
    accessory: "glasses",
  },
  {
    id: "zoya",
    name: "Zoya",
    group: "girls",
    skin: "#ffdbac",
    hair: "#6b3e26",
    hairStyle: "bob",
    shirt: "#0ea5a4",
    accessory: "headphones",
  },
];

export const DEFAULT_BUDDY = "aarav";
export const buddyById = (id: string | null | undefined) =>
  BUDDIES.find((b) => b.id === id) ?? BUDDIES.find((b) => b.id === DEFAULT_BUDDY)!;
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

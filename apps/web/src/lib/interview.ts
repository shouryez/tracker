import type { Difficulty } from "@upsolve/core";

/** Mock interview round types (FEATURES-PLAN F1), shared by the room and its actions. */
export const INTERVIEW_PRESETS = {
  screen: { label: "Screen", minutes: 30, mix: ["easy", "medium"] },
  phone: { label: "Phone round", minutes: 60, mix: ["medium", "medium"] },
  onsite: { label: "Onsite", minutes: 60, mix: ["medium", "hard"] },
  final: { label: "Final round", minutes: 90, mix: ["medium", "medium", "hard"] },
} as const satisfies Record<string, { label: string; minutes: number; mix: Difficulty[] }>;

export type InterviewPresetId = keyof typeof INTERVIEW_PRESETS;

export type InterviewProblem = {
  id: string;
  title: string;
  url: string;
  difficulty: Difficulty;
};

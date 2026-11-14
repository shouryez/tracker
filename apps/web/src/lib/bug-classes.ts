import type { MistakeTag } from "@upsolve/contracts";

// The fixed bug classes WA autopsy sorts failed submissions into (FINAL-FEATURES A2).
// Each maps to one of the wrap-up mistake tags, so the two stay one vocabulary.

export const BUG_CLASSES = {
  "off-by-one": {
    label: "Off by one",
    tag: "off-by-one",
    advice: "Check loop bounds and the first and last index before you submit.",
  },
  "wrong-condition": {
    label: "Wrong comparison",
    tag: "off-by-one",
    advice: "Say each condition out loud: < or <=, > or >=, and why.",
  },
  "index-out-of-bounds": {
    label: "Out of bounds",
    tag: "off-by-one",
    advice: "Before every arr[i ± 1], ask what happens at the ends.",
  },
  overflow: {
    label: "Integer overflow",
    tag: "overflow",
    advice: "Read the constraints first; multiply or add in 64-bit when values can pass 2·10⁹.",
  },
  "empty-or-single": {
    label: "Empty or single input",
    tag: "edge-case",
    advice: "Run your code in your head on n = 0 and n = 1 first.",
  },
  duplicates: {
    label: "Duplicates",
    tag: "edge-case",
    advice: "Ask what changes when values repeat.",
  },
  negatives: {
    label: "Negatives or zero",
    tag: "edge-case",
    advice: "Try one negative number and a zero before you submit.",
  },
  "base-case": {
    label: "Wrong base case",
    tag: "edge-case",
    advice: "Write the base cases first and test the smallest input against them.",
  },
  "init-or-reset": {
    label: "Bad initial value",
    tag: "edge-case",
    advice: "Check what each variable starts at, and whether it resets between iterations.",
  },
  "null-access": {
    label: "Null or empty access",
    tag: "edge-case",
    advice: "Guard every .next, .left and .top() with a null or empty check.",
  },
  "wrong-approach": {
    label: "Wrong approach",
    tag: "wrong-approach",
    advice: "Prove the idea on a small tricky example before coding it.",
  },
  "too-slow": {
    label: "Too slow",
    tag: "too-slow",
    advice: "Work out the complexity against the constraints before writing code.",
  },
  misread: {
    label: "Misread the problem",
    tag: "misread",
    advice: "Re-read the output format and constraints once more before submitting.",
  },
  "syntax-or-type": {
    label: "Syntax or type slip",
    tag: "syntax",
    advice: "Run the samples once before submitting.",
  },
} as const satisfies Record<string, { label: string; tag: MistakeTag; advice: string }>;

export type BugClass = keyof typeof BUG_CLASSES;

export const isBugClass = (v: unknown): v is BugClass =>
  typeof v === "string" && Object.hasOwn(BUG_CLASSES, v);

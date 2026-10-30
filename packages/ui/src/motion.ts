/**
 * Motion tokens for JS (motion/react). CSS durations and easings live in tokens.css.
 * UI feedback ≤ 160 ms, transitions 240–420 ms, decorative loops 8–20 s.
 */
export const DURATION = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.42,
  slower: 0.7,
} as const;

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const SPRING = {
  snappy: { type: "spring", stiffness: 500, damping: 30 },
  soft: { type: "spring", stiffness: 200, damping: 24 },
  bouncy: { type: "spring", stiffness: 400, damping: 15 },
} as const;

/** Stagger between siblings entering (cards, list rows). */
export const STAGGER = 0.05;

// DsaKaro

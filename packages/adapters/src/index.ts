import { codeforces } from "./codeforces.ts";
import { leetcode } from "./leetcode.ts";
import type { Platform, PlatformAdapter } from "./types.ts";

export * from "./types.ts";
export { topicName } from "./topics.ts";
export { ratingToDifficulty } from "./codeforces.ts";

/** Platforms with a working adapter. Others arrive in Phases 3 and 5. */
export const ADAPTERS: Partial<Record<Platform, PlatformAdapter>> = { leetcode, codeforces };

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = ADAPTERS[platform];
  if (!adapter) throw new Error(`No adapter for ${platform} yet`);
  return adapter;
}

/** Ownership code shown to the user, e.g. "upsolve-7Q2X". No look-alike characters. */
export function newVerifyCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `upsolve-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** Handles are case-insensitive on both platforms and only use these characters. */
export function normaliseHandle(handle: string): string | null {
  const h = handle.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_.-]{2,40}$/.test(h) ? h : null;
}

// Messages between the content scripts, the popup and the background worker.
import type { ExtHistoryItem, ExtMeResponse, ExtSession } from "@upsolve/contracts";

export type HistoryState = {
  status: "idle" | "running" | "done" | "error";
  /** Paging position, so an interrupted import resumes where it stopped. */
  offset: number;
  lastKey: string;
  /** Newest submission id fully imported; later runs stop when they reach it. */
  newestId: string | null;
  /** Newest id seen during the run in progress. */
  runNewestId: string | null;
  imported: number;
  finishedAt: number | null;
  lockUntil: number;
  error: string | null;
};

export type CurrentSession = {
  slug: string;
  title: string | null;
  status: "armed" | "active" | "paused" | "solved";
  activeMs: number;
  submits: number;
  updatedAt: number;
};

export type Status = {
  connected: boolean;
  authError: string | null;
  me: ExtMeResponse | null;
  pending: number;
  history: HistoryState | null;
  current: CurrentSession | null;
};

export type Message =
  | { type: "session:put"; session: ExtSession; flush: boolean }
  | { type: "history:put"; items: ExtHistoryItem[] }
  | { type: "auth:set"; token: string }
  | { type: "auth:clear" }
  | { type: "status" }
  | { type: "flush" };

export type PutResult = { ok: true; stored: number } | { ok: false; error: string; auth?: boolean };

/** Web page ↔ bridge content script (window.postMessage). */
export const WEB_SOURCE = "upsolve-web";
export const EXT_SOURCE = "upsolve-ext";
/** MAIN-world hook → isolated content script (window.postMessage). */
export const HOOK_SOURCE = "upsolve-hook";

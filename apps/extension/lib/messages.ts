// Messages between the content scripts, the popup and the background worker.
import type {
  ExtHistoryItem,
  ExtMeResponse,
  ExtProblemContext,
  ExtSession,
} from "@upsolve/contracts";
import type { LabTotals } from "./lab.ts";

export type { ExtProblemContext };

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
  /** Running Lab focus session, if any. */
  lab: (LabTotals & { focusId: string; startedAt: number }) | null;
};

export type Message =
  | { type: "session:put"; session: ExtSession; flush: boolean }
  | { type: "history:put"; items: ExtHistoryItem[] }
  | { type: "auth:set"; token: string }
  | { type: "auth:clear" }
  | { type: "status" }
  | { type: "flush" }
  | { type: "problem:context"; platform: ExtSession["platform"]; slug: string }
  | { type: "lab:start"; focusId: string; startedAt: number }
  | { type: "lab:status" }
  /** `report` uploads the totals (stopping from the popup); the web page reports its own. */
  | { type: "lab:stop"; report: boolean }
  | { type: "save:tab" }
  /** Ticks read from the user's own takeUforward sheet page. */
  | { type: "tuf:sync"; sheet: string; solved: string[]; removed: string[] };

export type PutResult = { ok: true; stored: number } | { ok: false; error: string; auth?: boolean };

/** Web page ↔ bridge content script (window.postMessage). */
export const WEB_SOURCE = "upsolve-web";
export const EXT_SOURCE = "upsolve-ext";
/** MAIN-world hook → isolated content script (window.postMessage). */
export const HOOK_SOURCE = "upsolve-hook";

/** Background → YouTube content script: the playing video's position, in seconds. */
export type YoutubeTimeRequest = { type: "yt:time" };

// DsaKaro

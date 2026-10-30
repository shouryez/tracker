import { PlatformError } from "./types.ts";

const USER_AGENT = "DsaKaro/0.1 (+https://github.com/shouryez/upsolve)";
const lastCall = new Map<string, number>();

/**
 * fetch with a timeout and a per-host minimum gap between calls,
 * so one process never hammers a platform (Codeforces asks for ≤ 1 call / 2 s).
 */
export async function politeFetch(
  url: string,
  init: RequestInit & { minGapMs?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { minGapMs = 0, timeoutMs = 15_000, ...rest } = init;
  const host = new URL(url).host;

  const wait = (lastCall.get(host) ?? 0) + minGapMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall.set(host, Date.now());

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: { "User-Agent": USER_AGENT, ...rest.headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    throw new PlatformError(`Couldn't reach ${host}: ${(err as Error).message}`, true);
  }
  if (res.status === 429 || res.status >= 500) {
    throw new PlatformError(`${host} is busy (HTTP ${res.status}). Try again in a minute.`, true);
  }
  return res;
}

/** Turns unix seconds into a UTC YYYY-MM-DD key. */
export function utcDay(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

// DsaKaro

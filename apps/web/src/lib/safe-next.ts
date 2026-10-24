/**
 * Only allow same-site relative paths as post-login destinations,
 * so `?next=https://evil.example` can't turn login into an open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

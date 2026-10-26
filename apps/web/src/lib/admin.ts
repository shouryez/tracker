import "server-only";

/** Admins are listed by email in ADMIN_EMAILS (comma-separated). They can read beta feedback. */
export function isAdmin(email: string | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

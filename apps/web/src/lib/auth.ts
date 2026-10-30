import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/** Stand-in user while Supabase isn't configured, so the shell can be previewed. */
const DEMO_USER: CurrentUser = { id: "demo", email: null, name: null, avatarUrl: null };

/**
 * Data Access Layer entry point: the signed-in user, or a redirect to /login.
 * Reads cookies, so callers must render inside a <Suspense> boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!isSupabaseConfigured) return DEMO_USER;

  // Supabase reads the clock while loading the session; tell Next this is
  // request-time work so it never runs during prerendering.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    id: claims.sub,
    email: str(claims.email),
    name: str(meta.full_name) ?? str(meta.name),
    avatarUrl: str(meta.avatar_url),
  };
}

export function isDemoUser(user: CurrentUser) {
  return user.id === DEMO_USER.id;
}

// DsaKaro

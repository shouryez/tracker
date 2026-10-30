"use server";

import { z } from "zod";
import { isDemoUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Account security. A password is an extra way in for people who already proved they own
// their email (Google, or an emailed link). Nobody signs up with a password, so every
// password account has a verified email.

export type AccountResult = { ok: true } | { ok: false; error: string };

const Password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export async function setPassword(password: string): Promise<AccountResult> {
  const user = await getCurrentUser();
  if (isDemoUser(user)) return { ok: false, error: "Sign in first." };
  const parsed = Password.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  // Checked with the auth server, not just the session cookie.
  const { data, error: userError } = await supabase.auth.getUser();
  const authUser = data.user;
  if (userError || !authUser?.email) return { ok: false, error: "Sign in again first." };
  if (!authUser.email_confirmed_at) {
    return {
      ok: false,
      error: "Verify your email first: sign in once with Google or an email link.",
    };
  }
  if (parsed.data.toLowerCase().includes(authUser.email.split("@")[0]!.toLowerCase())) {
    return { ok: false, error: "Don't use your email name in your password." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (/reauthenticat/i.test(error.code ?? error.message)) {
      return {
        ok: false,
        error: "For safety, sign out, sign in again with Google or an email link, then set it.",
      };
    }
    if (/same_password|different from the old/i.test(error.code ?? error.message)) {
      return { ok: false, error: "That's already your password." };
    }
    if (/weak_password/i.test(error.code ?? "")) {
      return { ok: false, error: "That password is too easy to guess. Try a longer one." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// DsaKaro

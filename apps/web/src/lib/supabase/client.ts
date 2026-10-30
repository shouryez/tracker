import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/** Supabase client for Client Components. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

// DsaKaro

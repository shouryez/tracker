// NEXT_PUBLIC_* values are inlined at build time, so they must be read as literal
// `process.env.NAME` expressions (no dynamic lookups).
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * False until .env.local is filled in. The app then runs in demo mode:
 * pages render, auth is skipped, and a banner explains what to set up.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// DsaKaro

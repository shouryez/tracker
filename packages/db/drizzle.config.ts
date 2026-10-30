import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read .env files itself.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env: fine for `generate`, which doesn't need a database.
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Supabase already owns the anon/authenticated/service_role roles and the auth schema.
  entities: { roles: { provider: "supabase" } },
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});

// DsaKaro

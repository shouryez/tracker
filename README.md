# Upsolve

A DSA practice tracker for college students: a Chrome extension that times every problem and catches every verdict, plus a dashboard that merges LeetCode, Codeforces, GFG and more into honest stats, auto-ticked sheets and spaced revision.

- **Product & build plan:** [PLAN.md](PLAN.md)
- **Design language:** [DESIGN.md](DESIGN.md) · living visual spec in [design/preview.html](design/preview.html)

## Repo layout

```
apps/web          Next.js 16 app: landing, login, dashboard, auth routes
packages/ui       Design tokens (Tailwind v4 theme) + shared components
packages/db       Drizzle schema, migrations, DB client, sync persistence
packages/adapters Codeforces + LeetCode clients (public data only, no DB)
```

The Chrome extension (`apps/extension`) arrives in Phase 2.

## Run it

Requires Node 24+ and pnpm (`npm i -g pnpm`).

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Without Supabase keys the app runs in **demo mode**: every page renders and auth is switched off, with a banner saying so.

## Turn on auth and the database

1. Create a free project at [supabase.com](https://supabase.com).
2. **Web env:** copy `apps/web/.env.example` → `apps/web/.env.local` and paste the project URL, publishable key (Project Settings → API Keys) and `DATABASE_URL` (same connection string as step 3).
3. **DB env:** copy `packages/db/.env.example` → `packages/db/.env` and paste the Session pooler connection string (Project Settings → Database).
4. **Create the tables:** `pnpm db:migrate`. This creates the schema with row-level security, plus a trigger that makes a profile row for every new user.
5. **Auth settings** (Authentication → URL Configuration): set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
6. **Google sign-in (optional):** Authentication → Providers → Google. Create an OAuth client in Google Cloud Console with the callback URL Supabase shows you.
7. Restart `pnpm dev`. Visiting `/dashboard` now redirects to `/login` until you sign in.

Magic links open in the same browser that requested them (PKCE flow).

## Scripts

| Command                                 | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                              | Run all apps in dev mode                                         |
| `pnpm build`                            | Production build                                                 |
| `pnpm lint` / `pnpm typecheck`          | ESLint / TypeScript across the monorepo                          |
| `pnpm format`                           | Prettier                                                         |
| `pnpm db:generate`                      | Generate a migration after editing `packages/db/src/schema.ts`   |
| `pnpm db:migrate`                       | Apply migrations to `DATABASE_URL`                               |
| `pnpm test`                             | Unit tests (adapters, stats)                                     |
| `pnpm --filter @upsolve/db check:store` | Live check: fetch real data, save it in a transaction, roll back |

## Notes for contributors

- `apps/web` runs Next.js 16 with **Cache Components** on. Anything that reads cookies (the session) must render inside `<Suspense>`. See `apps/web/AGENTS.md` and the docs bundled in `node_modules/next/dist/docs/`.
- Request interception lives in `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`).
- Use design tokens (`bg-surface`, `text-ink-2`, `hatch`, …), never raw hex. See DESIGN.md §4.

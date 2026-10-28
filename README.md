# DsaKaro

A DSA practice tracker for college students: a Chrome extension that times every problem and catches every verdict, plus a dashboard that merges LeetCode, Codeforces, GFG and more into honest stats, auto-ticked sheets and spaced revision.

- **Product & build plan:** [PLAN.md](PLAN.md)
- **Design language:** [DESIGN.md](DESIGN.md) · living visual spec in [design/preview.html](design/preview.html)

## Repo layout

```
apps/web          Next.js 16 app: landing, login, dashboard, auth routes
packages/ui       Design tokens (Tailwind v4 theme) + shared components
packages/db       Drizzle schema, migrations, DB client, sync persistence
packages/adapters Codeforces, LeetCode, GFG clients (public data only, no DB)
packages/core     Learning engine: spaced repetition, topic mastery, "solve next" (pure, tested)
packages/contracts Zod schemas shared by the extension and the API
apps/extension    Chrome extension (WXT): LeetCode + GFG timer, verdicts, history import
```

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
4. **Create the tables:** `pnpm db:migrate`, then `pnpm --filter @upsolve/db seed:gfg` (GFG problem list, ~2 min) and `pnpm --filter @upsolve/db seed:sheets` (coding sheets, matched to LeetCode and GFG). This creates the schema with row-level security, plus a trigger that makes a profile row for every new user.
5. **Auth settings** (Authentication → URL Configuration): set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs.
6. **Google sign-in (optional):** Authentication → Providers → Google. Create an OAuth client in Google Cloud Console with the callback URL Supabase shows you.
7. Restart `pnpm dev`. Visiting `/dashboard` now redirects to `/login` until you sign in.

Magic links open in the same browser that requested them (PKCE flow).

## Weekly email (optional)

Set `CRON_SECRET` (any long random string; it also signs unsubscribe links), `RESEND_API_KEY` ([resend.com](https://resend.com), free tier) and `EMAIL_FROM` in `apps/web/.env.local` or your host's env. `apps/web/vercel.json` calls `/api/cron/weekly` every Monday 08:00 IST with `Authorization: Bearer $CRON_SECRET`. Without `RESEND_API_KEY` the route does a dry run. Preview your own email at `/api/email/weekly/preview` while signed in.

## Load the extension (development)

1. Build it. It talks to `http://localhost:3005` by default; set `UPSOLVE_WEB_URL` to point elsewhere.
   ```bash
   pnpm --filter @upsolve/extension build
   ```
2. In Chrome open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `apps/extension/.output/chrome-mv3`.
3. Start the web app (`pnpm --filter @upsolve/web exec next dev --port 3005`), sign in, and open **Settings → Browser extension → Connect a browser** (or click the extension icon → Connect).
4. Open any LeetCode or GeeksforGeeks problem. A small timer appears bottom-left and starts after 10 seconds or your first keystroke. Click it for your memory of the problem, hints and a pre-submit checklist. After 25 active minutes it offers hints one at a time; after a wrong verdict it shows the checks you usually miss. After **Accepted** a 10-second wrap-up asks how you solved it, the pattern and a one-line takeaway.
5. Daily loop: the extension polls `/api/ext/today` every 15 minutes for one reminder a day at your best hour, contest alerts 30 minutes before, and group nudges. Start a Lab focus session from **Sessions** and it counts time on coding sites as focus and everything else as away. Right-click any page (or use the popup) to **Save to DsaKaro for later**; YouTube keeps the timestamp.

After changing extension code, rebuild and press the reload icon on the extension card in `chrome://extensions`.

What the extension can access: `leetcode.com`, GeeksforGeeks problem pages, YouTube (only the video's current time, when you save it) and the DsaKaro site, plus `storage`, `alarms`, `notifications`, `contextMenus` and `tabs`. On LeetCode it reads verdict responses and, for the history import, your submission list (never code). `tabs` is used only during a Lab focus session, to tell a coding tab from any other; it keeps two totals and a switch count, never a URL or title. Your LeetCode cookies never leave the browser.

## Design system

"Midnight Lab": deep ink surfaces, one lime action colour, violet for data and focus, the pixel grid as the signature motif, and a serif-italic accent in every title. Tokens (colour roles, light theme, type 11→88, elevation e0–e4, motion) live in `packages/ui/src/styles`; shared components in `packages/ui`; effects (number ticker, text reveal, tilt, magnetic, beams, confetti, modal, select, date range) in `apps/web/src/components/fx`; charts in `apps/web/src/components/charts*` (custom SVG, no chart library). Run the dev server and open `/styleguide` to see every token, component, effect and chart in every state (dev only). The audit, decisions and per-phase notes are in `design/MIDNIGHT-LAB.md`.

## Scripts

| Command                                    | What it does                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Run all apps in dev mode                                                                                      |
| `pnpm build`                               | Production build                                                                                              |
| `pnpm lint` / `pnpm typecheck`             | ESLint / TypeScript across the monorepo                                                                       |
| `pnpm format`                              | Prettier                                                                                                      |
| `pnpm db:generate`                         | Generate a migration after editing `packages/db/src/schema.ts`                                                |
| `pnpm db:migrate`                          | Apply migrations to `DATABASE_URL`                                                                            |
| `pnpm --filter @upsolve/db seed:gfg`       | Import GeeksforGeeks' public problem list (run before `seed:sheets`)                                          |
| `pnpm --filter @upsolve/db seed:sheets`    | Load the coding sheets (Striver, NeetCode, Blind 75, Grind 75) into the database. Run once after `db:migrate` |
| `pnpm --filter @upsolve/db sheets:extract` | Re-download sheet lists from their sources into `packages/db/seed/sheets/`                                    |
| `pnpm test`                                | Unit tests (adapters, stats)                                                                                  |
| `pnpm --filter @upsolve/db check:store`    | Live check: fetch real data, save it in a transaction, roll back                                              |

## Notes for contributors

- `apps/web` runs Next.js 16 with **Cache Components** on. Anything that reads cookies (the session) must render inside `<Suspense>`. See `apps/web/AGENTS.md` and the docs bundled in `node_modules/next/dist/docs/`.
- Request interception lives in `src/proxy.ts` (Next 16 renamed `middleware` to `proxy`).
- Use design tokens (`bg-surface`, `text-ink-2`, `surface-card`, `label-mono`, …), never raw hex. Lime (`signal`) is the one primary action per view; hatch means planned/future, never empty. See `design/MIDNIGHT-LAB.md`.

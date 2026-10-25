# Upsolve — SaaS Build Plan

> Companion to [DESIGN.md](DESIGN.md). Upsolve is a working name.
> Last updated: 25 Oct 2026.

---

## 0. TL;DR

A **Chrome extension + web dashboard** for college students who practise DSA. The extension times every problem you open and catches every verdict on LeetCode, Codeforces, GFG and more. The web app merges all platforms into one deduplicated history and turns it into **honest stats, auto-ticked sheets, spaced revision and placement readiness**. Free for students; paid for colleges' placement cells later.

**Build order:** profiles + LeetCode/Codeforces sync → extension timer → problem catalog + sheets → learning engine → more platforms + social → launch at your own college → monetise.

---

## 1. Product

### 1.1 Who it's for

| Persona                                | Need                                                          | What wins them                                                              |
| -------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Aarav, 2nd year, beginner**          | Doesn't know what to solve next, starts sheets and drops them | Auto-ticked Striver sheet, "what to solve next", streak with exam freeze    |
| **Priya, 3rd year, placement grinder** | Solves on LeetCode + GFG, has no idea if she's ready          | Merged count, topic mastery, readiness for target companies, revision queue |
| **Kabir, CP enthusiast**               | Codeforces + CodeChef contests                                | Combined rating graph, auto upsolve list, time per rating bucket            |
| **TPO / placement coordinator** (paid) | 300 students, no visibility                                   | Batch dashboard: readiness, gaps, inactive students                         |

### 1.2 Differentiators (what nobody does together today)

1. Automatic **time per problem** with idle detection, across platforms.
2. **Honest solved count**: solo / hint / saw solution.
3. **Proven revision**: spaced repetition only counts a re-solve the extension saw.
4. **Cross-platform dedup** via a problem catalog, so sheets tick whichever site you solved on.
5. **College layer**: leaderboards by college and batch, seniors' prep patterns (opt-in), placement-cell dashboard.

### 1.3 Scope

| In MVP (Phases 0–4)                                                                                                                                                                           | Later (Phases 5–7)                                                                                                                                                               | Not doing                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Profile + college, LeetCode + Codeforces + GFG, extension timer/verdicts, overview dashboard, sheets (A2Z, SDE, NeetCode 150, Blind 75), revision queue, topic mastery, notes, public profile | CodeChef, AtCoder, Code360, HackerRank; groups, college leaderboard, study rooms; contests + upsolve; readiness; interview mode; AI weekly review; college dashboard; mobile PWA | Our own judge / problem statements; copying sheet creators' content; storing users' platform passwords or cookies on our servers |

---

## 2. Architecture

```
 ┌───────────────── Chrome (user's own profile) ─────────────────┐
 │  Extension (MV3)                                               │
 │   content scripts per site ── detect problem, verdict, focus   │
 │   page-world hook (LeetCode) ── read submission check results  │
 │   service worker ── timer state machine, offline queue         │
 │   popup + in-page pill (Shadow DOM)                            │
 └───────────────┬────────────────────────────────────────────────┘
                 │ HTTPS (Bearer JWT)   events: session.*, submission.*
                 ▼
 ┌──────────────────────────── Backend ───────────────────────────┐
 │  Next.js app (web + API routes / server actions)  ── Vercel    │
 │  Supabase: Postgres · Auth · Realtime (rooms) · Storage        │
 │  Jobs: Inngest (or pg_cron + edge functions)                   │
 │    ├─ platform sync workers (per user, per platform adapter)   │
 │    ├─ catalog matcher (new platform problems → canonical)      │
 │    ├─ nightly rollups: daily_stats, mastery, reviews due       │
 │    └─ weekly email (Resend)                                    │
 └────────────────────────────────────────────────────────────────┘
        ▲ public APIs: Codeforces API, LeetCode GraphQL, AtCoder Problems API, profile pages
```

### 2.1 Stack

| Layer      | Choice                                                      | Why                                                            |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Monorepo   | **pnpm + Turborepo**                                        | Web, extension and shared UI/types in one place                |
| Web        | **Next.js (App Router) + TypeScript**                       | SSR for public profiles/SEO, API routes, one deploy            |
| UI         | **Tailwind v4 + shadcn/ui + motion**                        | Tokens from DESIGN.md; fast, accessible primitives             |
| DB/Auth    | **Supabase (Postgres, Auth, Realtime, RLS)**                | Free tier, row-level security, realtime presence for rooms     |
| ORM        | **Drizzle**                                                 | Typed SQL, simple migrations                                   |
| Jobs       | **Inngest** (alt: Trigger.dev, or pg_cron)                  | Retries, rate-limited steps, cron, no infra                    |
| Extension  | **WXT + TypeScript** (MV3)                                  | Hot reload, cross-browser later (Edge/Firefox), sane structure |
| Charts     | Custom SVG/CSS (pixels, bars, gauge) + **Recharts** (lines) | Brand charts are simple; don't fight a library                 |
| Email      | **Resend + React Email**                                    | Weekly reports                                                 |
| Analytics  | **PostHog**                                                 | Funnels, retention, feature flags                              |
| Errors     | **Sentry**                                                  | Web + extension                                                |
| Validation | **Zod** shared between extension and API                    | One schema for events                                          |

### 2.2 Repo layout

```
upsolve/
├─ apps/
│  ├─ web/                 Next.js: marketing, app, API, public profiles
│  └─ extension/           WXT: background, content/{leetcode,codeforces,gfg,...}, popup, pill
├─ packages/
│  ├─ ui/                  tokens.css, components (Card, KPI, PixelStack, Heatmap, Gauge…)
│  ├─ core/                domain logic: mastery, spaced repetition, readiness, dedup — pure TS, unit-tested
│  ├─ adapters/            platform adapters (server-side sync) — one folder per platform
│  ├─ db/                  Drizzle schema, migrations, seed (sheets, catalog)
│  └─ contracts/           Zod schemas for extension ↔ API events
├─ design/preview.html     living visual spec
├─ DESIGN.md
└─ PLAN.md
```

---

## 3. Data model (Postgres)

```
users(id, email, created_at)
profiles(user_id PK, handle UNIQUE, name, avatar_url, college_id, branch, grad_year, current_year,
         goal ENUM(internship,placements,faang,cp), target_companies text[], main_language,
         daily_goal_min, timezone, is_public, created_at)
colleges(id, name, short_name, city, state, aishe_code, email_domain)

platform_accounts(id, user_id, platform ENUM, handle, verify_code, verified_at,
                  last_synced_at, sync_cursor jsonb, status ENUM(ok,error,rate_limited))

problems(id, canonical_slug UNIQUE, title, difficulty ENUM(E,M,H), topics text[], created_at)   -- our catalog
platform_problems(id, problem_id NULL → problems, platform, external_id, slug, url, title,
                  difficulty_raw, rating INT NULL, tags text[], UNIQUE(platform, external_id))

submissions(id, user_id, platform_problem_id, platform, external_id, verdict ENUM(AC,WA,TLE,MLE,RE,CE,OTHER),
            language, runtime_ms, memory_kb, submitted_at, source ENUM(api,extension),
            UNIQUE(platform, external_id))
sessions(id, user_id, platform_problem_id, mode ENUM(practice,review,interview), started_at, ended_at,
         active_ms, idle_ms, submits, outcome ENUM(solved,abandoned,open),
         independence ENUM(solo,hint,solution) NULL, note text, mistake_tags text[])
solves(user_id, problem_id, first_solved_at, last_solved_at, best_independence, solve_count,
       best_active_ms, PRIMARY KEY(user_id, problem_id))                         -- derived

sheets(id, slug, name, author, source_url, version)
sheet_items(sheet_id, position, section, title, problem_id, PRIMARY KEY(sheet_id, position))

review_logs(id, user_id, problem_id, action ENUM(remembered,shaky,forgot,retire,restore), at)
                                         -- manual actions; the schedule is derived (§6.2)
problem_notes(user_id, problem_id, body, updated_at, PRIMARY KEY(user_id, problem_id))
contest_results(user_id, platform, contest_id, contest_name, at, rank, old_rating, new_rating, solved INT, total INT)

daily_stats(user_id, date, solved_e, solved_m, solved_h, active_ms, topics jsonb, PRIMARY KEY(user_id, date))
topic_mastery(user_id, topic, score, solved, solo_rate, median_ms, updated_at)

groups(id, kind ENUM(friends,college,batch), name, college_id NULL, invite_code)
group_members(group_id, user_id, role)
orgs(id, college_id, plan, seats)  org_members(org_id, user_id, role ENUM(admin,viewer))
subscriptions(user_id|org_id, plan, status, provider, current_period_end)
```

- **RLS:** users read/write only their own rows. Group leaderboards read through a security-definer view that exposes only aggregate fields of members who opted in.
- **Indexes:** `submissions(user_id, submitted_at desc)`, `sessions(user_id, started_at desc)`, `reviews(user_id, due_at)`, `platform_problems(platform, slug)`.

---

## 4. Platform adapters

Each adapter implements:

```ts
interface PlatformAdapter {
  platform: Platform;
  verify(handle: string, code: string): Promise<boolean>; // code present in bio/about
  fetchProfile(handle: string): Promise<ProfileSnapshot>; // counts, rating, rank
  fetchSubmissions(
    handle: string,
    cursor?: Cursor,
  ): Promise<{ items: RawSubmission[]; next?: Cursor }>;
  fetchContests?(handle: string): Promise<RawContestResult[]>;
  normalizeProblem(raw: RawProblem): PlatformProblemInput;
}
```

| Platform                                | Server-side source                                                                                             | Extension adds                                                                                              | Notes / risk                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Codeforces**                          | Official API: `user.info`, `user.status`, `user.rating`, `problemset.problems`                                 | Timer + live verdict                                                                                        | Most reliable. Strict rate limit, so queue and space out calls.                                                                       |
| **LeetCode**                            | Public GraphQL (unofficial): profile counts, tag counts, contest ranking, calendar, recent accepted (last ~20) | **Full history** (paginated submissions while logged in), timer, verdicts via the submission-check response | Unofficial endpoints can change, so keep queries in one file with a health check. Never send the user's session cookie to our server. |
| **GeeksforGeeks**                       | Public profile page (solved list, score)                                                                       | Timer + verdict                                                                                             | No official API. Parse defensively and monitor.                                                                                       |
| **AtCoder**                             | AtCoder Problems community API (submissions, problems, difficulty)                                             | Timer                                                                                                       | Respect their usage guidance and cache.                                                                                               |
| **CodeChef**                            | Public profile page (rating, solved)                                                                           | Timer + verdict                                                                                             | Official API discontinued.                                                                                                            |
| **Code360 / HackerRank / InterviewBit** | —                                                                                                              | Extension-only capture of solved problems while logged in                                                   | Lowest priority.                                                                                                                      |

**Sync policy:** sync on connect (full backfill), then every 6 h, plus right after the extension reports an AC. Use exponential backoff per platform and a global per-platform concurrency cap. Store a raw payload snapshot (7 days) for debugging parsers.

**Verification:** generate an `upsolve-XXXX` code, the user pastes it into their profile bio/about, and the server checks it once. Codolio-style. Without verification a handle can still be added, but it is hidden from leaderboards.

---

## 5. The extension

### 5.1 Permissions (keep minimal for Web Store review and trust)

`storage`, `alarms`, `idle`, plus `host_permissions` for supported sites and our API domain only. No `tabs`, no `<all_urls>`, no `history`.

### 5.2 Timer state machine

```
IDLE ──open problem page──▶ ARMED ──(10 s focused OR first keystroke in editor)──▶ ACTIVE
ACTIVE ──tab hidden / window blur / no input 3 min (chrome.idle)──▶ PAUSED ──return──▶ ACTIVE
ACTIVE ──submit──▶ JUDGING ──verdict≠AC──▶ ACTIVE (verdict appended)
                            └─verdict=AC──▶ SOLVED ──prompt (solo/hint/solution, note, mistake tag)──▶ IDLE
any ──leave problem > 30 min──▶ IDLE (session saved as abandoned/open)
```

- Store **timestamps, not ticking counters** (`chrome.storage.session`), because MV3 service workers sleep. Recompute elapsed on wake and use `chrome.alarms` for the idle checks.
- A session is resumable: reopening the same problem within 30 min continues it.
- **Review mode** (opened from the revision queue) and **interview mode** (45 min cap, tags hidden via CSS on LeetCode) set `session.mode`.

### 5.3 Verdict detection (per site, isolated in `content/<site>.ts`)

- **LeetCode:** a tiny MAIN-world script wraps `fetch` to read responses of the submission check endpoint (`/submissions/detail/<id>/check/`) → `state: SUCCESS`, `status_msg`. DOM observer as fallback.
- **Codeforces:** after submit, the page redirects to the status page. Read the row and poll `user.status` once.
- **GFG / others:** observe the result panel DOM.
- Site selectors and endpoint patterns live in a **remote JSON config** (data only; MV3 forbids remote _code_) so a broken selector can be fixed without a store re-review.

### 5.4 Sync to backend

Events (`session.started|paused|resumed|submitted|solved|abandoned`) are Zod-validated, queued in IndexedDB, and batched to `POST /api/ext/events` every 15 s or on solve. The queue survives offline use. The server is idempotent on `event_id`.

### 5.5 Auth handshake

The user logs in on the web app → the page sends a short-lived token to the extension via `externally_connectable` → the extension exchanges it for a refresh token stored in `chrome.storage.local`. "Disconnect" is available in both places.

---

## 6. Core logic (`packages/core`, pure + unit-tested)

### 6.1 Catalog matching (dedup)

1. Seed the catalog from sheets (Striver/NeetCode link to LeetCode/GFG/Code360) plus the LeetCode problem list.
2. New `platform_problem` → match by known cross-links → normalised title (lowercase, strip punctuation and stopwords) + tag overlap → fuzzy score ≥ 0.9 auto-links. 0.75–0.9 goes to an admin review queue. Below that it becomes a new canonical problem.
3. Users can report a wrong match. Fixes propagate.

### 6.2 Spaced repetition

Intervals (days): `1 → 3 → 7 → 16 → 35 → 90`.

- **First solve:** solution → step 0 (1 d); hint → step 1 (3 d); solo → step 2 (7 d).
- **Review result** (needs an extension-seen AC in review mode):
  - pass (solo, ≤ 1.2× previous time) → step + 1
  - slow (solo, slower than 1.2× previous) → same step
  - hint → step − 2
  - fail or solution → step 0
- Review cap: at most N reviews per day (default 5) so the queue never explodes. Overflow goes in priority order (overdue × difficulty × weak topic).

### 6.3 Topic mastery (0–100)

For each topic `t`:

```
points(p) = diffWeight(E=1,M=2,H=3) × independence(solo=1, hint=.6, solution=.3)
            × retention(days since last solve/review; half-life 45 d, refreshed by passed reviews)
            × speed(clamp(median_ms_for_difficulty / your_ms, .7, 1.2))
mastery(t) = 100 × min(1, Σ points / target(t))       target(t) from sheet composition (e.g. A2Z share × 2)
```

Show the score plus its inputs (solved, solo rate, median time) so it never feels like a black box.

### 6.4 Placement readiness

`readiness = 0.6 × Σ(company_topic_weight × mastery) + 0.25 × volume_score + 0.15 × contest_score`.
Company topic weights come from public, crowdsourced interview-experience lists (cite sources; no LeetCode Premium data). Always show the top 2 gaps.

### 6.5 "What to solve next"

From the user's followed sheets: pick unsolved items in the **lowest-mastery topic**, difficulty = the user's comfortable level + a nudge, excluding problems seen in the last 14 days. Fall back to the catalog.

---

## 7. Roadmap

Estimates assume one student developer working around 15–20 h/week. Each phase ends with something you use daily.

### Phase 0 — Foundations (1 week) ✅ done 25 Oct 2026

- [x] Monorepo (pnpm, Turborepo, TS strict, ESLint, Prettier), GitHub Actions CI
- [x] `packages/ui`: port tokens from `design/preview.html` → `tokens.css` + Tailwind `@theme`; Button, Tag, Card, Eyebrow
- [x] Drizzle schema v1 + migrations with RLS on (Supabase project itself: create it and run `pnpm db:migrate`, see README)
- [x] Next.js app with auth (Google + email magic link), theme toggle
- **Exit:** sign in → empty dashboard shell in both themes.

### Phase 1 — Profiles & first sync (2–3 weeks) ✅ done 25 Oct 2026

- [x] Onboarding: about you → goal → connect platforms; 149 colleges seeded, students can add missing ones
- [x] Ownership verification (LeetCode: code in profile Summary; Codeforces: compilation error on 4A within 15 min)
- [x] Adapters: **Codeforces** (full history), **LeetCode** (counts, topics, calendar, contests, last 20 accepted)
- [x] Sync with per-account lock, 6 h staleness auto-refresh and error status in Settings. _Runs in server actions for now; move to Inngest when sync must run without a visit (weekly email, Phase 4)._
- [x] Overview v1: KPIs, merged heatmap, difficulty split, platform cards with rating sparklines, top topics, recent solves
- [x] Public profile `/u/handle` v0 (opt-in from Settings)
- **Exit:** 5 friends onboarded with real data.

### Phase 2 — Extension v1 (3 weeks) ✅ built 25 Oct 2026 (LeetCode only, by choice)

- [x] WXT scaffold, token handshake from `/extension/connect`, offline outbox, `/api/ext/{me,sessions,history}` (Zod-validated, `packages/contracts`)
- [x] LeetCode: problem detection, timer state machine (auto-start, idle/sleep-safe), verdict hook, full-history import from the user's own session (no code uploaded)
- [x] In-page pill (Shadow DOM) + after-AC prompt (independence, note, mistake tags)
- [x] Popup: today's solved/sessions/focus, live session, import + sync status
- [x] Sessions page, focus bars, solo rate and recent sessions on overview, extension management in Settings. _30-day pixel stack moves to Phase 4 analytics._
- [ ] Chrome Web Store **unlisted** release ($5 one-time developer registration). Needs your developer account; build with `UPSOLVE_WEB_URL=<prod url> pnpm --filter @upsolve/extension zip`
- **Exit:** you use it for 2 weeks without opening a spreadsheet.

### Phase 3 — Catalog & sheets (2–3 weeks) ✅ sheets done 25 Oct 2026; GFG moved to 3b

- [x] Canonical catalog: every platform problem linked to one `problems` row (`linkCatalog`, runs after every sync/upload). Cross-platform title matching + review screen arrive with GFG (3b)
- [x] Sheets: Striver A2Z (495), Striver SDE (156), NeetCode 150, Blind 75, Grind 75. Names, sections, LeetCode links and tiers only; creators credited and linked. Re-extract with `pnpm --filter @upsolve/db sheets:extract`, load with `seed:sheets`
- [x] Auto-tick from Accepted submissions on any platform, manual ticks for non-LeetCode items, follow sheets, sheet pages with per-step progress, ETA at your 14-day pace, dashboard card
- **Exit:** ✅ solving a problem on LeetCode ticks every sheet item linked to it.

### Phase 3b — GeeksforGeeks ✅ done 25 Oct 2026

- [x] GFG adapter (public profile + solved-problems APIs), Designation-field verification, full GFG catalog import (`seed:gfg`, ~3,000 problems)
- [x] Extension on GFG: timer + verdicts read from the result panel after Submit
- [x] Strict title matching (order-aware for "X to Y" titles); LeetCode–GFG twins share one canonical problem, Striver's non-LeetCode items link to GFG when matched, else takeUforward
- [x] Sheet page redesign: table per step, search, To do/Done and difficulty filters, platform link buttons
- **Exit:** ✅ solving a problem on GFG ticks the sheet items linked to it (verified with a public profile: A2Z 78, SDE 41, NeetCode 150 24).

### Phase 4 — Learning engine (3 weeks) ✅ built 26 Oct 2026

- [x] `packages/core`: spaced repetition, mastery, "next problem" (with tests). Review state isn't stored: it's recomputed from submissions, timed sessions and `review_logs`, so it never drifts
- [x] Revision page + review mode in extension (proven re-solve). Every solve ever is scheduled (older history lands as overdue, released by the daily cap, default 5, oldest and weakest first). A timed Accepted is proven; synced re-solves and "Remembered / Shaky / Forgot" self-grades count too but can't push past 16 days. Retire/restore per problem
- [x] Topic mastery card + Analytics page (time per difficulty/topic, first-try AC, verdict mix, best hours, mistake tags, range control). 18 topics; targets from the curated sheets, capped at 60 points
- [x] Problem detail page (notes, attempts timeline, mistake tags, review schedule, platform links, sheets, similar unsolved problems)
- [x] Weekly email: digest + template, `/api/cron/weekly` (Vercel cron, Monday 08:00 IST), signed one-click unsubscribe, Settings toggle and preview. Dormant until `RESEND_API_KEY` is set
- **Exit:** the revision queue is the first thing you open each day.

### Phase 5 — More platforms & social (3–4 weeks)

- [ ] CodeChef, AtCoder, Code360 (extension-only)
- [ ] Contests page + auto upsolve list
- [ ] Groups (friends), college & batch leaderboards (honest metrics), invite links
- [ ] Study rooms (Supabase Realtime presence)
- [ ] Share card generator (OG image route)
- [ ] Streak + exam-freeze
- **Exit:** a group of 10+ classmates using leaderboards for a week.

### Phase 6 — Launch (2 weeks)

- [ ] Marketing site from DESIGN §9.1 (hero, bento, showcase, FAQ, footer)
- [ ] Privacy policy, terms, data export/delete, cookie-free analytics config
- [ ] Web Store public listing (screenshots from the real app, clear permission explanations)
- [ ] Launch at your own college: coding club talk, WhatsApp groups, 2–3 campus ambassadors
- [ ] LinkedIn posts with share cards; Product Hunt later
- **Exit:** 100 weekly active users, D7 retention ≥ 30%.

### Phase 7 — Monetise (ongoing)

- [ ] **Pro** (~₹99/month or ₹799/year): AI weekly review, interview mode unlimited, deeper analytics, unlimited revision cap
- [ ] **Placement readiness** + company profiles
- [ ] **Seniors' patterns** (opt-in, anonymised, min 10 people per cohort)
- [ ] **College dashboard** (per batch per year); pilot free with your own placement cell, then charge
- [ ] Payments via Razorpay (India) or Stripe

---

## 8. Non-functional

| Area                              | Plan                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Privacy (India DPDP Act 2023)** | Collect the minimum (grad year, not age or date of birth). Explicit consent at signup. Per-section public/private. Export + delete in Settings. No selling data. College dashboards see only students who opted in.      |
| **Security**                      | RLS everywhere, Zod on every endpoint, rate-limit the extension API, never store platform passwords or cookies server-side, rotate extension tokens, CSP on web.                                                         |
| **Reliability**                   | Adapter health checks (a canary handle per platform, run hourly) with alerts. Parsers fail closed: keep the last good data and show a "sync paused" chip.                                                                |
| **Performance**                   | Dashboard reads come from `daily_stats` / `topic_mastery` rollups, not raw submissions. Target p75 LCP < 2 s on 4G.                                                                                                      |
| **Cost (early)**                  | Domain about ₹800/yr; Supabase, Inngest, Resend, PostHog and Sentry free tiers; Vercel Hobby until you charge money (Hobby is non-commercial), then Pro. Check current pricing before you commit.                        |
| **Legal**                         | Don't copy problem statements or editorials. Link out. Credit sheet authors and ask before a deeper integration. Use platform names as text, not logos. Read each platform's ToS. Prefer official APIs where they exist. |

---

## 9. Metrics

- **North star:** weekly active solvers (users with ≥ 1 extension-tracked session per week).
- **Activation:** % of signups with ≥ 1 verified platform **and** ≥ 1 extension session within 48 h.
- **Retention:** D7 and D30. Weekly revision completion rate.
- **Value signals:** reviews completed / due, solo rate trend, sheets progress per week.
- **Growth:** invites per user, share cards generated, college groups created.

---

## 10. Risks

| Risk                                 | Impact               | Mitigation                                                                                                                    |
| ------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| LeetCode/GFG change endpoints or DOM | Sync/timer breaks    | Adapters isolated, remote selector config, canary checks, fall back to extension capture                                      |
| Platform objects to scraping         | Feature loss         | Prefer official APIs, low request rates, user-initiated extension capture in the user's own session, respond fast to requests |
| Chrome Web Store rejection           | Launch delay         | Minimal permissions, clear single purpose, privacy policy, no remote code                                                     |
| Students don't pay                   | No revenue           | Free core; revenue from colleges; Pro is a bonus                                                                              |
| Codolio or others copy features      | Less differentiation | Speed + depth on the learning engine + college network effects                                                                |
| Solo founder burnout                 | Project stalls       | Phase exits are usable products; dogfood daily; recruit 1–2 friends after Phase 2                                             |

---

## 11. Next actions (this week)

1. Decide the name and buy the domain.
2. Create the GitHub repo and scaffold the monorepo (Phase 0).
3. Port tokens and the Card/KPI/Tag components from `design/preview.html`.
4. Write the Codeforces adapter first (official API, easiest win), then LeetCode GraphQL.
5. Line up 5 friends to test Phase 1.

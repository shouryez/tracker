# DsaKaro: Frontend plan

> **Status:** planned, **not started**. Build begins only when the owner says "start" and names a phase or page.
> This file is the single source of context for that work. It replaces `design/UX-ADDONS-PLAN.md`.
> Last updated: 2026-11-11.

---

## 0. Decisions log

| # | Question | Decision |
|---|---|---|
| D1 | Liquid (refractive) glass or frosted? | **Frosted glass everywhere**, the same look in every browser. No SVG displacement and no refraction. |
| D2 | Cursor halo: default or opt-in? | **On by default** on desktop (fine pointer). It can be switched off in Settings. The system cursor is never hidden. |
| D3 | Light game layer (badges, Wrapped, holo card, combos)? | **Yes, add it**, with the guardrails in §9. |
| D4 | Landing page | Out of scope until the owner asks. Only colour work and the existing Ghost Type footer are done. |
| D5 | Effects from React Bits Pro, Aceternity and others | **Built from scratch** in our codebase and our tokens. No paid registries, no new UI kits. `components.json` holds the React Bits registries, but they're unused because there's no license key. |

---

## 1. Working rules (must follow on every change)

- **Commit and push every change** to both remotes: `upsolve` (github.com/shouryez/upsolve, Vercel → https://dsakaro.site) and `origin`.
  - **No Claude co-author or attribution lines** in commits.
  - Commit messages are plain sentences describing the user-facing change.
- **Never commit or print secrets.** `apps/web/.env.local` and `packages/db/.env` are gitignored.
- Never type the owner's passwords and never extract session tokens or cookies. Ask the owner when a login is
  needed.
- **Database migrations are run by the owner** (`pnpm --filter @upsolve/db migrate`).
  - Never push code that reads a new column or enum before the owner confirms the migration ran.
  - Ask first for any item marked **[backend]**.
- **Design-only by default:** adapt to existing data and queries. Don't change server logic unless an item says so.
- Strip any `// DsaKaro` trailer lines in files you edit.
- Don't restart servers stopped for low memory unless asked.
- **Build check before each push:**
  - `cd apps/web && rm -rf .next/types && npx next build`
  - `npx tsc --noEmit -p .`
  - `npx eslint <changed files>`
  - `npx prettier --write <changed files>`, run from the repo root.
  - Core tests: `npm test` in `packages/core` when scheduling code changes.
- **Visual check:**
  - Run `next start -p 3011` and take headless Chrome screenshots.
  - To free the port: PowerShell `Get-NetTCPConnection -LocalPort 3011 | Stop-Process`.
  - For animations, drive Chrome over CDP (Node's built-in `WebSocket`, `--remote-debugging-port=9333`). Capture
    full-viewport frames and crop with PIL. `captureScreenshot` clip coordinates are page coordinates, not viewport
    coordinates.
  - Logged-in pages can't be screenshotted locally. Check them on dsakaro.site with Claude in Chrome (the owner is
    logged in there).
- Write scripts with Python (`newline='\n'`) and keep scratch files in the session scratchpad.
- `next dev` crashes in this shell (0xc0000142), so iterate with `next build` and `next start`.

---

## 2. Stack and codebase map

- **Monorepo:** pnpm and Turborepo.
  - `apps/web`: Next.js 16 with Cache Components (`"use cache"`, `cacheTag`, `updateTag`), App Router, React 19,
    Tailwind v4 (`@utility`).
  - `packages/ui`: `@upsolve/ui` components and tokens.
  - `packages/db`: Drizzle with Supabase Postgres (project "dsakaro", Mumbai).
  - `packages/core`: the SRS scheduler, `applyEvent`.
- **Read `node_modules/next/dist/docs/` before writing Next.js code.** This Next version has breaking changes
  (see `apps/web/AGENTS.md`).
- **Server actions:** `apps/web/src/app/actions/*` (zod-validated). The review ones are `logReview` and
  `undoReview` in `actions/learning.ts`.
- **Tokens:** `packages/ui/src/styles/tokens.css` and `packages/ui/src/styles/index.css` (utilities like
  `surface-card`, `glass-control`, `gloss`, `card-sheen`). App-level CSS lives in `apps/web/src/app/globals.css`.
- **Motion constants:** `packages/ui/src/motion.ts` (`DURATION`, `EASE`, `SPRING`, `STAGGER`). The `motion` v14
  package is used in the app (hooks only where possible).

**Routes (`apps/web/src/app`)**

| Route | Main files |
|---|---|
| Today | `dashboard/page.tsx`, `components/daily/today-plan.tsx`, `daily/next-problem.tsx`, `daily/plan-suggestions.tsx` |
| Revision | `dashboard/revision/page.tsx`, `components/review-actions.tsx`, `components/revision-deck.tsx` *(new)*, `components/learning.tsx` |
| Recall | `dashboard/recall/page.tsx`, `components/daily/recall-quiz.tsx` |
| Weekly review | `dashboard/review` |
| Sheets | `dashboard/sheets/page.tsx`, `sheets/[slug]`, `components/sheets.tsx`, `sheet-browser.tsx`, `sheet-identity.tsx` (BookCover) |
| Problem | `dashboard/problems/[id]`, `components/note-editor.tsx` |
| Contests | `dashboard/contests/page.tsx`, `components/rating-chart.tsx`, `daily/upcoming-contests.tsx`, `daily/add-upsolve.tsx` |
| Sessions / focus | `dashboard/sessions/page.tsx`, `components/sessions.tsx`, `daily/focus-screen.tsx`, `focus-live.tsx`, `focus-popout.tsx`, `lab-timer.tsx`, `study-session.tsx`, `study-bar.tsx` |
| Library | `dashboard/notebook/page.tsx`, `daily/notebook.tsx` |
| Insights | `dashboard/analytics/page.tsx`, `components/analytics-charts.tsx`, `components/charts/*` |
| People | `dashboard/groups/page.tsx`, `groups/[id]`, `components/study-hall.tsx`, `leaderboard.tsx`, `social.tsx` |
| College | `dashboard/college` |
| Settings | `dashboard/settings/page.tsx` and the section components beside it |
| Public profile | `u/[handle]/page.tsx` |
| Onboarding | `onboarding/*`, `components/main-sheet-picker.tsx` |
| Login | `login/auth-page.tsx`, `login-form.tsx` |
| 404 | `not-found.tsx` |
| App shell | `dashboard/layout.tsx`, `dashboard/_components/*` (nav-links, sticky-header, search-box, user-menu), `components/command-palette.tsx`, `components/shortcuts.tsx`, `components/toaster.tsx` |

**Data functions to reuse (no new queries unless stated)**

| File | Functions |
|---|---|
| `lib/stats.ts` | `localCalendar`, `currentStreak`, `activeDays`, `heatmapLevels`, `sumSolved`, `topTopics` |
| `lib/learning.ts` | `getLearning`, `masteryOf`, `revisionQueue`, `reviewHistory`, `getNextCandidates`, `getTopicTargets` |
| `lib/daily-data.ts` | `getActiveFocus`, `getFocusSummary`, `getStudyHall`, `getFriendsStudying`, `getWeekReview`, `getRecallDeck`, `getRecallStats`, `getNotebook`, `bestHour` |
| `lib/contests-data.ts` | `getContests`, `getContestProblems`, `getUpsolve` |
| `lib/social-data.ts` | `getMyGroups`, `getGroup`, `getGroupBoard`, `rankBoard`, `getCollegeBoards`, `getStreakFreezes` |
| `lib/analytics-data.ts` | `getAnalytics` |
| `lib/sessions-data.ts` | `getSessions`, `getSessionStats`, `getLiveSession` |
| `lib/sheets-data.ts` | `getSheetSummaries`, `getSheetDetail`, `getLatestSolveAcrossSheets` |
| `lib/problem-data.ts` | `getProblemDetail` |
| `lib/focus.ts` | `focusElapsed`, `focusTotals`, `focusPhase`, `breakState`, `focusClock` |
| `lib/share-card.tsx` and `api/share-card` | Share image (next/og) with `?milestone=` |

---

## 3. Design system recap (Orbit)

- **Colours:**
  - Ink ground `#0B0B0C`.
  - **Ember** `#F0884F` (`--ember` = `--primary`) only for the primary action, the focus orb and the live dot.
  - **Mint** `#86D9C2` (`--signal`) for data and success.
  - **Sky** `#9DB5E8` (`--violet` aliases sky) for info.
  - **Sand** (`--amber`) for Medium and focus time.
  - **Rose** (`--bad`) for Hard and WA.
- **Surfaces:**
  - Glass cards: `surface-card`, `rounded-[24px]`.
  - Hero: `surface-hero`, one per page.
  - `surface-inset` for nested content.
  - Pills: `glass-control`.
  - `Pill` tones: neutral, mint, ember, rose.
- **Type:**
  - `font-display` is Inter Tight. Labels are sentence case, with no uppercase eyebrows.
  - Use `num`/`tnum` for numbers.
- **Existing effects to reuse:**
  - `components/fx`:
    - `SignalType` (neon headline), `GhostType` (self-writing headline).
    - `DecodeText`, `TextReveal`, `NumberTicker`.
    - `Marquee`, `Meteors`, `StreakFlame`, `AnimatedBeam`.
    - `TiltCard`, `Magnetic`, `CursorGlow`.
    - `Modal`, `HoldToConfirm`, `AnimatedCheckbox`, `StarToggle`, `Select`, `DateRangePicker`.
  - `@upsolve/ui`: `SpotlightTracker` with `Card spotlight`, `border-beam`, `PixelHeatmap`, `Stacky`,
    `StackyCard`, `Tooltip`, `SegmentedControl`, `Switch`/`SwitchField`, `Kbd`, `CheckDraw`, `Spinner`.
  - Celebration: `burst()` and `burstFrom()` in `components/dashboard/celebrate.tsx` (pixel confetti in Orbit
    colours; plays `feel.success()`).
  - Sound and haptics: `lib/feel.ts` → `feel.tick() / success() / soft() / whoosh()`.

---

## 4. Already done (context)

- Orbit redesign of every in-app page, plus a recoloured landing page.
- **UX features already shipped:**
  - Snooze ("Not today"), Undo toasts, time budget on Today.
  - Keyboard shortcuts (`g` + letter, `n`, `?`).
  - Weekly-review prompt, "Review N now".
  - Milestone share cards.
  - Onboarding main-sheet picker (LeetCode first).
  - "Practice weakest topic", "Add missed to Today", smart reminder (best hour).
- **Signal Type** (`fx/signal-type.tsx`): used on the 404 page, Today's greeting (once per tab), Revision's
  "All caught up", the extension-connected screen and the milestone toasts.
- **Ghost Type** (`fx/ghost-type.tsx`): the landing footer CTA cycles through product endings.
- **Built but NOT committed (working tree), ship with their phases:**
  - `lib/feel.ts`, `dashboard/settings/feel-settings.tsx` and a Settings card `#feel`. Sound off by default,
    haptics on.
  - Feel hooks in `review-actions.tsx` (grades, snooze) and in `celebrate.tsx` (`burst` → success sound). Confetti
    recoloured to Orbit.
  - `components/revision-deck.tsx`, plus deck data built in `revision/page.tsx` and a "Swipe through N" button
    beside "Revise N due now".

---

## 5. Ground rules for every add-on

1. **Motion explains, guides or confirms.** If an effect doesn't tell the user something, cut it.
2. **Reduced motion:** every effect has a `prefers-reduced-motion` path (static final state, no loops).
3. **Pointer effects** only under `(pointer: fine)`. Touch gets gestures and haptics instead.
4. **Keyboard parity:** anything you can drag or swipe also works by key and button.
5. **Performance:**
   - Add-ons are client islands, lazy where heavy.
   - Animate only transform, opacity and filter.
   - Effects pause off-screen (`IntersectionObserver` and `document.hidden`).
   - No three.js; WebGL is allowed only on 404 and the landing page.
   - Target 60 fps on a mid-range Android, CLS ≈ 0.
6. **Accessibility:**
   - Animated text keeps a real text copy (`sr-only`) and hides the per-letter spans from screen readers.
   - Glass layers keep text contrast ≥ 4.5:1 in both themes.
7. **Both themes:** every new colour is a token with light and dark values.

---

## 6. Phase 0: design language (build first; every page depends on it)

### 0.1 Frosted glass system (D1: frosted everywhere)
Three depth tiers as `@utility` classes in `packages/ui/src/styles/index.css`, with tokens in `tokens.css`.

| Utility | Used for | Recipe |
|---|---|---|
| `glass-chrome` | Floating chrome: mobile tab bar, session notch, command palette, floating bulk-action bar, sticky header (when scrolled) | `backdrop-filter: blur(24px) saturate(160%)`; background `color-mix(in srgb, var(--surface) 62%, transparent)`; 1px rim `--glass-rim` (top-lit gradient border via padding-box/border-box); inner highlight `inset 0 1px 0 rgb(255 255 255 / .08)`; shadow `--e3`; grain overlay at 4 %. |
| `glass-overlay` | Modals, popovers, menus, tooltips, toasts | Like chrome but blur 18px, a little more opaque (72 %), smaller shadow. |
| `surface-card` | Content | Unchanged and solid. Text never sits on a blurred background without ≥ 72 % fill. |

- **Pointer sheen:** an optional `data-sheen` on chrome elements adds a soft radial highlight at `--mx/--my`
  (reuse `SpotlightTracker`). It's static under reduced motion.
- **Fallback:** where `backdrop-filter` is unsupported, use a solid `--surface-2` at 96 % (`@supports not`).
- **Toasts:** restyle sonner in `components/toaster.tsx` with `glass-overlay`. Stacked toasts sit behind with
  `scale(.96)` and `blur(1px)`.
- **Progressive blur under the sticky header:** a 24px gradient-masked blur strip
  (`mask-image: linear-gradient(#000, transparent)`) under `dashboard/_components/sticky-header.tsx`, so content
  softens as it slides beneath.
- **Glass lens tooltip:** for heatmap and chart hover, a frosted bubble with the value. See 0.2 for the crosshair.
- **Acceptance:**
  - Screenshots in light and dark: header, palette, a modal and toasts.
  - Contrast checked.
  - Safari behaves the same (no refraction anywhere).

### 0.2 Cursor halo (D2: on by default, desktop)
- **File:** `components/fx/halo-cursor.tsx`, mounted once in `dashboard/layout.tsx`, plus public pages if wanted.
- **Architecture:**
  - One fixed `div` (`pointer-events:none`, z top) follows the pointer with a rAF lerp. Use spring constants from
    `motion.ts`, with no React re-render per frame (write `transform` directly).
  - State comes from the nearest ancestor with `data-cursor="…"` (event delegation on `pointerover`).
  - The **system cursor stays visible** (we never set `cursor:none`); the halo is a soft companion ring.
- **States:**

| `data-cursor` | Halo |
|---|---|
| none (default) | 28px soft ring, `--ink` at 25 %, `mix-blend-mode: difference` off (keep it calm) |
| `button` (auto for `button`, `[role=button]`, `a.btn`) | Morphs to the element's rect + 6px padding with its border radius (magnetic wrap); slight scale on press |
| `open` (problem rows, card links) | Shrinks to a 6px dot with a tiny "Open ↗" label pill |
| `crosshair` (heatmap, charts) | Thin crosshair lines plus a frosted date bubble (the chart supplies the label via `data-cursor-label`) |
| `grab` (deck cards, plan items, covers) | Ring that stretches along the drag velocity; filled while dragging |
| `text` (inputs, textareas, contenteditable) | Fades out; native I-beam only |
| `disabled` | Faint, with a small ⊘ |

- **Off when:**
  - `(pointer: coarse)`, reduced motion (static ring hidden), or Settings → Cursor = System.
  - While typing, or while a native `<select>` is open.
- **Settings:** add "Cursor: Halo / System" to the Sound & haptics card, renamed **"Feel"** (stored in the
  `lib/feel.ts` prefs as `cursor: "halo" | "system"`, default `"halo"`).
- **Performance:** one element; pause on `document.hidden`.
- **Acceptance:** no input lag felt; zero layout work per frame; screenshot each state.

### 0.3 Click spark
- `components/fx/click-spark.ts`: imperative `spark(x, y)` draws 4–6 ember strokes on a pooled canvas in 300 ms.
- Triggered only by `variant="signal"` buttons (in `@upsolve/ui` `Button`, opt-out prop `spark={false}`).
- Off under reduced motion.

### 0.4 Motion tokens
- Extend `packages/ui/src/motion.ts` with three named springs:
  - **snap** for UI toggles (stiff, no bounce).
  - **settle** for cards and lists (a little bounce).
  - **float** for decor (slow).
- Add CSS equivalents as `--spring-*` `linear()` easings in `tokens.css`.
- Replace ad-hoc durations as pages are touched.

### 0.5 Content entrance
- A **Blur Fade** utility (`animate-blur-in`: opacity 0 → 1, `filter: blur(6px)` → 0, translateY 6px → 0).
- Skeleton → content cross-fade in `Suspense` fallbacks. A list stagger uses `STAGGER`.

### 0.6 iOS-style large titles
- `PageHeader` gets `collapse` behaviour: the H1 scales and fades as it leaves the viewport, and a compact title
  fades into the sticky header.
- Uses one shared `IntersectionObserver` sentinel, no scroll listeners.

### 0.7 Stateful buttons
- `Button` prop `state?: "idle" | "loading" | "done"`. The label cross-fades to a spinner, then to `CheckDraw` ✓,
  then back after 1.4 s.
- Width is locked during the transition. Use it for Save, Sync and Mark done.

### 0.8 Hold to confirm (exists)
- Reuse `HoldToConfirm` from `fx/overlay.tsx` for every destructive action:
  - Delete account, leave group, revoke token (already used), reset sheet progress.
- Remove the remaining confirm dialogs.

### 0.9 Sound and haptics *(built)*
- `lib/feel.ts`. Add `feel.combo(n)`, a rising pitch for streaks of correct answers (Recall, deck).
- Optional brown noise lives in Sessions (§8 Sessions).

### 0.10 Typography
- **Variable proximity** headings (`fx/variable-proximity.tsx`): letters' `font-variation-settings: "wght"` rises
  near the pointer.
  - Use it only on empty-state headlines, the onboarding title and the 404 page.
- **NumberFlow** (`NumberTicker`) for every live number; `tnum` everywhere.

### 0.11 Theme switch circular reveal
- `ThemeToggle` uses `document.startViewTransition` with a `clip-path: circle()` that grows from the toggle's
  centre. Fall back to an instant switch.
- Also update `<meta name="theme-color">`.

---

## 7. Phase G: global features

1. **Page morphs** (View Transitions):
   - Check Next 16 support in `node_modules/next/dist/docs` (`experimental.viewTransition` / React
     `<ViewTransition>`).
   - Shared names: a sheet cover morphs into the sheet header; a problem row title morphs into the problem H1;
     section tabs cross-fade.
   - Fall back to a normal navigation.
2. **Live session notch:**
   - `components/daily/session-notch.tsx`, a `glass-chrome` pill (top centre on desktop, bottom on mobile).
   - Shows the live dot (ember), timer (`focusClock`) and the current problem.
   - Expands on hover or tap: Pause, Stop, open focus screen.
   - Data comes from `getActiveFocus` / `getLiveSession` (already in the study bar). Reconcile with the existing
     `study-bar.tsx` so there's one indicator, not two.
3. **Context menu** on problems:
   - `components/problem-menu.tsx`, opened by right-click or long-press (500 ms with a haptic tick).
   - Items: Open, Re-solve (review URL), Not today (snooze), Add to Today, Copy link.
   - Reuses existing actions; keyboard opens it with `Shift+F10` or the menu key.
4. **Peek preview:** hover 400 ms (fine pointer) on any problem link to get a `glass-overlay` card:
   - Difficulty, ring, last solved, your best time, and a Re-solve button.
   - Data comes from the row's existing props (no fetch). The problem page link falls back to a lightweight
     fetch only if the props are missing.
5. **Command palette:**
   - Recent pages and problems (localStorage).
   - Actions: Start session, Grade due revision (opens the deck), Add task.
   - Topic jumps ("dp" → filtered list).
   - A preview pane on wide screens.
   - Styled with `glass-chrome`.
6. **Keyboard-first lists** (Revision queue, sheet page, Today):
   - `j`/`k` move a sliding focus ring; `Enter` opens; `x` selects.
   - A floating `glass-chrome` **bulk-action bar** with Add to Today, Not today and Stop revising, each with Undo.
   - Hook into the existing `shortcuts.tsx` (ignored while typing).
7. **Mobile:**
   - A `glass-chrome` **bottom tab bar** (Today, Revision, Sheets, Sessions, More) with an active blob that morphs
     between tabs.
   - **Swipe actions** on rows: right = done or remembered (mint), left = not today (sand), with haptics and Undo.
   - **Pull to sync** on Today: Stacky stretches, then the existing `AutoSync` runs.
8. **Smart empty states:**
   - `EmptyState` gains a `demo` slot: a ghost row animates what will appear.
   - Stacky's mood matches the page (idle, thinking, celebrating). One clear action.

---

## 8. Pages (build one at a time, in the order in §10)

For each item: **What**, **Data**, **Files**, **Done when**.

### Today (`dashboard/page.tsx`)
1. **Vanishing task input:**
   - *What:*
     - The placeholder cycles real suggestions every 3 s (sheet next-ups and due revisions: "Revise Koko Eating
       Bananas…").
     - On Enter the typed text dissolves into particles. A canvas snapshot of the text breaks into pixels that
       drift up and fade, with `feel.whoosh()`.
     - The new task springs into the list.
   - *Data:* existing plan suggestions and the `addPlanTask` action.
   - *Files:* `fx/vanish-input.tsx`, `daily/today-plan.tsx`.
   - *Done when:* works by keyboard; reduced motion = instant.
2. **Drag to reorder** plan items:
   - *What:* pointer drag with the halo `grab` state; FLIP for siblings; the top item gets an "Up next" beam.
     Keyboard: `Alt+↑/↓`.
   - *Data:* order is kept per day in localStorage `dsakaro:order:${day}`. **[backend]** optional server
     persistence later.
3. **Budget ribbon:**
   - *What:* replace the 30m–3h chips with a draggable ribbon (snaps every 15 min) showing the total estimate; the
     "these can wait" line moves live.
   - *Data:* the existing `estimate()` and the `dsakaro:budget:${day}` key.
4. **Day complete:** when the ring closes, "All done" shows as `SignalType`, then one `burst()` and a chime
   (already partly there via `CelebrateOnce`).
5. **Getting started checklist** (new users):
   - *What:* steps are platform linked, extension connected, main sheet followed, first problem solved, first
     review graded. Each tick animates with `CheckDraw`; finished, it collapses into a ✓ pill and then disappears
     after 3 days.
   - *Data:* existing platform accounts, extension tokens, `getSheetSummaries`, stats and review history.
6. **Gentle streak-at-risk cue:**
   - *What:* after 20:00 local with nothing solved today, the streak chip breathes ember once per visit and reads
     "One easy problem keeps it". No modal, no push, no guilt copy.
   - Respects streak freezes: if a freeze is available, say "A freeze has you covered".

### Revision (`dashboard/revision/page.tsx`)
1. **Swipe deck** *(built, uncommitted)*:
   - Right = remembered, left = forgot, up = shaky; arrows, buttons and `Z` to undo.
   - A coloured progress strip, stamps, fly-out, burst on clear, and `router.refresh()` on close.
   - Add the halo `grab` state and `feel.combo` for consecutive "remembered".
2. **Memory-curve tooltip:**
   - *What:* hover a queue row to see a `glass-overlay` tooltip that follows the pointer, holding a tiny
     exponential decay curve, "≈72 % recall now", and "drops below 80 % on Thu".
   - *Data:* derived from `state.lastAt`, `state.step` and the interval ladder (1/3/7/16/35/90). Purely visual,
     with the label "estimate".
3. **Ring focus:** hovering a ladder chip or orbit ring highlights the matching rows and blurs the rest (60 %
   opacity plus `blur(1px)`).
4. **Ring promotion moment:** after a "remembered", the problem's dot animates from its ring to the next ring on
   the `FocusOrb` (one shot; skipped under reduced motion).
5. **Ladder chips** get NumberFlow counts that tick when a grade moves a problem.

### Recall (`dashboard/recall`)
1. **3D card flip** to reveal the answer (`transform-style: preserve-3d`, 500 ms).
2. **Combo meter:** consecutive correct answers raise a mint meter and the chime pitch (`feel.combo(n)`). It resets
   softly on a miss, with no buzzer.
3. **Perfect round:** a holo badge flies to the badge shelf (§9).

### Sheets (`dashboard/sheets`, `sheets/[slug]`)
1. **Book covers with glare and tilt** (`BookCover` in `sheet-identity.tsx`): pointer tilt ±6°, a glare gradient
   at the pointer, a spine shadow. On click the cover swings open (rotateY −25°), then the page morph opens the
   sheet.
2. **Topic constellation view:**
   - A toggle (List / Map) on the sheet page.
   - Each topic is a cluster of stars (one per problem; lit when solved, mint, otherwise faint), laid out on a
     deterministic spiral.
   - Hover a cluster → topic name and progress; click → scroll to the topic in the list.
   - SVG, no libraries.
3. **Satisfying ticks:** solving or ticking a row draws an ink strike-through (`stroke-dashoffset`), and a mint
   pixel flies along a Bézier into the sheet progress bar, which ticks up.
4. **Sticky progress bar:** a `glass-chrome` strip appears after scrolling past the header: "Arrays 14/20 ·
   overall 38 %", with the current topic tracked by `IntersectionObserver`.
5. **Next-up spotlight:** the first unsolved problem in sheet order gets a `border-beam` and a "Next" pill.

### Problem page (`dashboard/problems/[id]`)
1. **Attempt timeline:**
   - A vertical timeline of opens, verdicts (WA rose, AC mint), reviews and ring moves.
   - A scroll-traced beam fills as you read.
   - *Data:* `getProblemDetail` (sessions, verdicts, review logs).
2. **Your time against the median:** a small distribution curve with your marker; the curve draws in on view.
   - *Data:* if a median is available in problem data, use it. Otherwise show only your attempts' times
     **[backend for medians]**.
3. **Similar problems carousel:** horizontal snap cards with the same topics, unsolved first, built from
   `getNextCandidates` or the sheet data.
4. **Notes "key insight" blur:** a note line marked as the insight stays blurred until hovered, for self-testing.

### Contests (`dashboard/contests`)
1. **Split-flap countdown** (`fx/split-flap.tsx`): DD:HH:MM:SS flaps for the next contest. Each flip is a two-half
   rotateX animation; ticks are optional via `feel`.
2. **Rating chart scrubber** (`rating-chart.tsx`): a draggable crosshair with the halo `crosshair` state; the
   frosted bubble shows contest, rank and ±rating, and arrow keys step through points.
3. **Upsolve cards with direction-aware hover:** the overlay slides in from the side the cursor entered. "Add
   missed to Today" is kept.
4. **Starting-soon bar:** when a contest starts in under 30 min, a `glass-chrome` bar shows with a split-flap
   countdown and "Start a session for it".

### Sessions and Focus (`dashboard/sessions`, `daily/focus-screen.tsx`)
1. **Ambient focus mode:**
   - A slow aurora (CSS gradients, paused when hidden) with grain.
   - A pomodoro ring with 60 tick marks.
   - A **screen wake lock** while running (`navigator.wakeLock`, re-acquired on visibility change).
2. **Brown noise:** an optional toggle on the focus screen, generated with Web Audio (filtered noise). Volume is
   remembered in `feel` prefs; it only runs when sound is enabled.
3. **Break breathing:** during breaks the orb follows a 4-7-8 rhythm with "Breathe in / Hold / Out" captions.
4. **Session receipt:**
   - On stop, a paper slip "prints" (it grows from a slot with a slight jitter).
   - It lists duration, problems, idle time removed, longest focus stretch and date.
   - Buttons: "Save image" (next/og like the share card) and "Close".
   - *Data:* the existing session summary.

### Library (`dashboard/notebook`)
1. **Masonry layout** (CSS columns) with Focus Cards: hovering one dims the others.
2. **Key-insight blur reveal** (same as the problem page).
3. **Search with the vanishing input;** tag chips filter with FLIP.

### Insights (`dashboard/analytics`)
1. **Bento layout with linked charts:** a shared `hoverDay` store, so hovering any chart moves a crosshair on all
   of them, with the halo crosshair.
2. **This week vs last:** a draggable comparison slider over the topic and time charts. The topic radar morphs
   between weeks (path interpolation).
3. **Charts draw in** on first view only (path `stroke-dashoffset`, bars grow), using a once-per-session flag.
4. **Weekly Wrapped stories:** see §9.2.

### People (`dashboard/groups`, `groups/[id]`, `college`)
1. **Study hall in orbit:** live members orbit the group avatar on two rings (studying inner, idle outer), with
   presence dots, avatar tooltips and their buddy art. Data: `getStudyHall` and `getFriendsStudying`.
2. **Leaderboard reorder:** FLIP animation when ranks change between visits (previous order kept in
   sessionStorage). Each row shows ▲/▼ deltas.
   - **Segmented "near you" view by default**: the 2 above and 2 below you, with "See all".
3. **Dotted India map** (college boards): an SVG dot-matrix map (generated once into a static SVG) with pulsing
   dots per college sized by active members. Data: `getCollegeBoards` (needs city/state per college; if missing,
   **[backend]** add coordinates to the colleges data).
4. **[backend]** Cheers and pokes: floating emoji reactions on a member. Needs a table; ask before building.

### Settings (`dashboard/settings`)
1. The theme toggle uses the circular reveal (0.11).
2. Rename the Sound & haptics card to **Feel**: Sounds, Haptics, Cursor (Halo / System), Motion (Full / Reduced,
   which overrides OS for this site only).
3. **Live previews:** a reminder time shows a mini email preview; the study buddy preview already exists.

### Public profile (`u/[handle]`)
1. **Holographic stat card:**
   - A card with name, streak, solved, top topics and a mini heatmap.
   - A foil layer (`conic-gradient` + `repeating-linear-gradient` with `mix-blend-mode: color-dodge`) moves with
     pointer or device tilt; glare and tilt ±10°.
   - "Download card" uses the existing `api/share-card`.
2. **Badge shelf:** §9.1.
3. **Heatmap draw-in:** cells fill week by week, oldest first, in 900 ms, once.

### Onboarding and Login
1. **Import loader** (onboarding connect): "Fetching LeetCode history → Matching your sheets → Building your
   queue". Each step ticks as the real sync promise resolves (or after a minimum display time), then shows "You're
   set" in `SignalType`.
2. **Main sheet picker covers** get glare and tilt (shared with Sheets 1).
3. **Login:** a pointer-reactive dot grid (canvas; dots brighten near the pointer, ink only). Static under reduced
   motion.

### 404 and errors
- 404 is already neon. Add a fluid splash-cursor easter egg (WebGL, desktop only, loads after 2 s idle).
- `dashboard/error.tsx` gets a stateful "Try again" button and Stacky's thinking mood.

### Landing (D4: later)
- Variable-proximity section headings.
- A marquee whose speed follows scroll velocity.
- A target-cursor variant of the halo on feature cards.
- Ghost Type footer *(done)*.

---

## 9. Game layer (D3: added, with guardrails)

**Guardrails:**
- It's never the point: no XP, no levels, no paywalled cosmetics, no aggressive notifications.
- Rewards mark real learning (solving, revising, finishing sheets), never logins.
- Comparisons are segmented (near-you boards).
- Everything is derived from existing data; **no new tables** unless marked.

### 9.1 Badges (collectible holo badges)
- **Files:** `lib/badges.ts` (pure derivation from stats), `components/badge.tsx` (holo foil tile),
  `components/badge-shelf.tsx`.
- **Where they appear:** the public profile shelf, Settings → Profile (your shelf), and a toast with `SignalType`
  when newly earned (remembered per browser like milestones today).
- **Unearned badges** show as dim outlines with "how to earn" text.

| Badge | Rule (derived) | Source |
|---|---|---|
| Spark / Flame / Blaze / Eternal | streak ≥ 7 / 30 / 100 / 365 | `currentStreak` |
| 50 / 100 / 250 / 500 / 1000 Club | total solved | `sumSolved` |
| First Graduate / Ten Rings / Fifty Rings | retired (graduated) problems ≥ 1 / 10 / 50 | `getLearning` |
| Sheet Finisher | any followed sheet at 100 % | `getSheetSummaries` |
| Topic Master: {topic} | mastery ≥ 80 % in a topic | `masteryOf` |
| Upsolver | upsolved ≥ 10 contest problems | `getUpsolve` |
| Three Platforms | solved on LeetCode, Codeforces and GFG | platform stats |
| Comeback | returned after a 7+ day gap and kept a 3-day streak | calendar |
| Night Owl / Early Bird | ≥ 10 solves between 00–04 / 05–08 local | solve timestamps (if available, else skip) |
| Perfect Recall | a Recall round with every answer right | recall data (if per-round is available, else **[backend]**) |

### 9.2 Weekly Wrapped
- **Where:** the weekly review page (`dashboard/review`) and a card on Insights on Mondays: "Your week, wrapped".
- **Format:**
  - Full-screen stories, 5–7 cards, tap or arrow keys to advance, progress segments on top (Instagram-style).
  - Each card has a big number with NumberFlow, one sentence, and an Orbit gradient background.
- **Cards:**
  - Solved this week (vs last).
  - Hardest solve.
  - Fastest Medium.
  - Revisions remembered %.
  - Focus hours.
  - Weakest topic plus a "Practice it" button.
  - A badge earned this week.
- **Share:** a "Save image" per card through a new `api/wrapped-card` (next/og, same fonts as the share card).
- **Data:** `getWeekReview`, `getAnalytics`, `getSessionStats`, `reviewHistory`.

### 9.3 Holo stat card
- See Public profile 1. Also shown in Settings → Profile as "Your card".

### 9.4 Combos and celebrations
- `feel.combo(n)` in Recall and the deck.
- Streak milestones, solved milestones and badges all use the same celebration grammar: a burst, a chime and a
  `SignalType` headline in the toast.

---

## 10. Build order and per-page checklist

**Order:**
1. **Phase 0**: glass, halo, spark, motion tokens, entrance, large titles, stateful button, theme reveal.
2. **Revision and Recall**: deck (built), curve tooltip, ring focus, promotion, flip and combo.
3. **Today**: vanish input, reorder, budget ribbon, getting started, streak cue.
4. **Sheets**: covers, constellation, ticks, sticky bar, next-up.
5. **Contests**: split-flap, scrubber, upsolve hover, starting-soon bar.
6. **Sessions**: ambient, wake lock, brown noise, breathing, receipt.
7. **Game layer**: badges, holo card on the profile, Wrapped.
8. **Insights**: linked charts, compare, draw-in.
9. **People**: orbit hall, leaderboard FLIP, India map.
10. **Problem page, Library, Settings (Feel), Onboarding, Login, 404**.
11. **Phase G**: page morphs, notch, context menu, peek, palette, bulk actions, mobile tab bar, swipe rows, pull
    to sync.

**Per-page checklist:**
- [ ] Read this file's section and the relevant Next docs.
- [ ] Build; keep server logic unchanged unless the item says otherwise.
- [ ] Reduced-motion path, keyboard path, touch path.
- [ ] Light and dark tokens; contrast.
- [ ] `tsc`, eslint, prettier, `next build`.
- [ ] Screenshots at 390 px and 1440 px, both themes, plus an animation frame strip; send them to the owner.
- [ ] Commit and push to `upsolve` and `origin` (no co-author).
- [ ] Note what couldn't be verified (logged-in pages are checked live on dsakaro.site).

## 11. Items needing backend (ask before building)
- Server persistence of Today's manual order (optional).
- Problem median times, if not already stored.
- College coordinates for the India map, if missing.
- Per-round recall results for the "Perfect Recall" badge, if not derivable.
- Cheers and pokes between group members (new table).

## 12. Sources
- [React Bits](https://reactbits.dev/), with component names (Target Cursor, Splash Cursor, Magic Bento, Glass
  Surface, Click Spark) taken from a [community component mapping](https://glama.ai/mcp/servers/@ceorkm/reactbits-mcp-server/blob/700a32195cdd52aa2bbfcdeb2f323739d2565534/src/data/component-mappings.ts)
- [Aceternity UI components](https://ui.aceternity.com/components)
- [Magic UI components](https://magicui.design/docs/components)
- [21st.dev](https://21st.dev/)
- [Untitled UI React components](https://untitledui.com/react/components)
- [Glass effects with CSS and SVG (LogRocket)](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
  (refraction rejected per D1)
- [Designing a streak system (Smashing, Feb 2026)](https://smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/)
- [Gamification done right (Appcues)](https://www.appcues.com/blog/getting-gamification-right)
- [12 Product Design Trends for 2026 (UX Pilot)](https://uxpilot.ai/blogs/product-design-trends)
- [UI design trends 2026 (Tubik)](https://blog.tubikstudio.com/ui-design-trends-2026)
- [CSS & JS cursor effects (Speckyboy)](https://speckyboy.com/css-javascript-cursor-effects.md)

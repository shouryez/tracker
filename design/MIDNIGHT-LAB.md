# Midnight Lab: Step 0 audit and proposal

Status: **waiting for approval**. No redesign code written yet. The two dev "Issues" errors are fixed (`79b553b`, see 0.1).

## 0.1 Runtime errors (fixed)

Both came from `components/dashboard/widgets.tsx` `WeekCapsules`: bars were keyed by weekday letter, so `T` (Tue/Thu) and `S` (Sat/Sun) collided. Now keyed by index. (The earlier Dark Reader hydration warning was fixed in `6992027` with `<meta name="darkreader-lock">`.)

## 1. Route map

| Route                            | Entry file                                                                 | Main components                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                              | `app/page.tsx`                                                             | `components/landing/*` (Reveal, Magnetic, Parallax, ScrollProgress, BackToTop, LiveTimer), `PixelHeatmap`, inline Hero/GlassCard/DashboardPreview, bento, pricing, FAQ, footer |
| `/login`                         | `app/login/page.tsx`                                                       | `login-form.tsx`, Logo, ThemeToggle                                                                                                                                            |
| `/onboarding` (steps 1–2)        | `app/onboarding/page.tsx`, `layout.tsx`                                    | `steps.tsx` (OnboardingSteps), `profile-form.tsx`, `college-picker.tsx`                                                                                                        |
| `/onboarding/connect` (step 3)   | `app/onboarding/connect/page.tsx`                                          | `platform-connections.tsx`, `platform-row.tsx`                                                                                                                                 |
| `/extension/connect`             | `app/extension/connect/page.tsx`                                           | inline                                                                                                                                                                         |
| `/join/[code]`                   | `app/join/[code]/page.tsx`                                                 | invite accept                                                                                                                                                                  |
| `/dashboard`                     | `app/dashboard/page.tsx`                                                   | KpiCard, WeekCapsules, HalfGauge, ActivityHeatmap, `learning.tsx`, `progress.tsx`, `rating-chart.tsx`, `sessions.tsx`, `platform-row.tsx`, Celebrate                           |
| `/dashboard/revision`            | `revision/page.tsx`                                                        | `review-actions.tsx` (ManualReview, RetireButton), `learning.tsx`                                                                                                              |
| `/dashboard/sheets`              | `sheets/page.tsx`                                                          | `sheets.tsx`                                                                                                                                                                   |
| `/dashboard/sheets/[slug]`       | `sheets/[slug]/page.tsx`                                                   | `sheet-browser.tsx`, `site-icons.tsx`                                                                                                                                          |
| `/dashboard/problems/[id]`       | `problems/[id]/page.tsx`                                                   | `tabs.tsx`, `note-editor.tsx`, `review-actions.tsx`, `back-link.tsx`                                                                                                           |
| `/dashboard/sessions`            | `sessions/page.tsx`                                                        | `sessions.tsx`                                                                                                                                                                 |
| `/dashboard/analytics`           | `analytics/page.tsx`                                                       | `analytics-charts.tsx`, `charts.tsx` (range 7/30/90/all already exists)                                                                                                        |
| `/dashboard/contests`            | `contests/page.tsx`                                                        | `rating-chart.tsx`                                                                                                                                                             |
| `/dashboard/groups`, `/[id]`     | `groups/page.tsx`, `groups/[id]/page.tsx`                                  | `social.tsx`, `leaderboard.tsx`                                                                                                                                                |
| `/dashboard/college`             | `college/page.tsx`                                                         | `leaderboard.tsx`, `social.tsx`                                                                                                                                                |
| `/dashboard/settings`            | `settings/page.tsx`                                                        | `platform-connections.tsx`, `platform-row.tsx`, Switch, edit-profile form                                                                                                      |
| `/dashboard/search`, `/feedback` | `search/page.tsx`, `feedback/page.tsx`                                     |                                                                                                                                                                                |
| `/u/[handle]` (+ not-found)      | `u/[handle]/page.tsx`                                                      | AvatarRing banner, PixelHeatmap                                                                                                                                                |
| `/api/share-card`                | `app/api/share-card/route.tsx` → `lib/share-card.tsx`                      | next/og                                                                                                                                                                        |
| 404 / errors                     | `app/not-found.tsx`, `dashboard/error.tsx` (no `global-error.tsx` yet)     |                                                                                                                                                                                |
| Shell                            | `dashboard/layout.tsx`, `template.tsx`, `_components/*`                    | Sidebar/MobileNav (`nav-links.tsx`), `sidebar-data.tsx`, `sticky-header.tsx`, `search-box.tsx`, `user-menu.tsx`, `command-palette.tsx`, `toaster.tsx`                          |
| Styleguide                       | `app/styleguide/page.tsx` (dev only, will move to `/dashboard/styleguide`) |                                                                                                                                                                                |

## 2. Component inventory

- **`packages/ui`**: Button (+ButtonArrow, Spinner, `loading`), Card / CardHeader / CardTitle / CardSub (`interactive`, `spotlight`), Tag / DifficultyTag / StatusBadge, Switch, Tooltip, Skeleton / SkeletonCard / EmptyState / Kbd, SpotlightTracker, ThemeToggle, Logo / LogoMark / LiveDot, Eyebrow, PixelHeatmap. Tokens: `src/styles/tokens.css`, `index.css`.
- **Stat tiles**: `KpiCard` (widgets.tsx), stat boxes inline in revision/sessions/analytics pages.
- **Charts** (all hand-built SVG/CSS): WeekCapsules, HalfGauge, ActivityHeatmap, PixelHeatmap, RatingChart, analytics bars/lines in `analytics-charts.tsx` + `charts.tsx`, progress bars in `progress.tsx`.
- **Lists/rows**: recent solves + revision queue + history (`learning.tsx`), session rows (`sessions.tsx`), sheet rows/accordion (`sheet-browser.tsx`), leaderboard rows (`leaderboard.tsx`), search results.
- **Forms**: login-form, profile-form, college-picker, platform-connections, note-editor, group create/join (`social.tsx`), settings toggles/selects, streak-freeze dates.
- **Overlays**: command palette (cmdk), mobile More sheet (`nav-links.tsx`), user menu, toasts (sonner), tooltips, Edit-profile (settings), Celebrate (canvas-confetti).
- **Motion already in place** (from the last redesign, will be reused, not rebuilt): `motion` layoutId nav pill + tabs, CountUp, Reveal/Magnetic/Parallax, Spotlight, theme cross-fade, page template fade.

## 3. Your problem list → files

| Problem                                                                  | Where                                                                                                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Flat identical cards, no tiers                                           | `packages/ui/src/components/card.tsx`, `tokens.css` (shadow/surface)                                                                |
| Weak hover / corner arrow                                                | `card.tsx`, `card-link.tsx`, `button.tsx`                                                                                           |
| Hatch overuse                                                            | `.hatch` in `globals.css`; used in widgets.tsx, progress.tsx, sessions.tsx, analytics-charts.tsx, onboarding/steps.tsx, search page |
| This week pills / gauge blob / redundant bar                             | widgets.tsx (WeekCapsules, HalfGauge), dashboard/page.tsx                                                                           |
| Heatmap weak ramp                                                        | activity-heatmap.tsx, pixel-heatmap.tsx, `--heat-*` tokens                                                                          |
| Best hours / verdict mix / time per topic                                | analytics-charts.tsx, charts.tsx                                                                                                    |
| Badges look the same, Solved = Easy green                                | tag.tsx, tokens (`--ok` vs `--easy`)                                                                                                |
| Strength dots ●●○○○○                                                     | learning.tsx                                                                                                                        |
| Accent chaos (lime + indigo CTAs)                                        | button.tsx `indigo` variant + its call sites                                                                                        |
| Brand disappears in app titles                                           | every `app/dashboard/**/page.tsx` h1 (no shared PageHeader yet)                                                                     |
| Tiny low-contrast mono labels                                            | `--ink-3` contrast + 11px labels across pages                                                                                       |
| Feedback pill overlaps, mobile nav covers last card                      | `dashboard/layout.tsx`, `nav-links.tsx` MobileNav, main bottom padding                                                              |
| Revision grade buttons plain                                             | review-actions.tsx, learning.tsx                                                                                                    |
| Sheet cards identical, tiny bars                                         | sheets.tsx                                                                                                                          |
| Sheet detail dense, tiny unlabeled icons, plain accordion, weak Continue | sheet-browser.tsx, site-icons.tsx                                                                                                   |
| Problem page chips/lists                                                 | problems/[id]/page.tsx                                                                                                              |
| Sessions/Contests/College/Groups empty voids                             | respective pages + social.tsx                                                                                                       |
| Settings key–value grid, disabled-looking Connect                        | settings/page.tsx, platform-connections.tsx                                                                                         |
| Landing template-ish, stray grey square in footer, grey headline halves  | app/page.tsx, globals.css                                                                                                           |

## 4. Data reality check (please decide)

Your rule is "don't change DB queries or business logic." These ideas need data the UI doesn't receive today. For each: **(A)** I add a small read-only query (no schema/logic change), or **(B)** I drop/adapt the idea.

| Idea                                             | What exists today                        | Proposal                                                              |
| ------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------- |
| Heatmap tooltip "3 solved · 42 min · 2 AC, 1 WA" | per-day solve count only                 | A: read `daily_stats.active_ms` + verdict counts per day              |
| KPI delta chips "↑3 vs last week"                | this-week numbers, calendar              | Solved/Active days: computable now. Focus/Pass-rate deltas: A         |
| Session verdict sequence WA → TLE → AC           | session has `submits` count, no verdicts | A: join submissions inside the session window                         |
| Revision "Undo" on toast                         | grading is one-way                       | B (undo = new business logic). Toast without Undo                     |
| Handle live availability check                   | none                                     | A: one read-only server action                                        |
| Login "x problems tracked today" ticker          | none                                     | B: rotating feature highlights (as you allowed)                       |
| Group cards "your rank / this week's leader"     | `{name, role, members}`                  | A: reuse `getGroupBoard` per group, or B: avatars + member count only |
| Extension device browser/OS                      | token `label` + `lastUsedAt`             | B: show label + last used + active dot                                |
| Focus ring "120 min goal"                        | `profiles.daily_goal_min` (default 60)   | Use the user's real goal                                              |
| Sheet author logos                               | names only                               | Monogram marks + per-sheet accent colour                              |
| Today 1/5 ring on Revision                       | review history exists                    | Computable now                                                        |

Everything else in the brief can be built from data already on the page.

**Decision (approved):** design only. No new queries, server actions, schema or logic changes, so every row above goes with **B**: adapt the UI to data the page already receives (heatmap tooltip = solves only; sessions show submit count, outcome and solve mode, not a verdict sequence; no live handle check; group cards = member count + role; no Undo). Charts are custom SVG.

## 5. Art direction: Midnight Lab

- **Keep** the lime + indigo identity, Geist / Geist Mono / Instrument Serif, the pixel logo.
- **Colour roles**: lime = the only CTA (the `indigo` button variant is retired; indigo moves to data/selection/hero gradients). Easy teal · Medium amber · Hard rose. Solved = success green distinct from teal (`#4ade80`-ish vs `#2dd4bf`-ish), always with a check icon. Revise violet, Overdue rose, Attempted amber outline, Todo neutral. Verdicts AC green / WA rose / TLE amber / CE grey / MLE·RE orange.
- **Depth**: 4 surfaces (`surface-0..3`), card = vertical gradient + 1px line + top inner highlight + layered shadow; optional grain + data-tinted corner glow. Three tiers: Hero (one per page, gradient + BorderBeam), Standard, Inset.
- **Light theme**: warm paper (`#f7f5f0` base), ink text, accents darkened for AA. View Transitions circular reveal from the toggle (fallback: existing cross-fade).
- **Hatch** survives only for "planned / future".
- **Scales**: type 11→88 as specified; radius 6/10/14/20/28/full; elevation e0–e4; glow-signal/violet/danger; motion 90/160/240/420/700 + out-expo / in-out + snappy/soft/bouncy springs.
- **Effect budget**: one wow effect per viewport.

## 6. Libraries

| Library                   | Why                                                                                                                                                                                                                                   | Cost (gzip, approx)  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `motion`                  | already installed; switch app routes to `LazyMotion` + `m` to cut weight                                                                                                                                                              | ~–15 KB net saving   |
| `@number-flow/react`      | rolling digits that re-animate on value change; replaces CountUp                                                                                                                                                                      | ~6 KB                |
| `@tanstack/react-virtual` | virtualize A2Z (495 rows)                                                                                                                                                                                                             | ~5 KB                |
| `lenis`                   | smooth scroll, landing only, dynamic import                                                                                                                                                                                           | ~4 KB (landing only) |
| `canvas-confetti`         | already installed, lazy; recoloured to pixel squares                                                                                                                                                                                  | 0 new                |
| Charts                    | **custom SVG, no chart library.** We already hand-draw; visx/Recharts add 20–95 KB for things (radial clock, ladder, pixel heatmap) we'd customise anyway. A small internal `chart/` kit (scales, axis, tooltip, draw-in) stays ~4 KB | ~4 KB                |
| Date range picker         | custom 2-month calendar on our tokens (no react-day-picker)                                                                                                                                                                           | ~3 KB                |
| Notes code highlight      | `sugar-high` (~1 KB) instead of shiki                                                                                                                                                                                                 | ~1 KB                |

App-route JS added: roughly 20 KB, well under the 60 KB budget. Magic UI/Aceternity patterns (border beam, meteors, animated beam, shimmer, text reveal) are rewritten in-house on our tokens.

## 7. Phases (stop after each for review)

1. **Foundation**: tokens (colour roles, scales, light theme, type, radius, elevation, motion), textures (Grain, DotGrid, Aurora, Starfield, GlowOrb), libraries, View Transitions theme toggle.
2. **Effects + components**: the Section 6 effects library and all Section 7 components with every state on `/dashboard/styleguide`.
3. **Charts**: `chart/` kit + all 7.6 charts with empty states, tooltips and draw-in, on the styleguide.
4. **App shell**: sidebar (collapsible, grouped, user card), top bar, mobile dock + More sheet, PageHeader pattern, route transitions, palette upgrade, Feedback moved into sidebar/More.
5. **Overview**.
6. **Revision, Sheets, Sheet detail, Problem**.
7. **Sessions, Analytics, Contests, Groups, College, Settings**.
8. **Landing, Login, Onboarding, Extension connect, Public profile, Share card, 404/global-error**.
9. **Polish**: celebrations, choreography, light-mode QA, breakpoints, a11y, Lighthouse, consistency sweep.

**Verification limit**: I can screenshot public pages and the dev styleguide headlessly, but not signed-in pages. After phases 4–7 you'll need to click through those yourself; I'll list exactly what to check each time.

## Phase 1 shipped (Foundation)

- `packages/ui/src/styles/tokens.css`: colour roles (signal CTA, violet data/focus, success ≠ easy, revise/overdue/attempted, verdicts, heat-0..4, chart-1..8), four surfaces + inset, ink-4, AA ink-3, warm-paper light theme, elevation e0–e4 + inset, glow-violet/danger, card/hero fills, motion 90/160/240/420/700 + out-expo.
- `index.css`: Tailwind mappings, 50–950 scales for primary/violet/signal, type scale 11→88, `shadow-e*`, utilities `surface-card` `surface-hero` `surface-inset` `label-mono` `tnum` `grain` `dot-grid` `starfield` `skeleton-pixel` `paused`, signal focus ring, View Transitions styles.
- `packages/ui/src/motion.ts`: DURATION, EASE, SPRING (snappy/soft/bouncy), STAGGER.
- `packages/ui/src/components/textures.tsx`: Grain, DotGrid, GlowOrb, Starfield, Aurora, `usePauseOffscreen`.
- ThemeToggle: circular View Transitions reveal (fallback cross-fade; instant under reduced motion).
- Added `@number-flow/react`, `@tanstack/react-virtual`, `lenis` (not used yet).

## Phase 2 shipped (Effects + components)

- `packages/ui`: Button (signal sheen, success variant, loading → spinner cross-fade, `done` check-draw, data-nudge icon motions, growing-underline link; `indigo` is now a violet secondary, never a CTA), Card tiers (`standard`/`hero`/`inset`, `beam`, `spotlight` with lit border, `glow` tint), CardTitle tinted 28px icon, CornerArrow two-arrow swap, chips (Difficulty, Status ✓/↻/!/◐/○ with pulse, Verdict, Level bars, Counter, Verified shine, Weakest), Tooltip (glass, arrow, 150 ms), progress (LinearProgress glowing tip + goal, SegmentedProgress, ProgressRing 270/360 multi-segment, StrengthLadder 1→90), SwitchField, SegmentedControl (radiogroup, sliding pill, link mode), Field + inputClasses, pixel skeletons, EmptyState pixel halo, ErrorState.
- `apps/web/src/components/fx`: NumberTicker (@number-flow), DecodeText, TextReveal, TiltCard, Magnetic, CursorGlow, Marquee, Meteors, StreakFlame, AnimatedBeam, Modal (native dialog), HoldToConfirm, Select (combobox), DateRangePicker, AnimatedCheckbox, StarToggle; pixel confetti (`burst`, `burstFrom`) in `dashboard/celebrate.tsx`; PlatformMark in `site-icons.tsx`.
- All shown with states on `/styleguide`.

## Phase 3 shipped (Charts)

Custom SVG/CSS, no chart library. Existing components upgraded in place (same names and props, so pages pick them up): WeekCapsules (bars + avg line + glass tips + ghost empty state; future days hatched), ActivityHeatmap (12px cells, heat-0..4 ramp, month/day labels, today ring, diagonal fade, best run), HalfGauge → ring, HourBars → 24h radial clock with night shading and peak, VerdictMix → donut with AC%, DifficultyTime / TopicBar → gradient bars, MasteryBars → tier colours + Weakest chip, UpcomingStrip → 14-day stacked-dot strip, RatingChart → area + draw-in + crosshair + CF rank bands + responsive width, Sparkline → area + last point, SegmentedProgress → pixel bar. New: TopicRadar, FocusWeek (goal ring + 7-day strip), HowSolved ring, chart kit (MarkTip, ChartEmpty, LegendItem). `--signal-mark` keeps lime marks readable on paper.

## Phase 4 shipped (App shell)

- Sidebar: gradient surface, label-mono groups, sliding pill + glowing lime bar, active icon in lime, hover nudge, pulsing due badge, logo wiggle, user card (avatar, name, @handle → settings), hero-tier extension promo. Collapse kept.
- Top bar: glass on scroll, inset search pill (opens palette), Feedback icon, theme toggle, avatar menu (public profile, settings, theme, sign out). Logout moved into the menu.
- Feedback: no floating pill anymore; glass modal opened from the top bar, the palette or the mobile More sheet.
- Mobile: glass dock with sliding pill + press scale; More is a bottom sheet with drag handle, swipe-to-close, Feedback and Theme. Extra bottom padding so nothing is covered.
- `PageHeader` (eyebrow → title with serif accent → live subtitle → actions, per-page glow via `PAGE_GLOW`).
- Route transition: 8px rise + 12×6 pixel dissolve (≤350 ms, off under reduced motion).
- Command palette: glass, spring-in, dim+blur backdrop, tinted icon tiles, lime selection bar, highlighted matches, Recent group (per browser).

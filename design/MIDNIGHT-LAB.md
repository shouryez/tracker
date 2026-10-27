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

## Phase 5 shipped (Overview)

- PageHeader: date eyebrow, greeting with the first name in serif italic, streak / to-revise / goal / college subline, actions Share card (secondary) + one lime primary.
- Row 1: hero Solved card (beam, grain, rolling number, difficulty ring, per-platform counts with marks, 30-day sparkline) + Streak (StreakFlame; 0 → "Light it today") + To revise (reviewed-today/cap ring) + Focus (weekly goal ring).
- Row 2: This week bars (7) + Next revision flashcard (inset card, difficulty + due/overdue chip with pulse past 7 days, strength ladder, Re-solve).
- Row 3: heatmap (8) + Your sheets (ring for the main sheet, pixel bars for the rest; empty → difficulty split + pick a sheet).
- Row 4: Topic mastery radar + top-5 bars, Solve next as a scroll-snap card rail.
- Row 5: Focus this week (goal ring + 7-day strip, sessions), Recent solves timeline (glowing nodes, platform marks, growing underline, ×n counter chip, staggered rows).
- Row 6: platform cards (mark, verified shine, rating, sparkline, difficulty split, synced time).
- All `from`-only keyframes now use `backwards` fill so hover/press transforms keep working.

## Phase 6 shipped (Revision, Sheets, Sheet detail, Problem)

- Revision: "Revision, five today." header; hero Today's-queue card (done/target ring, pass-rate + waiting chips, one lime "Start with …" CTA, beam while items remain, pixel confetti once per day when cleared); 4 rolling mini stats; queue rows as inset cards (difficulty, overdue chip pulsing past 7 days, compact strength ladder, topic tags) with Re-solve + a teal/amber/rose segmented self-grade (Remembered ✓ / Shaky ~ / Forgot ✕, confetti on Remembered); collapsible "How revision works" ladder; 14-day dot strip; history grouped by week with pass/fail glyphs.
- Sheets: per-sheet identity (accent colour, monogram, pixel cover); followed sheet as a Continue hero (ring, recent ticks, ETA, lime Continue); other sheets as tilt + spotlight cards with rings and rolling counts; Follow toggle with drawn check.
- Sheet detail: header in the sheet's colour, hero progress card (ring, Easy/Medium/Hard or Basic/Core/Pro bars, hours left, video count); richer Continue banner (play button, ring, aurora, row pulse); sticky glass toolbar with `/` to search; numbered step headers with gradient bars and a completion check; section mini bars; rows with difficulty accent bar, level chips, revise chip, resource dock of platform marks (tooltips, brand on hover, magnify), notes dot, star pop, pixel burst on manual tick; long lists use content-visibility.
- Problem: status + difficulty + topic chips, one lime Re-solve plus "Open on <platform>"; attempts timeline with verdict chips, active-time bars and quoted notes; revision card with full ladder and segmented self-grade; Solve-on logo tiles; sheet chips with sheet colours; similar problems as mini cards.
- Not done (needs data): per-sheet difficulty bars on the Sheets index; section-complete toast.

## Phase 7 shipped (Sessions, Analytics, Contests, Groups, College, Settings)

- Sessions: header, hero Focus-this-week card (goal ring + 7-day strip), rolling stats, avg session, How-you-solved ring, sessions grouped by day with sticky day headers; rows with outcome glyph, active/idle two-tone bar, submit count, solve-mode chip; empty state is an extension hero.
- Analytics: header with a sliding-pill range control (links), tinted KPI tiles with progress bars, radial best hours, verdict donut, how-you-solved ring, difficulty/topic bars, mistake tag cloud, mastery radar + sorted tiered list, mastery formula as a 4-tile disclosure.
- Contests: header, illustrated empty state (pixel podium over a blurred ghost of the page), rating cards with rolling rating, peak/last chips and Codeforces rank bands, upsolve progress bar, attempted chips, rank/delta chips in history.
- Groups: illustrated hero empty state, create (suggested-name chips) and join (paste button) as side-by-side cards, group cards with avatar stacks; detail page with podium leaderboard (medals, crown, rolling scores, gradient bars, you-row in violet), pulsing presence dots and lime live timers, copy → drawn check.
- College: opt-in hero with lock + switch, "What others see" preview row, consistency score as four meters (from SCORE_PARTS), batch/college + metric segmented controls.
- Settings: two-column layout with a sticky scroll-spy section nav, avatar profile header + icon definition grid, platform rows as inset cards with marks, enabled-looking Connect (tooltip when empty), spinning sync, CodeChef/AtCoder ghost rows, device cards with active pulse and hold-to-confirm disconnect modal, reviews/day segmented control, weekly email switch + preview modal, streak freeze calendar picker with quota chips.
- Not done (no data, design-only): group cards' "your rank / this week's leader", device OS/browser detail, live handle availability.

## Phase 8 shipped (Landing, Login, Onboarding, Extension connect, Profile, Share card, 404)

- Landing: glass nav with sliding active-section pill and lime Get started; hero with word-by-word TextReveal at full contrast, aurora + meteors + cursor glow, magnetic CTA, sheet ticker, tilting live cards (filling progress, ladder steps lighting in sequence, ticking timer); platform marquee with marks; full-contrast section heads; How it works with an AnimatedBeam (LeetCode/GFG → Extension → Upsolve → Dashboard) and spotlight step cards; interactive sheet demo (tick rows, pixel burst, local state only); colleges with gradient bars and a shimmering Coming-soon chip; pricing with a border-beam Free card + ribbon and a hatched "Later"; FAQ with lime open state; aurora final CTA; pixel-heart footer (stray square gone); Lenis smooth scroll (landing only, off for touch/reduced motion).
- Login: aurora + starfield brand panel, cycling highlights, beam-bordered auth card, large Google button, email field with icon, animated envelope on "Check your inbox".
- Onboarding: 3-node step indicator with filling line, direction-aware step slides, live profile card preview, custom selects, violet goal cards and chips, segmented daily goal.
- Extension connect: radar pulse while searching, beam to Upsolve when found, numbered install guide, connected hero with device name and one-time confetti.
- Public profile: hero banner (beam, grain, stars, difficulty-ring avatar, streak flame chip, Share button), rolling stat tiles, platform cards with marks + verified, topic radar; not-found with a pixel ghost in orbit.
- Share card: aurora background, violet → lime heat ramp, today outlined, tinted stat labels, URL pill.
- 404: chrome numerals with sheen and decode, verdict chip, meteors; new global-error page; dashboard error uses ErrorState.

## Phase 9 shipped (Polish) and final summary

- Production build passes (34 routes); typecheck and lint clean.
- Sweep: no hatch used as "empty" (only future days, the "Later" pricing card); the old indigo CTA is gone (the `indigo` variant is now a violet secondary used only for Follow); one lime primary per view on every page; Search and Join pages got headers and states; removed the unused `@tanstack/react-virtual`.
- Responsive: checked at a true 390px (inside an iframe; headless Chrome's own window can't go below ~500px) and 1400px, dark and light.

### Dependencies added

`@number-flow/react` (~6 KB gz, app routes), `lenis` (~4 KB gz, landing only, lazy). Everything else (charts, beam, tilt, magnetic, confetti, date range, select, modal) is in-house; `motion`, `cmdk`, `sonner`, `canvas-confetti` were already installed.

### Known gaps / follow-ups

- Needs data the pages don't receive (design-only brief): heatmap tooltip minutes/verdicts, session verdict sequence, group card rank/leader, revision Undo, live handle check, device OS detail, per-sheet difficulty bars on the Sheets index, college branch/year filters.
- Not verified visually: signed-in pages (build + types only). Check Overview, Revision, Sheets, Problem, Sessions, Analytics, Contests, Groups, College and Settings in both themes.
- Lighthouse not run here (needs a deployed build); effects are transform/opacity only, decorative loops pause off-screen, Lenis/confetti are lazy.
- Route pixel transition can't be switched off by users yet (it is off under reduced motion).

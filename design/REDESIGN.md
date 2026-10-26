# Upsolve UI/UX redesign (Oct 2026)

A visual and interaction upgrade on top of DESIGN.md. **No features, routes, data shapes or
business logic change.** References: "Donezo" task dashboard (soft canvas, 20–24 px cards, one
filled feature KPI with a ↗ circle button, capsule bars with hatched "remaining", half-ring gauge,
dark timer card, sidebar promo card) and "Liquid Brokers" landing (near-black hero, starfield,
glossy glowing centrepiece, floating glass stat cards, pill nav). Accent stays lime (one CTA per
screen, live/today) + indigo (data, active).

## Stack (audit)

| Area      | What's there                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16.4 App Router (Turbopack, Cache Components, PPR), React 19.3, TypeScript                                      |
| Styling   | Tailwind v4; tokens in `packages/ui/src/styles/{tokens,index}.css`; own component kit `@upsolve/ui`                     |
| Routing   | App Router; auth gate in `proxy.ts`; dashboard under `/dashboard/*`                                                     |
| Charts    | None: hand-built SVG/CSS (heatmap, sparkline, rating chart, bars)                                                       |
| Icons     | lucide-react (1.75–2 stroke)                                                                                            |
| Animation | CSS keyframes only (drift, word reveal, marquee). Added in this redesign: `motion`, `cmdk`, `sonner`, `canvas-confetti` |

## Routes

`/` landing · `/login` · `/onboarding`, `/onboarding/connect` · `/extension/connect` ·
`/u/[handle]` public profile · `/join/[code]` group invite · `/dashboard` overview ·
`/dashboard/{sessions, revision, sheets, sheets/[slug], analytics, contests, problems/[id], search, groups, groups/[id], college, settings, feedback}`.

## Design audit: the biggest problems

1. **No navigation on phones.** The sidebar is hidden below 1024 px and nothing replaces it: on a phone you can't reach Revision, Sheets, Groups…
2. **Cards are all the same box.** Static and clickable cards look identical; no hover lift, no spotlight, no affordance (Donezo's ↗ circle).
3. **Buttons have no depth.** Colour-only hover, no press, no loading state; no outline/danger/link variants. `cn()` doesn't merge classes, so overrides like `hidden` silently lose.
4. **The active nav item just appears.** No sliding indicator, no collapse, no tooltips.
5. **Header is static.** Not sticky, no frosted glass on scroll; search is a page, not a command palette.
6. **Loading is grey pulsing blocks** that don't match the content's shape; no shimmer.
7. **Silent actions.** Saving a note, starring, joining a group, reviewing: no toast, little feedback.
8. **Nothing moves with purpose.** No count-ups, no chart draw-in, no page transitions, no scroll reveals.
9. **KPI cards lack context**: no trend, no link to the page behind them.
10. **Repeated one-off widgets**: three copies of the toggle switch, hand-built "revise" and tier chips, ad-hoc empty states.
11. **No error boundaries or 404 design**: a database hiccup shows a raw error.
12. **Magic numbers**: `text-[13.5px]`, `duration-[240ms]` repeated instead of tokens; motion durations not tokenised.
13. **Light theme is an afterthought**: it should feel like Donezo (soft grey canvas, white cards), not inverted dark.
14. **No scrollbar styling, no back-to-top, no scroll progress** on long pages.

## Design system (added to the existing tokens)

- **Surfaces**: `bg` (canvas) → `bg-2` → `surface` (cards) → `surface-2` (raised/inputs) → `surface-3` (pressed/tracks) + `overlay` (dialogs, frosted bars).
- **Brand scales**: `primary-50…900` and `signal-50…900`, derived with `color-mix` from the two brand colours.
- **Difficulty**: `easy|medium|hard` each with `-soft` (tint) and `-line` (border) variants; same for `ok|warn|bad|info`.
- **Type scale**: `2xs 11 · xs 12 · sm 13 · base 14 · md 15 · lg 17 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36 · 5xl 48 · 6xl 60`, tight tracking above 24 px, tabular numbers everywhere a number is shown.
- **Radius**: `xs 6 · sm 10 · md 14 · lg 20 · xl 24 · 2xl 28 · full`.
- **Elevation**: `shadow-xs…xl` (layered, low-opacity); dark mode adds a 1 px inner top highlight and uses glows instead of black shadows.
- **Motion**: `instant 100 · fast 150 · base 220 · slow 350 · slower 500 ms`; `ease-out`, `ease-in-out`, `ease-spring`. Only transform/opacity/filter/clip-path; reduced motion keeps fades only.

## Plan (run end to end)

1. Tokens, theme transition, type scale, scrollbars, selection, focus ring.
2. Components with every state (button, card, input/search, switch, checkbox, badges, tooltip, skeleton, empty/error state, dialog, toasts) + `/styleguide` (dev only).
3. Shell: collapsible sidebar with sliding indicator + promo card, frosted sticky top bar, mobile bottom nav, command palette, page transitions, toasts provider.
4. Dashboard: greeting, Donezo-style KPI row with ↗ and count-ups, capsule week chart, half-ring sheet gauge, heatmap tooltips, timer card, skeletons.
5. Sheets/problem list + problem detail: animated filters, hover quick actions, sliding tabs.
6. Landing (Liquid Brokers hero: glossy orb, starfield, floating glass stats, magnetic CTA, real numbers), login, settings, public profile.
7. Scroll reveals, celebrations, empty/loading/error/404 states, back-to-top.
8. Responsive, accessibility, performance and consistency sweep.

## What shipped (27 Oct 2026)

All eight phases, in one pass. No route, data shape, prop contract or business rule changed.

- **Tokens** (`packages/ui/src/styles`): overlay surface, `line-3`, `info`; `*-soft` / `*-line` tints for difficulty and status; `primary-50…900`, `signal-50…900`; `text-2xs/13/15/17`; `rounded-xl` 24 / `2xl` 28; `shadow-xs…xl`, `shadow-glow`, `shadow-glow-signal`; `--dur-instant…slower`; utilities `skeleton`, `glass`, `dots`; keyframes `page-in`, `fade-up`, `pop`, `grow`, `grow-x`, `draw`, `shimmer`, `float`; themed scrollbars; cross-fading theme switch. Light mode re-tuned to a Donezo-style soft canvas.
- **Components** (`@upsolve/ui`): Button (8 variants, 5 sizes, lift, spring press, sheen on lime, `loading`), Card (`interactive`, `spotlight`), Switch, Tooltip, Skeleton/SkeletonCard, EmptyState, Kbd, StatusBadge, SpotlightTracker; web: CardLink (↗), Tabs (sliding pill), CommandPalette, Toaster, ActivityHeatmap, KpiCard, WeekCapsules, HalfGauge, CountUp, confetti on streak milestones.
- **Shell**: collapsible sidebar (state remembered) with a sliding active marker, tooltips when collapsed, revision badge and extension promo; sticky frosted top bar; phone tab bar with a More sheet; Ctrl/⌘ K palette (pages, problem search, theme, share card, feedback, sign out); page transitions; toasts; skip link.
- **Pages**: bento dashboard; sheet browser with sliding filter pill, removable chips, sticky step headers, quiet row actions; problem page tabs; landing hero scene (orb, starfield, glass cards, parallax, magnetic CTA), dashboard preview, scroll reveals, progress bar, back-to-top; split login; public-profile banner with avatar ring; dashboard error boundary; 404; `/styleguide` (dev only).
- **New dependencies** (web only, client islands): `motion` (sliding indicators), `cmdk` (palette), `sonner` (toasts), `canvas-confetti` (lazy-loaded celebrations).

### Not done / follow-ups

- Settings save on change, so there's no sticky "unsaved changes" bar.
- Code blocks with syntax highlighting: the app never stores code (privacy), so there's nothing to highlight.
- The dashboard itself can't be screenshotted without signing in; its widgets are reviewed on `/styleguide` with sample data.

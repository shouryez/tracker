# DsaKaro: UI and UX add-ons plan

Status: **proposal, waiting for page-by-page approval.** Nothing here ships until a page is picked.
Built so far, not yet committed: Sound and haptics (`lib/feel.ts`, Settings card) and the Revision swipe deck
(`components/revision-deck.tsx`). Both ship with their pages.

Sources looked at: React Bits, Aceternity UI, Magic UI, 21st.dev, Untitled UI, Dribbble 2026 shots, the 2026
liquid-glass write-ups (kube.io, LogRocket, ekino), and the Smashing Magazine streak-psychology piece (Feb 2026).
Every item below is our own implementation in the Orbit system. Nothing is copied, and we install no new UI kits.

---

## 0. Ground rules (apply to everything)

- **Motion explains, guides or confirms; it never just decorates.** If an effect doesn't tell you something
  (state changed, where a thing went, what's clickable), it doesn't ship.
- **Orbit colours:**
  - Ember only on the primary action, the focus orb and the live dot.
  - Mint for data and success, sky for info, sand for medium or focus time, rose for hard or wrong.
- **Accessibility:**
  - Every effect has a `prefers-reduced-motion` path.
  - Pointer effects only on `(pointer: fine)`.
  - Keyboard can do everything a gesture can.
  - Sound is off by default.
- **Performance:**
  - Each page's add-ons are lazy-loaded client islands.
  - No three.js; WebGL only on the landing and 404 pages.
  - No layout shift.
  - 60 fps on a mid-range phone.
  - Effects pause off-screen.
- **Data:** everything works from data we already have. Items that need backend or database work are marked
  **[backend]**, and I'll ask before any migration.
- **Delivery:** one page per round. Build, screenshot at 390 px and 1440 px in both themes, then commit and push.

---

## 1. Design-language upgrades (global look and feel)

### 1.1 Glass system: three depth tiers
The aim is to bring in modern glass without hurting readability. Content stays solid; only the chrome floating
above it turns to glass.

| Tier | Used for | Treatment |
|---|---|---|
| **Liquid** (top chrome) | Mobile tab bar, the session notch, command palette, floating action pill | SVG `feDisplacementMap` refraction through `backdrop-filter` on Chromium, plus an inner rim highlight and a specular sheen that follows the pointer (desktop) or device tilt (phones, if allowed). **Fallback** for Safari/Firefox: `blur(20px) saturate(160%)` plus the same rim and sheen. The displacement map is generated once on a canvas and cached. |
| **Frosted** (overlays) | Modals, popovers, menus, toasts, tooltips | Blur, a 1 px light rim, a soft inner shadow and a grain overlay. Toasts stack with depth (scale and blur on the cards behind). |
| **Solid** (content) | Cards, tables, charts | Stays as today (`surface-card`). Text never sits on refractive glass. |

- **Progressive blur** (Magic UI) under the sticky header: content softly blurs as it scrolls beneath, instead
  of a hard edge.
- **Glass "lens" tooltip** for the heatmap and charts: a small frosted bubble that magnifies the hovered cell.

### 1.2 Cursor system (desktop only, never hides the real cursor)
A **"halo" pointer** that understands context, inspired by the iPadOS pointer and React Bits' Target and Smooth
cursors. The system cursor is always shown, and Settings has **Cursor: System / Halo**.

| Hovering | Halo does |
|---|---|
| Buttons and pills | Snaps to and wraps the button's shape (magnetic), with a slight lift. |
| Problem rows | Shrinks to a dot with a tiny "Open ↗" label. |
| Heatmap or chart | Becomes a crosshair with a date bubble. |
| Draggable cards (deck, plan items, covers) | A "grab" ring that stretches in the drag direction. |
| Text inputs | Fades out (the native I-beam takes over). |
| Disabled controls | Goes faint with a tiny ⊘. |

Also:
- **Click spark** (React Bits) on **primary actions only**: four short ember strokes, done in 300 ms.
- No cursor trails in the app. A **fluid "splash" cursor** is allowed only as an easter egg on 404 and the
  landing hero.

### 1.3 Motion system
- One spring vocabulary in `motion.ts`: *snap* (UI), *settle* (cards) and *float* (decor), with durations as
  tokens.
- **Blur Fade** content entrance replaces skeleton pop-in (skeleton → content cross-fade).
- **iOS-style large titles**: the page title collapses into the compact header as you scroll.
- **Sliding indicators** everywhere a selection moves (tabs, segmented controls, nav), all on the same spring.
- **Stateful buttons** (Aceternity): label → spinner → ✓, morphing in place with no width jump.
- **Hold to confirm** for destructive actions (delete account, leave group, reset progress): an ember fill
  sweeps while you hold, which replaces confirm dialogs.

### 1.4 Sound and haptics *(built)*
- Synthesized ticks and chimes, no files. Off by default; haptics are on for Android.
- A pitch ladder for combos (Recall, swipe deck).
- Optional **soft brown noise** for focus sessions, under the same setting.

### 1.5 Typography and numbers
- **Variable proximity** (React Bits): nav labels and big headings get slightly bolder as the cursor nears
  (Inter Tight is variable). Landing and empty states only.
- **NumberFlow** for every live number (streak, solved, timers), with tabular digits throughout.

### 1.6 Theme switching
- **Circular reveal** (View Transitions) spreading from the theme toggle.
- The meta theme-color and browser chrome follow the theme.

---

## 2. Global features (every page)

1. **Page morphs** (View Transitions API with a fallback): a sheet cover grows into the sheet page, a problem
   title slides into the problem header, and tabs cross-fade.
2. **Live session notch** (Aceternity Notch, liquid glass): a timer pill shows while a session runs. It expands on
   hover into Pause, Stop and the current problem, and on phones it sits at the bottom.
3. **Context menu** on any problem (right-click or long-press): Open, Re-solve, Not today, Add to Today, Copy link.
4. **Peek preview** (Aceternity Link Preview): hovering any problem link for 400 ms shows a frosted card with
   difficulty, ring, last solved, and your time compared with the median.
5. **Command palette upgrades:**
   - Recent items and inline actions (Start session, Grade revision, Add task).
   - A preview pane.
   - Fuzzy topic jumps ("dp" lists all DP problems).
6. **Keyboard-first lists** (Linear-style): `j`/`k` move a sliding focus ring, `x` selects, and a floating
   **bulk-action bar** appears (Add to Today, Snooze, Retire).
7. **Mobile:**
   - A liquid-glass **bottom tab bar** whose active blob morphs between tabs.
   - **Swipe actions** on rows (right = done or remembered, left = not today).
   - **Pull to sync** with Stacky stretching.
8. **Smart empty states:** Stacky reacts to the situation, with one clear next action and a short animated
   example (e.g. a ghost row demoing what will appear).

---

## 3. Page by page

### Today (`/dashboard`)
1. **Vanishing task input** (Aceternity): the placeholder rotates real suggestions. On Enter the text dissolves
   into particles and the task drops into the list with a spring.
2. **Drag to reorder** plan items (spring and FLIP). The top item gets an "Up next" glow and the halo grab ring.
3. **Budget ribbon:** a draggable time ribbon replaces the 30m–3h chips, and the "these can wait" line moves live.
4. **Day complete:** the ring closes, "All done" lights up in neon, then one confetti burst and a chime.
5. **"Getting started" checklist** for new users, derived from data: platform linked, extension connected, sheet
   followed, first review. It collapses into a ✓ pill when finished.
6. **Gentle streak at-risk cue:** after 8 pm local with nothing solved, the streak chip breathes ember once per
   visit with "One easy problem keeps it". No pop-ups and no guilt, per Smashing's streak guidance.

### Revision and Recall
1. **Swipe deck** *(built)*: right remembered, left forgot, up shaky; keys and buttons too. Coloured progress,
   Undo, and a neon "Deck cleared".
2. **Memory-curve tooltip** that follows the pointer: estimated recall % now, and the date it drops below 80 %.
3. **Ring focus** (Focus Cards): hovering a ladder ring highlights its problems and blurs the rest.
4. **Ring promotion moment:** when a problem moves out a ring, its dot visibly travels to the outer ring on the
   orbit.
5. **Recall:** a 3D flip to reveal the answer; a combo meter whose chime pitch rises with each correct answer in
   a row; a "perfect round" holo badge.

### Sheets (list and sheet page)
1. **Book covers with glare and tilt** (Glare / Comet Card). The cover swings open into the sheet page (page
   morph).
2. **Topic constellation view:** each topic is a star cluster that brightens as you solve, with a toggle between
   map and list.
3. **Satisfying ticks:** an ink strike-through, and a mint pixel flies into the progress bar (as on the landing).
4. **Sticky progress bar** appears while scrolling long sheets, showing "Arrays 14/20 · overall 38 %".
5. **"Next up" spotlight:** the next unsolved problem in order gets a soft beam border.

### Problem page
1. **Attempt timeline** (Aceternity Timeline with a scroll beam): opens, verdicts, reviews and ring moves.
2. **Your time against the median:** a small animated distribution curve with your marker.
3. **Similar problems carousel** (Apple Cards Carousel) from the same topics.
4. **Notes with a blurred "key insight"** you hover to reveal (Evervault-style), for self-testing.

### Contests
1. **Split-flap countdown** (Text Flipping Board) for the next contest, with optional ticks.
2. **Rating chart scrubber:** a draggable crosshair shows the contest, rank and change.
3. **Upsolve cards** that react to the direction the cursor enters from (Direction Aware Hover); "Add missed to
   Today" already exists.
4. **Live bar when a contest starts in under 30 min**, with a "Start session for it" button.

### Sessions and Focus
1. **Ambient focus mode:**
   - A drifting aurora with grain.
   - A pomodoro ring with tick marks.
   - Optional brown noise.
   - A screen wake lock while running.
2. **Break breathing:** the orb expands and contracts in a 4-7-8 rhythm during breaks.
3. **Session receipt:** a paper slip "prints" at the end with duration, problems and idle time removed. It's
   shareable.

### Library (notebook)
1. **Masonry layout with Focus Cards** hover; key insights stay blurred until hovered.
2. **Search with the vanishing input**, plus tag chips that filter with FLIP.

### Insights (analytics)
1. **Bento layout with linked charts:** hovering a day moves a crosshair on every chart.
2. **This week vs last** comparison slider; the topic radar morphs between weeks.
3. **Charts draw themselves** (path animation) on first view only.
4. **Weekly "Wrapped" stories:** full-screen swipeable cards ("You solved 23 · fastest Medium 11:40 · weakest
   topic Graphs") built from weekly review data, each shareable as an image.

### People (groups)
1. **Study hall in orbit** (Orbiting Circles): live members circle the group with presence dots and avatar
   tooltips.
2. **Leaderboard reorder animation**, compared within similar levels (segmented, per the gamification research).
3. **Dotted India map** of college activity (Magic UI Dotted Map) on the college leaderboard.
4. **[backend]** Cheers and pokes with floating emoji.

### Settings
1. Theme switch with the circular reveal.
2. Sound and haptics *(built)*, Cursor (System / Halo) and Motion (Full / Reduced).
3. Live previews beside each setting (e.g. a mini email preview next to the reminder time).

### Public profile (`/u/[handle]`)
1. **Holographic stat card:** foil shimmer, glare and tilt following the pointer or device; download as an image.
2. **Badge shelf:** collectible holo badges for milestones derived from stats (streak, solved, rings graduated,
   perfect recall). No new tables.
3. **Heatmap draws itself** in, oldest week first.

### Onboarding and Login
1. **Import loader** (Multi Step Loader): "Fetching LeetCode history → Matching your sheets → Building your queue".
2. **Pointer-reactive dot grid** on login (Canvas Reveal), calm and ink-only.
3. **Sheet picker covers** get glare and tilt, plus a neon "You're set" at the end.

### 404 and errors
- Already neon. Add the splash-cursor easter egg, and give the error page a "Retry" stateful button.

### Landing (later, when you say so)
- Variable-proximity section headings.
- A marquee whose speed follows your scroll.
- Target cursor on the feature cards.
- Ghost Type in the footer *(done)*.

---

## 4. Suggested build order
0. **Design language first:** the glass tiers, cursor halo, motion tokens and stateful and hold buttons, since
   every page uses them.
1. Revision (half done).
2. Today.
3. Sheets.
4. Contests.
5. Sessions.
6. Public profile and badges.
7. Insights, with Wrapped.
8. People.
9. Problem page, Library, Settings, Onboarding.
10. Global page morphs, notch, peek and bulk actions.

## 5. Open questions for you
- Liquid glass: refraction on Chromium only with a frosted fallback elsewhere, or frosted everywhere for
  consistency?
- Cursor halo: on by default for desktop, or opt-in?
- Weekly Wrapped and the badge shelf add a light game layer. Keep it, or stay minimal?

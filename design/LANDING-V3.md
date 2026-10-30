# Landing v3: "The 1 a.m. desk"

The landing hero is a pinned, scroll-scrubbed story that shows the product working:
**open a problem → it's timed → Accepted → one honest answer → it lands on your dashboard.**
The rest of the landing becomes "one wow per viewport" scenes in later phases (see the brief).

Code: `apps/web/src/components/landing/hero/`. Tuning bench: `/lab/hero` (dev only; add
`?debug` for a live `p` readout, `?noscene` for the static poster).

## How it's built

| Piece                 | File                                         | Notes                                                                                                                                                                                                                         |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timeline + every knob | `scene.ts`                                   | Beat ranges, moments, camera, rig size, captions, rail, demo numbers. Re-pacing is a one-file change.                                                                                                                         |
| Server hero           | `hero.tsx`                                   | H1 (the LCP element), lede, CTAs, "Skip intro", captions `<ol>`, the "at a glance" head, the static poster. All real HTML.                                                                                                    |
| Pre-paint gate        | `scene-script.ts`                            | Inline script sets `<html data-scene="on">` when JS runs, reduced motion is off and the device isn't low-end (≤2 cores / ≤2 GB). CSS variants `scene:` / `noscene:` key off it, so pinning never causes a layout shift.       |
| Lazy loader           | `hero-loader.tsx`                            | `next/dynamic(..., { ssr: false })`; re-runs the gate after client-side navigation.                                                                                                                                           |
| Scene                 | `hero-scene.tsx`                             | `motion` hooks only (`useScroll`, `useSpring`, `useMotionValueEvent`). One `render(p)` writes transforms straight to `[data-part]` nodes; React re-renders only when the discrete story state changes (~12 times per scroll). |
| Laptop                | `laptop.tsx`                                 | DOM + CSS 3D: base slab with keyboard, lid on a hinge, bezel, camera dot, moving reflection. Pure markup (the poster uses it too).                                                                                            |
| Screens               | `screen-problem.tsx`, `screen-dashboard.tsx` | Real React UI on tokens, so it follows the theme. Generic problem page (not any judge's UI) + the extension pill; compact dashboard (example numbers).                                                                        |

## Timeline (`p` = progress through the pinned section)

| `p`     | Beat                                                                                                                                                                                                                                                                                     | Caption                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 0–.12   | Headline + CTAs over a **closed** laptop (camera pulled back to `restScale`).                                                                                                                                                                                                            | —                                                                                                  |
| .12–.30 | Headline lifts away. Lid opens 0°→102° over `lidRange`, tilt 58°→12°, camera dollies to `dolly`. Screen powers on (`powerOn`: black → glow → page) and its light spills on the deck and desk.                                                                                            | Open any problem.                                                                                  |
| .30–.55 | Problem page. Code types in (`typing`). Pill clock is a function of `p` (rewinds on scroll-up). `tabAway` → _paused · idle_; `wrong` → Wrong Answer with the off-by-one highlighted; `fix`; `accepted` → Accepted; `honest` → Solo · Hint · Saw solution; `solo` picked.                 | The timer starts itself. → Switch tabs, it pauses. No fake hours. → Accepted? One honest question. |
| .55–.70 | Camera pushes into the screen: cover on desktop (`pushMargin` past the edges), contain on phones. Problem page dissolves into the dashboard (`dissolve`).                                                                                                                                | —                                                                                                  |
| .64–.76 | **The pixel:** a lime pixel leaves the Accepted chip and flies a quadratic Bézier into today's heatmap cell (`flight`). At `landed`: Solved 411→412, Streak 46→47 (flame flicker), Koko joins the revision queue.                                                                        | Then it lands where it matters.                                                                    |
| .82–.95 | Hand-off: laptop body fades, camera pulls back until the screen exactly covers `[data-frame-target]`, corners round, stage colour cross-fades to the page colour. `glance` (.91): "Your prep, _at a glance._" fades in. The last frame **is** that section, so un-pinning has zero jump. | —                                                                                                  |

Pin height: 500vh desktop, 320vh under 640px (`scene:h-[500vh] max-sm:scene:h-[320vh]` in `hero.tsx`).

## Tuning knobs

- **Pacing:** `BEATS`, `MOMENTS`, `CAPTIONS`, `RAIL` in `scene.ts`.
- **Camera:** `CAMERA.tiltClosed/tiltOpen`, `lidOpen` (keep `lidOpen − 90 = tiltOpen` so the screen faces the camera for the push), `restScale`, `dolly`, `restDrop`, `pushMargin`, `spring`.
- **Size:** `RIG.fit` (share of the viewport), screen 960×600 nominal. The screen UI's zoom is in `globals.css` (`.lt-ui`: 1.12 desktop, 1.55 phone) so the server poster matches.
- **Poster scale:** `.lt-poster` breakpoints in `globals.css`.

## Rules it keeps

- Only `transform`, `opacity`, `clip-path` are animated; `will-change` only while the stage is on screen.
- One lime element at a time: the CTA (nav CTA is ink), then the pill's live dot, then the flying pixel / today's cell.
- Stage is `aria-hidden`; captions are real text in DOM order (screen readers get all five); one `h1`; "Skip intro" is the first focusable item after the nav and jumps to `p = 1`.
- No scroll-jacking: native scroll (Lenis smoothing on desktop only, as before), no snap.
- Fallback (no JS, reduced motion, low-end): no pin; H1 + CTAs, a static open laptop showing the dashboard, captions as a stepped list.

## After the hero (phases b–d)

| Scene            | Where                                       | How                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading          | `hero.tsx`, `.lt-rest*` in `globals.css`    | The closed laptop is server-rendered in the rest pose (scale approximated in CSS steps) and cross-fades out when the scene mounts. The scene chunk starts downloading when the loader module runs.                                                                                                                         |
| Marquee          | `VelocityMarquee` (`scene-bits.tsx`)        | Playback rate and a small skew follow scroll velocity, then ease back.                                                                                                                                                                                                                                                     |
| Features bento   | `PlayOnView` + `armed:` variant + `.demo-t` | Each card's demo plays once at 40% visible and resets when you scroll back above it. Starting states are written with `armed:`; with no JS or reduced motion nothing is armed, so the finished state shows. Delays go in inline `transitionDelay` (`.demo-t` is unlayered CSS and wins over Tailwind's layered utilities). |
| Forgetting curve | `forgetting-curve.tsx`                      | Pinned (260vh / 190vh phones) only with `data-scene="on"`. Grey decay clips in over p 0–.25, the ladder curve over .25–.9 (left-to-right `clip-path`), pulses and the hopping card follow. Illustrative curve, labelled "example".                                                                                         |
| How it works     | `StackCards`                                | Sticky cards 18 px apart; the covered card scales to .95 and dims.                                                                                                                                                                                                                                                         |
| Sheets           | `SheetCover` rail                           | Native `scroll-snap` row (no scroll-jacking).                                                                                                                                                                                                                                                                              |
| Friends          | `Friends()` in `page.tsx`                   | Study room (ticking timers) and a board whose rows slide to the new order (CSS transforms, no layout animation library).                                                                                                                                                                                                   |
| Footer           | `WordmarkFill`                              | The headline bar's lime overlay scales 0→1 from the wordmark entering the viewport to the bottom of the page.                                                                                                                                                                                                              |

## Measured

- New JS on `/`: ~2 KB gz initial + ~27.5 KB gz lazy (scene 11.9, motion hooks 9.3, NumberFlow 6.3). Budget 40 KB.
  The page's own initial JS is ~169 KB gz (the 38.6 KB polyfill chunk is `noModule`, so modern
  browsers skip it); ~129 KB of that is React DOM + the Next runtime.
- Lighthouse mobile (local `next start`): Performance 90, Accessibility 100, Best Practices 100, SEO 100, CLS 0, TBT 50 ms.
- LCP: real LCP = FCP (~0.3 s, the H1 paints at once). Lighthouse's _simulated_ LCP is 3.6 s, but
  `/login` (no scene at all) simulates the same 3.6 s and `/?noscene` 3.3 s: it's the app-wide
  framework JS + four preloaded fonts replayed on throttled 4G, not the landing. Fixes belong to
  the app shell (see Part 2 proposals): lazy toaster, fewer preloaded fonts, less client JS in the root layout.
- Scrolling the hero with 4× CPU throttling and real wheel input: no long tasks.
- No horizontal scroll at 360, 390, 768, 1024, 1440, 1920.
- Keyboard: Tab order is nav → "Skip intro" → CTAs; Enter on "Skip intro" lands at p ≈ 0.97.

## Staying smooth on phones

Measured with an Android-like profile (412×915 at 2.625×, touch, 4× CPU throttle, scroll gestures
through the whole page): janky frames (>20 ms) went from 10% to 2%, and the idle main thread on the
hero from ~27% busy to ~1%. The rules that got it there (apply them to new effects too):

- **Write only what changed.** `hero-scene.tsx` caches the last value per node and property (`put`); an
  unchanged write still invalidates, and inside the laptop screen that means repainting the screen.
- **No layout reads per scroll event.** The hero's progress is `(scrollY − pinTop) / range`, with
  `pinTop` measured on resize only; nav auto-hide caches where the hero ends; scroll-progress is a CSS
  scroll-driven animation. Other scroll scenes read all rects first, then write, and only listen while
  they're near the viewport.
- **Animate transform and opacity, on GPU layers.** Parts the hero animates get `will-change` while
  the stage is on screen; the revision curve draws by sliding two nested boxes (an animated
  `clip-path` repaints every frame). Infinite loops on `<svg>` elements, `box-shadow`, `border-radius`
  or custom properties run on the main thread: the streak flame animates an HTML wrapper, the pulse
  ring is a scaled pseudo-element, the border beam only spins on mouse devices.
- **No big blur filters.** Soft lights are radial gradients (`GlowOrb`, `Aurora`, page-header glows);
  `glass` drops its backdrop blur on touch screens; the hero grain (a blend over the whole stage) is
  hidden on touch.
- **Pause what nobody sees.** `PauseOffscreen` stops CSS loops in landing sections that are off
  screen; `Reveal` doesn't fade whole sections on touch (it promotes a page-sized layer).
- **React state only on change.** Back-to-top and the dashboard header set state when their boolean
  flips, not on every scroll event.

## Alternative (documented, not built)

A photoreal "hands opening a laptop" image sequence (~120 AVIF frames) scrubbed on a `<canvas>`,
with the DOM screen composited on via a perspective transform. More realistic, but 2–4 MB of
assets and heavier on phones. The DOM-built scene is the default.

<!-- DsaKaro -->

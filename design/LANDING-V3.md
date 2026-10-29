# Landing v3: "The 1 a.m. desk"

The landing hero is a pinned, scroll-scrubbed story that shows the product working:
**open a problem → it's timed → Accepted → one honest answer → it lands on your dashboard.**
The rest of the landing becomes "one wow per viewport" scenes in later phases (see the brief).

Code: `apps/web/src/components/landing/hero/`. Tuning bench: `/lab/hero` (dev only; add
`?debug` for a live `p` readout, `?noscene` for the static poster).

## How it's built

| Piece | File | Notes |
| --- | --- | --- |
| Timeline + every knob | `scene.ts` | Beat ranges, moments, camera, rig size, captions, rail, demo numbers. Re-pacing is a one-file change. |
| Server hero | `hero.tsx` | H1 (the LCP element), lede, CTAs, "Skip intro", captions `<ol>`, the "at a glance" head, the static poster. All real HTML. |
| Pre-paint gate | `scene-script.ts` | Inline script sets `<html data-scene="on">` when JS runs, reduced motion is off and the device isn't low-end (≤2 cores / ≤2 GB). CSS variants `scene:` / `noscene:` key off it, so pinning never causes a layout shift. |
| Lazy loader | `hero-loader.tsx` | `next/dynamic(..., { ssr: false })`; re-runs the gate after client-side navigation. |
| Scene | `hero-scene.tsx` | `motion` hooks only (`useScroll`, `useSpring`, `useMotionValueEvent`). One `render(p)` writes transforms straight to `[data-part]` nodes; React re-renders only when the discrete story state changes (~12 times per scroll). |
| Laptop | `laptop.tsx` | DOM + CSS 3D: base slab with keyboard, lid on a hinge, bezel, camera dot, moving reflection. Pure markup (the poster uses it too). |
| Screens | `screen-problem.tsx`, `screen-dashboard.tsx` | Real React UI on tokens, so it follows the theme. Generic problem page (not any judge's UI) + the extension pill; compact dashboard (example numbers). |

## Timeline (`p` = progress through the pinned section)

| `p` | Beat | Caption |
| --- | --- | --- |
| 0–.12 | Headline + CTAs over a **closed** laptop (camera pulled back to `restScale`). | — |
| .12–.30 | Headline lifts away. Lid opens 0°→102° over `lidRange`, tilt 58°→12°, camera dollies to `dolly`. Screen powers on (`powerOn`: black → glow → page) and its light spills on the deck and desk. | Open any problem. |
| .30–.55 | Problem page. Code types in (`typing`). Pill clock is a function of `p` (rewinds on scroll-up). `tabAway` → *paused · idle*; `wrong` → Wrong Answer with the off-by-one highlighted; `fix`; `accepted` → Accepted; `honest` → Solo · Hint · Saw solution; `solo` picked. | The timer starts itself. → Switch tabs, it pauses. No fake hours. → Accepted? One honest question. |
| .55–.70 | Camera pushes into the screen: cover on desktop (`pushMargin` past the edges), contain on phones. Problem page dissolves into the dashboard (`dissolve`). | — |
| .64–.76 | **The pixel:** a lime pixel leaves the Accepted chip and flies a quadratic Bézier into today's heatmap cell (`flight`). At `landed`: Solved 411→412, Streak 46→47 (flame flicker), Koko joins the revision queue. | Then it lands where it matters. |
| .82–.95 | Hand-off: laptop body fades, camera pulls back until the screen exactly covers `[data-frame-target]`, corners round, stage colour cross-fades to the page colour. `glance` (.91): "Your prep, *at a glance.*" fades in. The last frame **is** that section, so un-pinning has zero jump. | — |

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

## Measured (phase a)

- New JS on `/`: ~2 KB gz initial + ~27.5 KB gz lazy (scene 11.9, motion hooks 9.3, NumberFlow 6.3). Budget 40 KB.
- Real LCP = FCP (the H1 paints at once; words rise without starting transparent). CLS 0.
- Lighthouse mobile (local `next start`): Performance 90, Best Practices 100, SEO 100. Simulated LCP 3.6 s
  (live site with the old hero: 3.0 s). Both are dominated by the app-wide ~200 KB gz initial JS that
  Lighthouse puts on the LCP path; cutting that is phase e.

## Alternative (documented, not built)

A photoreal "hands opening a laptop" image sequence (~120 AVIF frames) scrubbed on a `<canvas>`,
with the DOM screen composited on via a perspective transform. More realistic, but 2–4 MB of
assets and heavier on phones. The DOM-built scene is the default.

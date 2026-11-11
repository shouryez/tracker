import { reducedMotion } from "@/lib/feel";

/**
 * Ring promotion (FRONTEND-PLAN §8 Revision 4): after a "Remembered", a mint dot flies from
 * the button to the next ring of the page's FocusOrb, and that ring pulses. Purely visual:
 * the real move happens on the server. No orb on the page, or reduced motion: nothing.
 */
export function flyToOrb(from: Element | null, nextStep: number) {
  if (!from || typeof window === "undefined" || reducedMotion()) return;
  const orb = document.querySelector<HTMLElement>("[data-focus-orb]");
  if (!orb) return;
  const rings = JSON.parse(orb.dataset.rings ?? "[]") as number[];
  if (!rings.length) return;
  const ringIndex = Math.min(rings.length - 1, Math.max(0, nextStep));
  const ob = orb.getBoundingClientRect();
  // Rendered size can differ from the SVG's (the orb scales down on phones).
  const scale = ob.width / Number(orb.dataset.size ?? ob.width);
  const cx = ob.left + ob.width / 2;
  const cy = ob.top + ob.height / 2;
  const r = rings[ringIndex]! * scale;
  const a = -Math.PI / 4;
  const tx = cx + r * Math.cos(a);
  const ty = cy + r * Math.sin(a);

  const fb = from.getBoundingClientRect();
  const sx = fb.left + fb.width / 2;
  const sy = fb.top + fb.height / 2;
  // Off screen (orb scrolled away): skip the flight.
  if (ty < -40 || ty > innerHeight + 40) return;

  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.style.cssText =
    "position:fixed;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;" +
    "background:var(--signal);box-shadow:0 0 14px color-mix(in srgb,var(--signal) 80%,transparent);" +
    "pointer-events:none;z-index:9996";
  document.body.appendChild(dot);

  // A quadratic Bézier with the control point lifted above the straight line.
  const qx = (sx + tx) / 2;
  const qy = Math.min(sy, ty) - Math.max(80, Math.abs(tx - sx) * 0.25);
  const frames: Keyframe[] = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * qx + t ** 2 * tx;
    const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * qy + t ** 2 * ty;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 - 0.3 * t})`, offset: t });
  }
  const flight = dot.animate(frames, { duration: 720, easing: "cubic-bezier(.5,0,.3,1)" });
  flight.onfinish = () => {
    dot.remove();
    // The ring answers: a mint ripple at its radius.
    const ring = document.createElement("span");
    ring.setAttribute("aria-hidden", "true");
    ring.style.cssText =
      `position:fixed;left:${cx - r}px;top:${cy - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;` +
      "border:2px solid var(--signal);pointer-events:none;z-index:9996";
    document.body.appendChild(ring);
    ring.animate(
      [
        { opacity: 0.9, transform: "scale(.98)" },
        { opacity: 0, transform: "scale(1.06)" },
      ],
      { duration: 620, easing: "ease-out" },
    ).onfinish = () => ring.remove();
  };
}

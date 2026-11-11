import { reducedMotion } from "@/lib/feel";

/**
 * Flies a small mint pixel from one element to another along an arc, then gives the target
 * a little pulse: "this tick went there". Purely visual. Skipped for reduced motion, or when
 * either end is off screen.
 */
export function flyTo(
  from: Element | null,
  to: Element | null,
  {
    color = "var(--signal)",
    size = 9,
    duration = 640,
  }: { color?: string; size?: number; duration?: number } = {},
) {
  if (!from || !to || typeof window === "undefined" || reducedMotion()) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const onScreen = (r: DOMRect) => r.bottom > 0 && r.top < innerHeight && r.width > 0;
  if (!onScreen(a) || !onScreen(b)) return;
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  // Land where the target's fill ends (progress bars carry --fly-x as a 0–1 share).
  const share = Number(getComputedStyle(to).getPropertyValue("--fly-x")) || 0.5;
  const tx = b.left + b.width * Math.min(1, Math.max(0, share));
  const ty = b.top + b.height / 2;

  const dot = document.createElement("span");
  dot.setAttribute("aria-hidden", "true");
  dot.style.cssText =
    `position:fixed;left:0;top:0;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;` +
    `border-radius:2px;background:${color};box-shadow:0 0 12px ${color};pointer-events:none;z-index:9996`;
  document.body.appendChild(dot);
  const qx = (sx + tx) / 2;
  const qy = Math.min(sy, ty) - Math.max(60, Math.abs(ty - sy) * 0.35);
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * qx + t ** 2 * tx;
    const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * qy + t ** 2 * ty;
    frames.push({ transform: `translate(${x}px, ${y}px) rotate(${t * 180}deg)`, offset: t });
  }
  dot.animate(frames, { duration, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => {
    dot.remove();
    to.animate(
      [
        { filter: "brightness(1.6)", transform: "scaleY(1.6)" },
        { filter: "none", transform: "none" },
      ],
      { duration: 380, easing: "ease-out" },
    );
  };
}

/** The first matching element that's currently on screen (e.g. header bar or floating strip). */
export function visible(selector: string) {
  return (
    Array.from(document.querySelectorAll(selector)).find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    }) ?? null
  );
}

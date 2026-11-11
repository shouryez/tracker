import { feel, reducedMotion } from "@/lib/feel";

/**
 * Vanishing input (FRONTEND-PLAN §8 Today 1): the text you just submitted breaks into
 * particles that drift up and fade, drawn on a canvas laid over the input. Call it before
 * clearing the input. Reduced motion: nothing (the text simply clears).
 */
export function vanishText(input: HTMLInputElement | null) {
  if (!input || !input.value || reducedMotion()) return;
  const r = input.getBoundingClientRect();
  const cs = getComputedStyle(input);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = r.width * dpr;
  canvas.height = (r.height + 40) * dpr;
  canvas.style.cssText = `position:fixed;left:${r.left}px;top:${r.top - 40}px;width:${r.width}px;height:${r.height + 40}px;pointer-events:none;z-index:9996`;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  ctx.scale(dpr, dpr);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.fillStyle = cs.color;
  ctx.textBaseline = "middle";
  ctx.fillText(input.value, parseFloat(cs.paddingLeft) || 12, 40 + r.height / 2);

  // Sample the drawn text into particles.
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const parts: { x: number; y: number; vx: number; vy: number; c: string; life: number }[] = [];
  const step = Math.round(2 * dpr);
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const a = img[(y * canvas.width + x) * 4 + 3]!;
      if (a > 90) {
        const i = (y * canvas.width + x) * 4;
        parts.push({
          x: x / dpr,
          y: y / dpr,
          vx: 0.4 + Math.random() * 1.6,
          vy: -(0.2 + Math.random() * 1.1),
          c: `rgba(${img[i]},${img[i + 1]},${img[i + 2]},`,
          // Letters further right go a little later, so it dissolves left to right.
          life: -(x / canvas.width) * 18,
        });
      }
    }
  }
  feel.whoosh();
  const t0 = performance.now();
  const frame = () => {
    const t = performance.now() - t0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of parts) {
      p.life += 1;
      if (p.life > 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.02;
      }
      const o = Math.max(0, 1 - Math.max(0, p.life) / 38);
      if (o > 0) {
        alive++;
        ctx.fillStyle = `${p.c}${o})`;
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
      }
    }
    if (alive && t < 1400) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

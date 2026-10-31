/**
 * Whether the pinned hero scene should run here: JavaScript, no reduced motion, not a
 * low-end device (≤2 cores or ≤2 GB), and not turned off with ?noscene (for testing).
 * iOS runs it too; there it keeps fewer GPU layers (<html data-ios>, see globals.css).
 */
export function sceneAllowed(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return !(
    /[?&]noscene\b/.test(location.search) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (nav.hardwareConcurrency || 8) <= 2 ||
    (nav.deviceMemory || 8) <= 2
  );
}

/**
 * Inline, before the hero paints: sets <html data-scene="on"> so CSS can pin the hero
 * without a layout shift (and data-ios on iPhone/iPad). Without it (no JS, reduced motion,
 * low-end) the hero renders as a static poster. Same check as sceneAllowed().
 */
export const SCENE_SCRIPT = `(function(){try{var n=navigator,d=document.documentElement,u=n.userAgent;if(/iP(hone|ad|od)/.test(u)||(/Mac/.test(u)&&n.maxTouchPoints>1))d.dataset.ios="";if(/[?&]noscene\\b/.test(location.search)||matchMedia("(prefers-reduced-motion: reduce)").matches||(n.hardwareConcurrency||8)<=2||(n.deviceMemory||8)<=2)delete d.dataset.scene;else d.dataset.scene="on"}catch(e){}})();`;


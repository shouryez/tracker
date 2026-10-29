/**
 * Whether the pinned hero scene should run here: JavaScript, no reduced motion, not a
 * low-end device (≤2 cores or ≤2 GB), not iOS, and not turned off with ?noscene (for testing).
 * iOS (every browser there is WebKit) crashed the tab on the 3D scene ("A problem repeatedly
 * occurred"), so it gets the static poster until the scene is verified on a real iPhone.
 */
export function sceneAllowed(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ios =
    /iP(hone|ad|od)/.test(nav.userAgent) || (/Mac/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  return !(
    ios ||
    /[?&]noscene\b/.test(location.search) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (nav.hardwareConcurrency || 8) <= 2 ||
    (nav.deviceMemory || 8) <= 2
  );
}

/**
 * Inline, before the hero paints: sets <html data-scene="on"> so CSS can pin the hero
 * without a layout shift. Without it (no JS, reduced motion, low-end, iOS) the hero renders
 * as a static poster. Same check as sceneAllowed().
 */
export const SCENE_SCRIPT = `(function(){try{var n=navigator,d=document.documentElement,u=n.userAgent;if(/iP(hone|ad|od)/.test(u)||(/Mac/.test(u)&&n.maxTouchPoints>1)||/[?&]noscene\\b/.test(location.search)||matchMedia("(prefers-reduced-motion: reduce)").matches||(n.hardwareConcurrency||8)<=2||(n.deviceMemory||8)<=2)delete d.dataset.scene;else d.dataset.scene="on"}catch(e){}})();`;

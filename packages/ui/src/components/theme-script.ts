export const THEME_STORAGE_KEY = "upsolve-theme";

/**
 * Inline <script> body that sets `data-theme` before first paint:
 * saved choice → OS preference → dark. Render it in <head>.
 * Lives outside theme.tsx because values exported from a "use client" module
 * reach Server Components as client references, not strings.
 */
export const themeScript = `(function(){var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)})();`;

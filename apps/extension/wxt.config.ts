import { defineConfig } from "wxt";

/**
 * The DsaKaro web app this build talks to: the live site for `wxt build` and `wxt zip`,
 * your local dev server for `wxt` (dev). UPSOLVE_WEB_URL overrides either.
 */
const releaseBuild = process.argv.some((arg) => arg === "build" || arg === "zip");
const WEB_URL = (
  process.env.UPSOLVE_WEB_URL ?? (releaseBuild ? "https://dsakaro.site" : "http://localhost:3005")
).replace(/\/+$/, "");
const webOrigin = new URL(WEB_URL);
// Match patterns can't contain a port; Chrome matches any port on the host.
const WEB_MATCH = `${webOrigin.protocol}//${webOrigin.hostname}/*`;

/** Placeholder used by entrypoints/web-bridge.content.ts, swapped for WEB_MATCH below. */
const BRIDGE_PLACEHOLDER = "https://upsolve.invalid/*";

export default defineConfig({
  manifest: {
    name: "DsaKaro: LeetCode tracker",
    description:
      "Times every LeetCode problem you open, catches every verdict, reminds you at your best hour and syncs it all to your DsaKaro dashboard.",
    // tabs: Lab mode reads the active tab's address to tell coding from not (never stored).
    permissions: ["storage", "alarms", "tabs", "notifications", "contextMenus"],
    host_permissions: ["https://leetcode.com/*", WEB_MATCH],
    action: { default_title: "DsaKaro" },
  },
  vite: () => ({
    define: { __WEB_URL__: JSON.stringify(WEB_URL) },
  }),
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      for (const script of manifest.content_scripts ?? []) {
        script.matches = script.matches?.map((m) => (m === BRIDGE_PLACEHOLDER ? WEB_MATCH : m));
      }
    },
  },
});

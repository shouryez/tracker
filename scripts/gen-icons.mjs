// Renders the DSA करो mark (क hanging from a lime headline, on a dark tile) as PNG icons for
// the extension and the web app, plus the web favicon.ico. The artwork comes from
// packages/ui/src/brand.ts, the same data the app's <LogoMark> draws.
// Run from the repo root: node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { markSvg } from "../packages/ui/src/brand.ts";

const png = (size) => new Resvg(markSvg({ size, tile: true })).render().asPng();

/** An .ico that embeds PNG images (supported by every current browser). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(([size, data], i) => {
    const e = 6 + 16 * i;
    head[e] = size;
    head[e + 1] = size;
    head.writeUInt16LE(1, e + 4); // planes
    head.writeUInt16LE(32, e + 6); // bits per pixel
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map(([, data]) => data)]);
}

const out = (path) => new URL(`../${path}`, import.meta.url);
mkdirSync(out("apps/extension/public/icon/"), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(out(`apps/extension/public/icon/${size}.png`), png(size));
}
writeFileSync(out("apps/web/src/app/favicon.ico"), ico([16, 32, 48].map((s) => [s, png(s)])));
writeFileSync(out("apps/web/src/app/icon.png"), png(512));
writeFileSync(out("apps/web/src/app/apple-icon.png"), png(180));
console.log("Wrote extension icons, favicon.ico, icon.png and apple-icon.png");

// DsaKaro

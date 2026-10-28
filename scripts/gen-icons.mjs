// Draws the DsaKaro mark (a tick through two hollow nodes, ending in a lime node) on a dark
// rounded tile, as PNG icons for the extension and the web app, plus the web favicon.ico.
// Run from the repo root: node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [11, 11, 16];
const INK = [244, 244, 246];
const LIME = [215, 255, 58];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) raw.set(pixel(x, y), y * (size * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Inside a rounded square of side `w` and corner radius `r`? */
const inRound = (x, y, w, r) => {
  if (x < 0 || y < 0 || x > w || y > w) return false;
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), w - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

/** Distance from a point to a segment. */
function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// The mark on its 32-unit grid (same numbers as LogoMark in packages/ui).
const PATH = [
  [5.5, 16],
  [12.5, 23],
  [24.5, 9.5],
];
const HOLES = PATH.slice(0, 2);
const NODE = [26, 7.5, 4.2];

/** Colour of the mark at a grid point: lime node, ink stroke, or null (tile shows). */
function mark(u, v, holes) {
  if (Math.hypot(u - NODE[0], v - NODE[1]) <= NODE[2]) return LIME;
  if (holes && HOLES.some(([hx, hy]) => Math.hypot(u - hx, v - hy) <= 1.3)) return null;
  const d = Math.min(segDist(u, v, PATH[0], PATH[1]), segDist(u, v, PATH[1], PATH[2]));
  return d <= 2.7 ? INK : null;
}

function draw(size) {
  const holes = size > 16; // at 16px the holes are just grey specks
  // The mark's box (x 2.8–30.2, y 3.3–25.7) sits centred in the tile at 70% of its width.
  const unit = (size * 0.7) / 27.4;
  const ox = size / 2 - 16.5 * unit;
  const oy = size / 2 - 14.5 * unit;
  const SS = 4; // 4×4 samples per pixel for anti-aliasing
  return png(size, (px, py) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let i = 0; i < SS; i++) {
      for (let j = 0; j < SS; j++) {
        const x = px + (i + 0.5) / SS;
        const y = py + (j + 0.5) / SS;
        if (!inRound(x, y, size, size * 0.23)) continue;
        const c = mark((x - ox) / unit, (y - oy) / unit, holes) ?? BG;
        r += c[0];
        g += c[1];
        b += c[2];
        a += 1;
      }
    }
    if (!a) return [0, 0, 0, 0];
    return [r / a, g / a, b / a, (255 * a) / (SS * SS)].map(Math.round);
  });
}

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
  writeFileSync(out(`apps/extension/public/icon/${size}.png`), draw(size));
}
writeFileSync(out("apps/web/src/app/favicon.ico"), ico([16, 32, 48].map((s) => [s, draw(s)])));
writeFileSync(out("apps/web/src/app/icon.png"), draw(512));
writeFileSync(out("apps/web/src/app/apple-icon.png"), draw(180));
console.log("Wrote extension icons, favicon.ico, icon.png and apple-icon.png");

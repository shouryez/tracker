// Draws the Upsolve logo (three pixels climbing, top one lime) as PNG icons.
// Run: node scripts/gen-icons.mjs  →  public/icon/{16,32,48,128}.png
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [9, 9, 12, 255];
const INK = [244, 244, 246];
const LIME = [215, 255, 58, 255];

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
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
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

/** Inside a rounded rectangle? */
const inRound = (x, y, x0, y0, w, h, r) => {
  if (x < x0 || y < y0 || x > x0 + w || y > y0 + h) return false;
  const cx = Math.min(Math.max(x, x0 + r), x0 + w - r);
  const cy = Math.min(Math.max(y, y0 + r), y0 + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

function draw(size) {
  const s = size / 22; // logo is drawn on a 22-unit grid, inset by 3 units of padding
  const pad = 3 * s;
  const scale = (22 - 6) / 22;
  const sq = (ux, uy) => [pad + ux * s * scale, pad + uy * s * scale, 7 * s * scale];
  const squares = [
    [...sq(0, 14), [...INK, Math.round(255 * 0.35)]],
    [...sq(7.5, 7), [...INK, Math.round(255 * 0.7)]],
    [...sq(15, 0), LIME],
  ];
  return png(size, (x, y) => {
    if (!inRound(x, y, 0, 0, size, size, size * 0.22)) return [0, 0, 0, 0];
    for (const [x0, y0, w, color] of squares) {
      if (inRound(x, y, x0, y0, w, w, w * 0.2)) {
        const a = color[3] / 255;
        return [0, 1, 2].map((i) => Math.round(color[i] * a + BG[i] * (1 - a))).concat(255);
      }
    }
    return BG;
  });
}

mkdirSync(new URL("../public/icon/", import.meta.url), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(new URL(`../public/icon/${size}.png`, import.meta.url), draw(size));
}
console.log("Wrote public/icon/{16,32,48,128}.png");

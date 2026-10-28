/**
 * The DSA करो logo as plain data and SVG strings, with no React: the web app, the share
 * card, the extension and the icon generator all draw it from here.
 *
 * Letters are Poppins ExtraBold outlines (Latin and Devanagari drawn as one family), so the
 * logo never depends on a font loading. The Devanagari headline (shirorekha) runs across the
 * whole name; "DSA" hangs from it like Devanagari letters do, and it fills with lime from the
 * left like progress. Regenerate the outlines from the font if the type ever changes.
 */

export const BRAND = {
  name: "DsaKaro",
  /** What the wordmark spells, for screen readers. */
  label: "DSA करो",
  lime: "#d7ff3a",
  ink: "#f4f4f6",
  night: "#0b0b10",
} as const;

/** Headline (shirorekha) band: top and bottom on the 100-unit baseline grid. */
const HEAD_TOP = 20.1;
const HEAD_BOTTOM = 36.3;

export const WORDMARK = {
  viewBox: "4.6 -10.1 420.7 111.6",
  width: 420.7,
  height: 111.6,
  dsa: "M33.50 29.50Q44.60 29.50 52.95 33.95Q61.30 38.40 65.80 46.40Q70.30 54.40 70.30 64.70L70.30 64.70Q70.30 74.90 65.75 82.90Q61.20 90.90 52.85 95.45Q44.50 100 33.50 100L33.50 100L5.60 100L5.60 29.50L33.50 29.50ZM32 82.70Q40.60 82.70 45.50 78Q50.40 73.30 50.40 64.70L50.40 64.70Q50.40 56 45.50 51.25Q40.60 46.50 32 46.50L32 46.50L25.20 46.50L25.20 82.70L32 82.70ZM105.70 100.70Q93.40 100.70 85.50 94.85Q77.60 89 77 78.10L77 78.10L97.90 78.10Q98.20 81.80 100.10 83.50Q102 85.20 105 85.20L105 85.20Q107.70 85.20 109.45 83.85Q111.20 82.50 111.20 80.10L111.20 80.10Q111.20 77 108.30 75.30Q105.40 73.60 98.90 71.50L98.90 71.50Q92 69.20 87.75 67.05Q83.50 64.90 80.35 60.75Q77.20 56.60 77.20 49.90L77.20 49.90Q77.20 43.10 80.60 38.25Q84 33.40 90 30.90Q96 28.40 103.60 28.40L103.60 28.40Q115.90 28.40 123.25 34.15Q130.60 39.90 131.10 50.30L131.10 50.30L109.80 50.30Q109.70 47.10 107.85 45.50Q106 43.90 103.10 43.90L103.10 43.90Q100.90 43.90 99.50 45.20Q98.10 46.50 98.10 48.90L98.10 48.90Q98.10 50.90 99.65 52.35Q101.20 53.80 103.50 54.85Q105.80 55.90 110.30 57.50L110.30 57.50Q117 59.80 121.35 62.05Q125.70 64.30 128.85 68.35Q132 72.40 132 78.60L132 78.60Q132 84.90 128.85 89.90Q125.70 94.90 119.75 97.80Q113.80 100.70 105.70 100.70L105.70 100.70ZM189.50 100L185.70 88.50L160.70 88.50L156.90 100L136.30 100L162 29.50L184.60 29.50L210.20 100L189.50 100ZM165.70 73.50L180.80 73.50L173.20 50.70L165.70 73.50Z",
  karo: "M331.89 36.28L289.12 36.28L289.12 50.21Q291.39 47.08 295.11 45.35Q298.84 43.62 303.70 43.62L303.70 43.62Q310.50 43.62 315.36 46.92Q320.22 50.21 322.76 55.88Q325.30 61.55 325.30 68.46L325.30 68.46Q325.30 76.02 322.44 81.59Q319.58 87.15 314.55 90.06Q309.53 92.98 303.05 92.98L303.05 92.98Q299.16 92.98 295.60 92.12L295.60 92.12L295.60 76.89Q296.46 77.21 297.76 77.21L297.76 77.21Q301.22 77.21 303.38 74.94Q305.54 72.68 305.54 68.90L305.54 68.90Q305.54 65.12 303.32 62.63Q301.11 60.15 297.33 60.15L297.33 60.15Q293.33 60.15 291.23 62.85Q289.12 65.55 289.12 69.98L289.12 69.98L289.12 100L270.33 100L270.33 87.26Q265.14 94.17 254.45 94.17L254.45 94.17Q247.65 94.17 242.63 90.93Q237.60 87.69 234.96 81.96Q232.31 76.24 232.31 68.90L232.31 68.90Q232.31 57.45 238.41 50.54Q244.52 43.62 255.21 43.62L255.21 43.62Q260.28 43.62 264.12 45.30Q267.95 46.97 270.33 50.10L270.33 50.10L270.33 36.28L225.72 36.28L225.72 20.08L331.89 20.08L331.89 36.28ZM261.25 77.86Q265.36 77.86 267.84 75.21Q270.33 72.57 270.33 68.90L270.33 68.90Q270.33 65.22 267.90 62.69Q265.47 60.15 261.25 60.15L261.25 60.15Q257.26 60.15 254.72 62.58Q252.18 65.01 252.18 69.00L252.18 69.00Q252.18 73 254.67 75.43Q257.15 77.86 261.25 77.86L261.25 77.86ZM381.03 40.49Q381.03 53.45 375.36 61.07Q369.69 68.68 355.75 69.00L355.75 69.00L355.75 78.40Q355.75 81.10 356.94 82.77Q358.13 84.45 360.51 84.45L360.51 84.45Q362.67 84.45 363.91 82.83Q365.15 81.21 365.15 78.62L365.15 78.62L365.15 75.38L383.83 75.38Q383.94 76.56 383.94 77.97L383.94 77.97Q383.94 88.55 377.84 94.76Q371.74 100.97 360.94 100.97L360.94 100.97Q353.16 100.97 347.60 97.89Q342.04 94.82 339.23 89.47Q336.42 84.12 336.42 77.43L336.42 77.43L336.42 53.34L347.22 53.34Q355.21 53.34 358.40 50.05Q361.59 46.76 361.59 40.49L361.59 40.49L361.59 36.28L328.86 36.28L328.86 20.08L389.02 20.08L389.02 36.28L381.03 36.28L381.03 40.49ZM414.51 20.08L424.34 20.08L424.34 36.28L414.94 36.28L414.94 100L395.50 100L395.50 36.28L386.00 36.28L386.00 20.08L396.25 20.08Q392.37 14.14 389.94 11.49Q387.51 8.85 384.81 7.93Q382.11 7.01 377.36 7.01L377.36 7.01L371.42 7.01L371.42-8.65L377.14-8.65Q386.43-8.54 391.88-6.60Q397.33-4.65 402.41 1.29Q407.49 7.23 414.51 20.08L414.51 20.08Z",
  bar: { x: 5.6, y: HEAD_TOP, width: 418.7, height: HEAD_BOTTOM - HEAD_TOP },
  /** Share of the bar filled with lime. */
  fill: 0.38,
} as const;

/** "क" with a lime headline that reaches past it on both sides: the app icon and small mark. */
export const MARK = {
  viewBox: "-16.5 -8.0 136.2 136.2",
  ka: "M104.65 36.28L61.88 36.28L61.88 50.21Q64.15 47.08 67.88 45.35Q71.60 43.62 76.46 43.62L76.46 43.62Q83.27 43.62 88.13 46.92Q92.99 50.21 95.53 55.88Q98.06 61.55 98.06 68.46L98.06 68.46Q98.06 76.02 95.20 81.59Q92.34 87.15 87.32 90.06Q82.30 92.98 75.82 92.98L75.82 92.98Q71.93 92.98 68.36 92.12L68.36 92.12L68.36 76.89Q69.23 77.21 70.52 77.21L70.52 77.21Q73.98 77.21 76.14 74.94Q78.30 72.68 78.30 68.90L78.30 68.90Q78.30 65.12 76.09 62.63Q73.87 60.15 70.09 60.15L70.09 60.15Q66.10 60.15 63.99 62.85Q61.88 65.55 61.88 69.98L61.88 69.98L61.88 100L43.09 100L43.09 87.26Q37.91 94.17 27.22 94.17L27.22 94.17Q20.41 94.17 15.39 90.93Q10.37 87.69 7.72 81.96Q5.08 76.24 5.08 68.90L5.08 68.90Q5.08 57.45 11.18 50.54Q17.28 43.62 27.97 43.62L27.97 43.62Q33.05 43.62 36.88 45.30Q40.72 46.97 43.09 50.10L43.09 50.10L43.09 36.28L-1.51 36.28L-1.51 20.08L104.65 20.08L104.65 36.28ZM34.02 77.86Q38.12 77.86 40.61 75.21Q43.09 72.57 43.09 68.90L43.09 68.90Q43.09 65.22 40.66 62.69Q38.23 60.15 34.02 60.15L34.02 60.15Q30.02 60.15 27.49 62.58Q24.95 65.01 24.95 69.00L24.95 69.00Q24.95 73 27.43 75.43Q29.92 77.86 34.02 77.86L34.02 77.86Z",
  bar: { x: -14.5, y: HEAD_TOP, width: 132.2, height: HEAD_BOTTOM - HEAD_TOP },
} as const;

type Colors = { ink?: string; accent?: string };

/** The wordmark as an SVG string; height in px, width follows. */
export function wordmarkSvg({
  ink = BRAND.ink,
  accent = BRAND.lime,
  height = 24,
}: Colors & { height?: number } = {}) {
  const w = WORDMARK;
  const width = Math.round((height * w.width) / w.height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${w.viewBox}" width="${width}" height="${height}" role="img" aria-label="${BRAND.label}">` +
    `<path d="${w.dsa}" fill="${ink}"/><path d="${w.karo}" fill="${ink}"/>` +
    `<rect x="${w.bar.x}" y="${w.bar.y}" width="${w.bar.width}" height="${w.bar.height}" fill="${ink}"/>` +
    `<rect x="${w.bar.x}" y="${w.bar.y}" width="${(w.bar.width * w.fill).toFixed(1)}" height="${w.bar.height}" fill="${accent}"/>` +
    `</svg>`
  );
}

/** The mark as an SVG string; with `tile`, on a rounded dark square (app icons). */
export function markSvg({
  ink = BRAND.ink,
  accent = BRAND.lime,
  size = 24,
  tile = false,
}: Colors & { size?: number; tile?: boolean } = {}) {
  const m = MARK;
  const [x, y, s] = m.viewBox.split(" ").map(Number) as [number, number, number, number];
  const body =
    `<path d="${m.ka}" fill="${ink}"/>` +
    `<rect x="${m.bar.x}" y="${m.bar.y}" width="${m.bar.width}" height="${m.bar.height}" rx="3" fill="${accent}"/>`;
  if (!tile) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.viewBox}" width="${size}" height="${size}" role="img" aria-label="${BRAND.label}">${body}</svg>`;
  }
  // On a tile the letter (with its bar) fills 80% of the square, centred.
  const t = s / 0.8;
  const tx = x - (t - s) / 2,
    ty = y - (t - s) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${tx.toFixed(1)} ${ty.toFixed(1)} ${t.toFixed(1)} ${t.toFixed(1)}" width="${size}" height="${size}">` +
    `<rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="${t.toFixed(1)}" height="${t.toFixed(1)}" rx="${(t * 0.23).toFixed(1)}" fill="${BRAND.night}"/>` +
    body +
    `</svg>`
  );
}

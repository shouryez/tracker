// Checks for uploaded college ID photos. Pure, so it can be unit-tested.

/** The browser shrinks photos before upload; anything larger than this is refused. */
export const MAX_ID_BYTES = 1_500_000;

export type IdImageType = "image/jpeg" | "image/png" | "image/webp";

/** The image type from the file's first bytes (not its name or claimed type), or null. */
export function sniffImageType(bytes: Uint8Array): IdImageType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  )
    return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Why an upload can't be accepted, or null when it's fine. */
export function idImageProblem(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "Choose a photo of your college ID.";
  if (bytes.length > MAX_ID_BYTES) return "That photo is too large. Try a smaller one.";
  if (!sniffImageType(bytes)) return "Use a JPG, PNG or WebP photo.";
  return null;
}

/** Reasons an admin can pick when rejecting; the student sees the text. */
export const REJECT_REASONS = [
  "The photo is blurry or cut off. Please retake it in good light.",
  "This doesn't look like a college ID card.",
  "The card is for a different college than the one on your profile.",
  "The name on the card doesn't match your profile name.",
  "The card looks expired. Please upload your current one.",
] as const;

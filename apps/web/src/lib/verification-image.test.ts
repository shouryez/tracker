import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_ID_BYTES, idImageProblem, sniffImageType } from "./verification-image.ts";

const pad = (head: number[], size = 64) => {
  const b = new Uint8Array(size);
  b.set(head);
  return b;
};
const JPEG = pad([0xff, 0xd8, 0xff, 0xe0]);
const PNG = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = pad([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

test("college ID photos are recognised by their bytes, not their name", () => {
  assert.equal(sniffImageType(JPEG), "image/jpeg");
  assert.equal(sniffImageType(PNG), "image/png");
  assert.equal(sniffImageType(WEBP), "image/webp");
  assert.equal(sniffImageType(pad([...Buffer.from("<svg onload=alert(1)>")])), null);
  assert.equal(sniffImageType(pad([...Buffer.from("%PDF-1.7")])), null);
  assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8])), null);
});

test("uploads that are empty, too big or not images are refused", () => {
  assert.equal(idImageProblem(JPEG), null);
  assert.match(idImageProblem(new Uint8Array()) ?? "", /Choose a photo/);
  assert.match(idImageProblem(pad([0xff, 0xd8, 0xff], MAX_ID_BYTES + 1)) ?? "", /too large/);
  assert.match(idImageProblem(pad([...Buffer.from("GIF89a")])) ?? "", /JPG, PNG or WebP/);
});

// DsaKaro

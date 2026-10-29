import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFfmpegColor, parseAssColor, encodeSolidBrandedPng, buildThumbnailPrompt, thumbnailTurnId } from "../src/deterministic-thumbnail.mjs";

test("parseFfmpegColor decodes 0xRRGGBB", () => {
  assert.deepEqual(parseFfmpegColor("0x202040"), { r: 0x20, g: 0x20, b: 0x40 });
});

test("parseFfmpegColor rejects a non-ffmpeg color", () => {
  assert.throws(() => parseFfmpegColor("&H00FFFFFF"), TypeError);
});

test("parseAssColor decodes &HAABBGGRR", () => {
  assert.deepEqual(parseAssColor("&H00FFFFFF"), { r: 0xff, g: 0xff, b: 0xff });
});

test("encodeSolidBrandedPng produces a valid PNG signature and no text prompt is implied", () => {
  const buffer = encodeSolidBrandedPng({ width: 32, height: 18, background: { r: 10, g: 10, b: 10 }, foreground: { r: 200, g: 200, b: 200 } });
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
});

test("buildThumbnailPrompt explicitly excludes text", () => {
  const prompt = buildThumbnailPrompt({ title: "Fixture Channel" }, { title: "A Topic" });
  assert.match(prompt, /no text/i);
  assert.match(prompt, /Fixture Channel/);
  assert.match(prompt, /A Topic/);
});

test("thumbnailTurnId is deterministic for the same facts", () => {
  const a = thumbnailTurnId({ channel: "c", title: "t" });
  const b = thumbnailTurnId({ channel: "c", title: "t" });
  assert.equal(a, b);
  assert.equal(a.length, 32);
});

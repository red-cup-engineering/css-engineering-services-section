import assert from "node:assert/strict";
import test from "node:test";

import { createNearDuplicateCandidateReport } from "../src/near-duplicate-candidates.mjs";

function file(path, sha256, byteLength = 1_000) {
  const extension = /\.[^.]+$/u.exec(path)?.[0]?.toLowerCase() ?? null;
  return { path, sha256, byteLength, extension, mediaTypeHint: null, mtime: "2026-01-01T00:00:00.000Z" };
}

function census(files) {
  return { schemaVersion: "migration-census/v1", files };
}

test("same normalized name with different bytes is an advisory candidate", () => {
  const report = createNearDuplicateCandidateReport(census([
    file("a/interview.mp4", "a", 1_000),
    file("b/interview.mp4", "b", 980),
  ]));

  assert.equal(report.schemaVersion, "near-duplicate-candidates/v1");
  assert.equal(report.advisoryOnly, true);
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0].evidence.normalizedStemEqual, true);
  assert.deepEqual(report.candidates[0].pair.map(({ path }) => path), ["a/interview.mp4", "b/interview.mp4"]);
  assert.equal("disposition" in report.candidates[0], false);
});

test("common copy suffixes are removed for name comparison", () => {
  const report = createNearDuplicateCandidateReport(census([
    file("photo.png", "a"),
    file("photo__1.png", "b"),
    file("photo (1).png", "c"),
  ]));
  assert.equal(report.candidates.length, 3);
  assert.ok(report.candidates.every(({ evidence }) => evidence.normalizedStemEqual));
});

test("exact SHA-256 pairs are excluded because the census already identifies them", () => {
  const report = createNearDuplicateCandidateReport(census([
    file("photo.jpg", "same"),
    file("photo (1).jpg", "same"),
  ]));
  assert.deepEqual(report.candidates, []);
});

test("unrelated names are excluded despite similar sizes", () => {
  const report = createNearDuplicateCandidateReport(census([
    file("sunset-over-river.jpg", "a", 1_000),
    file("quarterly-tax-receipt.jpg", "b", 1_001),
  ]));
  assert.deepEqual(report.candidates, []);
});

test("different media families are never compared", () => {
  const report = createNearDuplicateCandidateReport(census([
    file("performance.mp3", "a"),
    file("performance.mp4", "b"),
  ]));
  assert.deepEqual(report.candidates, []);
});

test("candidate cap is deterministic per item independent of input order", () => {
  const files = Array.from({ length: 8 }, (_, index) => file(`folder-${index}/portrait (${index + 1}).jpg`, String(index)));
  const options = { maxCandidatesPerItem: 2 };
  const forward = createNearDuplicateCandidateReport(census(files), options);
  const reverse = createNearDuplicateCandidateReport(census([...files].reverse()), options);
  assert.deepEqual(forward, reverse);
  const counts = new Map();
  for (const { pair } of forward.candidates) {
    for (const { path } of pair) counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  assert.ok([...counts.values()].every((count) => count <= 2));
});

test("Unicode compatibility and canonical normalization identify equivalent names", () => {
  const report = createNearDuplicateCandidateReport(census([
    file("caf\u00e9 １.jpg", "a"),
    file("cafe\u0301 1.jpg", "b"),
  ]));
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0].evidence.normalizedStemEqual, true);
});

test("supplied perceptual fingerprints can add evidence but are never invented", () => {
  const input = census([
    file("morning.jpg", "a", 1_000),
    file("evening.png", "b", 1_100),
  ]);
  assert.deepEqual(createNearDuplicateCandidateReport(input).candidates, []);

  const distance = (left, right) => Math.abs(left - right);
  const report = createNearDuplicateCandidateReport(input, {
    perceptualFingerprints: [
      { path: "morning.jpg", algorithm: "test-phash", value: 10, distance, threshold: 2 },
      { path: "evening.png", algorithm: "test-phash", value: 11 },
    ],
  });
  assert.equal(report.candidates.length, 1);
  assert.deepEqual(report.candidates[0].evidence.perceptualFingerprints, [{
    algorithm: "test-phash",
    distance: 1,
    threshold: 2,
    withinThreshold: true,
  }]);
});


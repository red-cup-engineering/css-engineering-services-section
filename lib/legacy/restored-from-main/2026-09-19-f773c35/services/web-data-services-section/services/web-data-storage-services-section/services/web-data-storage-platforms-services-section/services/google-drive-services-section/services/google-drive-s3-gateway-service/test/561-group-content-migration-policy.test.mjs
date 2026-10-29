import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTENT_MIGRATION_SOURCE_ROOTS,
  create561GroupContentMigrationPolicy,
  route561GroupContent,
} from "../src/561-group-content-migration-policy.mjs";

const mtime = "2026-08-20T01:06:47.093Z";
const expected = [
  ["music-renders", "561-group-media", "music/renders"],
  ["emsenn-personal-media", "emsenn-private", "media"],
  ["koios-news-media", "561-group-media", "public/koios-news"],
  ["science-media", "561-group-media", "science"],
  ["science-references", "561-group-references", "science"],
  ["fibercraft-references", "561-group-references", "fibercraft"],
  ["fiction-references", "561-group-references", "fiction"],
  ["type-theory-references", "561-group-references", "type-theory"],
  ["relationality-media", "561-group-media", "relationality"],
  ["business-media", "561-group-media", "business"],
  ["critical-theory-references", "561-group-references", "critical-theory"],
  ["anarchism-references", "561-group-references", "anarchism"],
];

test("the closed policy admits and intentionally routes every retained census root", () => {
  assert.equal(CONTENT_MIGRATION_SOURCE_ROOTS.length, 12);
  const policy = create561GroupContentMigrationPolicy();
  const routes = CONTENT_MIGRATION_SOURCE_ROOTS.map((source, index) => {
    const route = policy.route({ path: `${source.root}/nested/deeper/file-${index}.dat`, mtime });
    assert.deepEqual([route.family, route.bucket, route.key], [expected[index][0], expected[index][1], `${expected[index][2]}/nested/deeper/file-${index}.dat`]);
    assert.equal(route.relativePath, `nested/deeper/file-${index}.dat`);
    assert.equal(route.sourceRoot, source.root);
    return `${route.bucket}/${route.key}`;
  });
  assert.equal(new Set(routes).size, 12, "every admitted family has unique route coordinates");
});

test("the personal/public boundary cannot leak personal media into the group-media bucket", () => {
  const personal = CONTENT_MIGRATION_SOURCE_ROOTS[1], publicNews = CONTENT_MIGRATION_SOURCE_ROOTS[2];
  assert.equal(route561GroupContent({ path: `${personal.root}/photos/friends.jpg`, mediaTypeHint: "image/jpeg", mtime }).bucket, "emsenn-private");
  const publicRoute = route561GroupContent({ path: `${publicNews.root}/photos/report.jpg`, mediaTypeHint: "image/jpeg", mtime });
  assert.equal(publicRoute.bucket, "561-group-media");
  assert.equal(publicRoute.key, "public/koios-news/photos/report.jpg");
});

test("complete nested relative paths survive with separator-only normalization", () => {
  const source = CONTENT_MIGRATION_SOURCE_ROOTS[5];
  const route = create561GroupContentMigrationPolicy().route({
    path: `${source.root.replaceAll("/", "\\")}\\books\\windows-content\\A Book (2026).epub`,
    mediaTypeHint: "application/epub+zip",
    mtime,
  });
  assert.equal(route.relativePath, "books/windows-content/A Book (2026).epub");
  assert.equal(route.key, "fibercraft/books/windows-content/A Book (2026).epub");
  assert.equal(route.contentType, "application/epub+zip");
  assert.equal(decodeURIComponent(route.metadata["source-path"]), `${source.root}/books/windows-content/A Book (2026).epub`);
  assert.equal(route.metadata["source-mtime"], mtime);
});

test("safe hints win, unsafe hints fall back to extension, and unknown types are octet streams", () => {
  const root = CONTENT_MIGRATION_SOURCE_ROOTS[0].root, policy = create561GroupContentMigrationPolicy();
  assert.equal(policy.route({ path: `${root}/recording.wav`, mediaTypeHint: "audio/wav", mtime }).contentType, "audio/wav");
  assert.equal(policy.route({ path: `${root}/notes.md`, mediaTypeHint: "text/plain\r\nx-bad: yes", mtime }).contentType, "text/markdown; charset=utf-8");
  assert.equal(policy.route({ path: `${root}/unknown.blob`, mtime }).contentType, "application/octet-stream");
});

test("paths outside exact roots, roots themselves, absolutes, traversal, and missing mtimes fail closed", () => {
  const root = CONTENT_MIGRATION_SOURCE_ROOTS[0].root, policy = create561GroupContentMigrationPolicy();
  assert.throws(() => policy.route({ path: `${root}-lookalike/file.wav`, mtime }), /outside the twelve/u);
  assert.throws(() => policy.route({ path: root, mtime }), /outside the twelve/u);
  assert.throws(() => policy.route({ path: `/home/emsenn/info/${root}/file.wav`, mtime }), /absolute/u);
  assert.throws(() => policy.route({ path: `${root}/../secret.wav`, mtime }), /traversal/u);
  assert.throws(() => policy.route({ path: `${root}/file.wav` }), /mtime/u);
});

test("normalization collisions are refused instead of silently aliasing sources", () => {
  const root = CONTENT_MIGRATION_SOURCE_ROOTS[3].root, policy = create561GroupContentMigrationPolicy();
  policy.route({ path: `${root}/audio//triage/clip.opus`, mtime });
  assert.throws(() => policy.route({ path: `${root}/audio/triage/clip.opus`, mtime }), /collision/u);
});

test("metadata that cannot fit in the S3 user-metadata allowance is refused", () => {
  const root = CONTENT_MIGRATION_SOURCE_ROOTS[4].root;
  assert.throws(() => route561GroupContent({ path: `${root}/${"é".repeat(800)}.pdf`, mtime }), /metadata exceeds/u);
});

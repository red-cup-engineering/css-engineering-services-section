import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import test from "node:test";

import { generateContentMigrationRecords, readCommittedMigrationCensus } from "../src/content-migration-record-generator.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const names = { census: "census.json.gz", candidates: "candidates.json.gz", manifest: "record-set.json" };

async function fixture(t) {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const workspace = await mkdtemp(join(tmpdir(), "migration-record-generator-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const sources = [{ root: "content/media" }, { root: "content/references" }];
  for (const { root } of sources) await mkdir(join(workspace, root), { recursive: true });
  const first = join(workspace, sources[0].root, "portrait.png");
  const copy = join(workspace, sources[1].root, "portrait (1).png");
  await writeFile(first, "one image");
  await writeFile(copy, "other image");
  const timestamp = new Date("2026-08-20T00:00:00.000Z");
  await utimes(first, timestamp, timestamp);
  await utimes(copy, timestamp, timestamp);
  return { workspace, output: join(workspace, "records"), sources };
}

test("dry-run is the default and publishes no retained files", async (t) => {
  const input = await fixture(t);
  const result = await generateContentMigrationRecords({ ...input, workspaceRoot: input.workspace,
    outputDirectory: input.output, names });
  assert.equal(result.write, false);
  assert.equal(result.manifest.summary.regularFileCount, 2);
  await assert.rejects(access(input.output), (error) => error.code === "ENOENT");
});

test("write publishes deterministic gzip members committed by a hash manifest", async (t) => {
  const input = await fixture(t);
  const options = { workspaceRoot: input.workspace, outputDirectory: input.output,
    sources: input.sources, names, write: true };
  const first = await generateContentMigrationRecords(options);
  const firstBytes = {
    census: await readFile(join(input.output, names.census)),
    candidates: await readFile(join(input.output, names.candidates)),
    manifest: await readFile(join(input.output, names.manifest)),
  };
  const census = JSON.parse(gunzipSync(firstBytes.census));
  const candidates = JSON.parse(gunzipSync(firstBytes.candidates));
  const manifest = JSON.parse(firstBytes.manifest);
  assert.equal(census.schemaVersion, "migration-census/v1");
  assert.equal(candidates.schemaVersion, "near-duplicate-candidates/v1");
  assert.equal(candidates.advisoryOnly, true);
  assert.equal(manifest.schemaVersion, "content-migration-record-set/v1");
  assert.equal(manifest.census.gzipSha256, hash(firstBytes.census));
  assert.equal(manifest.candidates.gzipSha256, hash(firstBytes.candidates));
  assert.equal(manifest.candidates.sourceCensusContentSha256, manifest.census.contentSha256);

  const second = await generateContentMigrationRecords(options);
  assert.deepEqual(second, first);
  assert.deepEqual(await readFile(join(input.output, names.census)), firstBytes.census);
  assert.deepEqual(await readFile(join(input.output, names.candidates)), firstBytes.candidates);
  assert.deepEqual(await readFile(join(input.output, names.manifest)), firstBytes.manifest);
});

test("generation refuses a non-regular entry rather than silently downscaling scope", async (t) => {
  const input = await fixture(t);
  const { symlink } = await import("node:fs/promises");
  await symlink("portrait.png", join(input.workspace, "content/media/friendly.png"));
  await assert.rejects(generateContentMigrationRecords({ workspaceRoot: input.workspace,
    outputDirectory: input.output, sources: input.sources, names }), /refuses unstable, non-regular/u);
  await assert.rejects(access(input.output), (error) => error.code === "ENOENT");
});

test("reader admits only census bytes committed by the record-set manifest", async (t) => {
  const input = await fixture(t);
  await generateContentMigrationRecords({ workspaceRoot: input.workspace, outputDirectory: input.output,
    sources: input.sources, names, write: true });
  const manifestPath = join(input.output, names.manifest);
  const admitted = await readCommittedMigrationCensus({ manifestPath });
  assert.equal(admitted.census.summary.regularFileCount, 2);
  assert.equal(admitted.evidence.censusFilename, names.census);

  const censusPath = join(input.output, names.census);
  const bytes = await readFile(censusPath);
  bytes[bytes.length - 1] ^= 1;
  await writeFile(censusPath, bytes);
  await assert.rejects(readCommittedMigrationCensus({ manifestPath }), /gzip commitment/u);
});

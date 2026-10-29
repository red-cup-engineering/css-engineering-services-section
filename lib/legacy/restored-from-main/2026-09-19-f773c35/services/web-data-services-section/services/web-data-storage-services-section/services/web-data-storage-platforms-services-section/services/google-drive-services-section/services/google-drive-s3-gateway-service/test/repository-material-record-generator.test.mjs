import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import test from "node:test";

import { generateRepositoryMaterialRecords, readCommittedRepositoryMaterialCensus } from "../src/repository-material-record-generator.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const names = { census: "repository-census.json.gz", manifest: "repository-record-set.json" };

function gitState(paths = []) {
  return { tracked: new Set(paths), untracked: new Set(), ignored: new Set(), staged: new Set(),
    unstaged: new Set(), stagedDeleted: new Set(), unstagedDeleted: new Set(),
    head: "b".repeat(40), branch: "main" };
}

async function fixture(t) {
  const workspace = await mkdtemp(join(tmpdir(), "repository-material-records-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const output = join(workspace, "records");
  await mkdir(output);
  await writeFile(join(workspace, "source.md"), "retained source");
  return { workspace, output, state: gitState(["source.md"]) };
}

test("dry-run is the default and retains no artifacts", async (t) => {
  const input = await fixture(t);
  const result = await generateRepositoryMaterialRecords({ workspaceRoot: input.workspace,
    outputDirectory: input.output, names, gitState: input.state });
  assert.equal(result.write, false);
  assert.equal(result.manifest.actionAuthorized, false);
  assert.equal(result.manifest.summary.regularFileCount, 1);
  await assert.rejects(access(join(input.output, names.census)), (error) => error.code === "ENOENT");
});

test("write publishes a deterministic, self-bounded census and committed manifest", async (t) => {
  const input = await fixture(t);
  const options = { workspaceRoot: input.workspace, outputDirectory: input.output,
    names, gitState: input.state, write: true };
  const first = await generateRepositoryMaterialRecords(options);
  const censusBytes = await readFile(join(input.output, names.census));
  const manifestBytes = await readFile(join(input.output, names.manifest));
  const census = JSON.parse(gunzipSync(censusBytes));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(census.schemaVersion, "repository-material-census/v1");
  assert.equal(census.actionAuthorized, false);
  assert.equal(census.files.some(({ path }) => path === `records/${names.census}`), false);
  assert.equal(manifest.schemaVersion, "repository-material-record-set/v1");
  assert.equal(manifest.census.gzipSha256, hash(censusBytes));
  assert.deepEqual(manifest.selfReferenceBoundary, census.selfReferenceBoundary);

  const second = await generateRepositoryMaterialRecords(options);
  assert.deepEqual(second.manifest, first.manifest);
  assert.deepEqual(await readFile(join(input.output, names.census)), censusBytes);
  assert.deepEqual(await readFile(join(input.output, names.manifest)), manifestBytes);
  const admitted = await readCommittedRepositoryMaterialCensus({ manifestPath: join(input.output, names.manifest) });
  assert.equal(admitted.census.summary.regularFileCount, 1);
});

test("reader refuses retained census bytes that contradict the manifest", async (t) => {
  const input = await fixture(t);
  await generateRepositoryMaterialRecords({ workspaceRoot: input.workspace, outputDirectory: input.output,
    names, gitState: input.state, write: true });
  const censusPath = join(input.output, names.census);
  const bytes = await readFile(censusPath);
  bytes[bytes.length - 1] ^= 1;
  await writeFile(censusPath, bytes);
  await assert.rejects(readCommittedRepositoryMaterialCensus({ manifestPath: join(input.output, names.manifest) }), /gzip commitment/u);
});

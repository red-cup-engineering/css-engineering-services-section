import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  generateRepositoryDriveAdmissionRecords,
  readCommittedRepositoryDriveAdmission,
} from "../src/repository-drive-admission-record-generator.mjs";
import { generateRepositoryMaterialRecords } from "../src/repository-material-record-generator.mjs";

const emptyGitState = { head: "a".repeat(40), branch: "main", tracked: new Set(),
  untracked: new Set(["content/media/large.mp4", "content/media/small.pdf"]), ignored: new Set(),
  staged: new Set(), unstaged: new Set(), stagedDeleted: new Set(), unstagedDeleted: new Set() };

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "repository-drive-admission-"));
  const records = join(root, "records");
  await mkdir(join(root, "content", "media"), { recursive: true });
  await writeFile(join(root, "content", "media", "large.mp4"), "large payload");
  await writeFile(join(root, "content", "media", "small.pdf"), "x");
  await generateRepositoryMaterialRecords({ workspaceRoot: root, outputDirectory: records,
    names: { census: "repository-census.json.gz", manifest: "repository-record-set.json" },
    gitState: emptyGitState, write: true });
  return { root, records, sourceManifest: join(records, "repository-record-set.json") };
}

test("publishes a complete decision set and an exact enumerated migration census", async (t) => {
  const state = await fixture(); t.after(() => rm(state.root, { recursive: true }));
  const result = await generateRepositoryDriveAdmissionRecords({ workspaceRoot: state.root,
    repositoryMaterialManifestPath: state.sourceManifest, outputDirectory: state.records,
    names: { decisions: "decisions.json.gz", census: "large-census.json.gz", manifest: "admission-record-set.json" },
    thresholdBytes: 5, write: true });
  assert.equal(result.manifest.summary.reviewCandidateCount, 2);
  assert.equal(result.manifest.summary.regularFileCount, 1);
  assert.equal(result.manifest.sourceRetirementAuthorized, false);
  const retained = await readCommittedRepositoryDriveAdmission({ manifestPath: join(state.records, "admission-record-set.json") });
  assert.deepEqual(retained.census.files.map(({ path }) => path), ["content/media/large.mp4"]);
  assert.equal(retained.decisions.decisions.length, 2);
  assert.equal(retained.census.files[0].admission.copyAuthorized, true);
});

test("refuses tampered admitted census bytes", async (t) => {
  const state = await fixture(); t.after(() => rm(state.root, { recursive: true }));
  await generateRepositoryDriveAdmissionRecords({ workspaceRoot: state.root,
    repositoryMaterialManifestPath: state.sourceManifest, outputDirectory: state.records,
    names: { decisions: "decisions.json.gz", census: "large-census.json.gz", manifest: "admission-record-set.json" },
    thresholdBytes: 5, write: true });
  const path = join(state.records, "large-census.json.gz");
  const bytes = await readFile(path); bytes[bytes.length - 1] ^= 1; await writeFile(path, bytes);
  await assert.rejects(readCommittedRepositoryDriveAdmission({ manifestPath: join(state.records, "admission-record-set.json") }),
    /does not match its gzip commitment/u);
});

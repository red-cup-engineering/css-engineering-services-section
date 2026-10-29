import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { CONTENT_MIGRATION_SOURCE_ROOTS } from "../src/561-group-content-migration-policy.mjs";
import { DEFAULT_PROTECTED_RETIREMENT_PATHS } from "../src/content-retirement-audit.mjs";
import { createRepositoryMaterialCensus, pathIsSensitive } from "../src/repository-material-census.mjs";

function gitState({ tracked = [], untracked = [], ignored = [], staged = [], unstaged = [],
  stagedDeleted = [], unstagedDeleted = [] } = {}) {
  return { tracked: new Set(tracked), untracked: new Set(untracked), ignored: new Set(ignored),
    staged: new Set(staged), unstaged: new Set(unstaged), stagedDeleted: new Set(stagedDeleted),
    unstagedDeleted: new Set(unstagedDeleted), head: "a".repeat(40), branch: "main" };
}

async function put(workspace, path, bytes) {
  await mkdir(dirname(join(workspace, path)), { recursive: true });
  await writeFile(join(workspace, path), bytes);
}

test("repository census observes all material while separating custody, sensitivity, derivation, and Git relations", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "repository-material-census-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const admitted = `${CONTENT_MIGRATION_SOURCE_ROOTS[0].root}/clip.wav`;
  const protectedPath = DEFAULT_PROTECTED_RETIREMENT_PATHS[0];
  await put(workspace, ".git/objects/pack/example.pack", "git bytes");
  await put(workspace, ".env", "TOKEN=not-read");
  await put(workspace, "node_modules/pkg/cache.bin", "dependency");
  await put(workspace, admitted, "audio payload");
  await put(workspace, protectedPath, "source svg");
  await put(workspace, "notes.md", "same bytes");
  await put(workspace, "copies/notes-copy.md", "same bytes");
  await symlink("notes.md", join(workspace, "friendly-note.md"));
  const state = gitState({
    tracked: [protectedPath, "notes.md", "gone.md"],
    untracked: [admitted, "copies/notes-copy.md", "friendly-note.md"],
    ignored: [".env", "node_modules/pkg/cache.bin"],
    unstaged: ["gone.md"],
    unstagedDeleted: ["gone.md"],
  });

  const census = await createRepositoryMaterialCensus({ workspaceRoot: workspace, gitState: state,
    selfExcludedPaths: ["records/census.json.gz", "records/manifest.json"], hashConcurrency: 2 });

  assert.equal(census.schemaVersion, "repository-material-census/v1");
  assert.equal(census.actionAuthorized, false);
  assert.equal(census.summary.completeEnumeration, true);
  assert.equal(census.administrativeRoots[0].path, ".git");
  assert.equal(census.administrativeRoots[0].regularFileBytes, 9);
  assert.equal(census.files.some(({ path }) => path.startsWith(".git/")), false);
  const secret = census.files.find(({ path }) => path === ".env");
  assert.equal(secret.sha256, null);
  assert.equal(secret.hashStatus, "withheld-sensitive");
  assert.equal(secret.proposedDisposition.classification, "sensitive-local-review");
  assert.equal(census.files.find(({ path }) => path === admitted).proposedDisposition.classification, "drive-migration-admitted");
  assert.equal(census.files.find(({ path }) => path === protectedPath).proposedDisposition.classification, "git-source-protected");
  assert.equal(census.files.find(({ path }) => path === "node_modules/pkg/cache.bin").proposedDisposition.classification, "derived-material-review");
  assert.deepEqual(census.nonRegularEntries, [{ path: "friendly-note.md", kind: "symbolic-link", target: "notes.md" }]);
  assert.deepEqual(census.gitObservation.unstagedDeletedPaths, ["gone.md"]);
  assert.deepEqual(census.gitObservation.trackedMissingFromFilesystem, ["gone.md"]);
  assert.equal(census.exactDuplicateGroups.some(({ paths }) => paths.includes("notes.md") && paths.includes("copies/notes-copy.md")), true);
  assert.equal(census.files.every(({ proposedDisposition }) => proposedDisposition.actionAuthorized === false), true);
});

test("self-referential record paths are explicit and do not perturb Git counts", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "repository-material-self-boundary-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await put(workspace, "records/census.json.gz", "old census");
  await put(workspace, "records/manifest.json", "old manifest");
  await put(workspace, "source.txt", "source");
  const state = gitState({ untracked: ["records/census.json.gz", "records/manifest.json", "source.txt"] });
  const census = await createRepositoryMaterialCensus({ workspaceRoot: workspace, gitState: state,
    selfExcludedPaths: ["records/census.json.gz", "records/manifest.json"] });
  assert.deepEqual(census.files.map(({ path }) => path), ["source.txt"]);
  assert.equal(census.gitObservation.untrackedPathCount, 1);
  assert.deepEqual(census.selfReferenceBoundary, [
    { path: "records/census.json.gz", reason: "record-set-self-reference" },
    { path: "records/manifest.json", reason: "record-set-self-reference" },
  ]);
});

test("sensitive-path recognition mirrors the repository's declared key boundaries", () => {
  assert.equal(pathIsSensitive(".env"), true);
  assert.equal(pathIsSensitive("service/.env.production"), true);
  assert.equal(pathIsSensitive("service/data/secrets/token.json"), true);
  assert.equal(pathIsSensitive("service/agent-card-signing/private.pem"), true);
  assert.equal(pathIsSensitive("service/agent-card-signing/jwks.json"), false);
  assert.equal(pathIsSensitive("certificates/site-public.pem"), false);
  assert.equal(pathIsSensitive("certificates/site-signing-chain.pem"), false);
});

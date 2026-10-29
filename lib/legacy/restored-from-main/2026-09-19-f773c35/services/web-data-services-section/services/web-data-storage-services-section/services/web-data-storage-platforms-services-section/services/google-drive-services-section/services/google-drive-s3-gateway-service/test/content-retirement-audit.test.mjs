import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { createContentRetirementAudit, DEFAULT_PROTECTED_RETIREMENT_PATHS } from "../src/content-retirement-audit.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const route = (file) => ({ bucket: "archive", key: `retained/${file.path}` });
const fixedNow = () => new Date("2026-08-20T12:00:00.000Z");

async function fixture(t, offered = [["content/a.txt", "alpha"], ["content/b.txt", "beta"]]) {
  const root = await mkdtemp(join(tmpdir(), "retirement-audit-"));
  t.after(() => rm(root, { recursive: true }));
  const files = [];
  for (const [path, text] of offered) {
    const bytes = Buffer.from(text); await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), bytes);
    files.push({ path, byteLength: bytes.length, sha256: hash(bytes), mtime: "2026-08-20T00:00:00.000Z" });
  }
  const census = { schemaVersion: "migration-census/v1", pathMode: "workspace-relative", workspaceRoot: root,
    sourceRoots: ["content"], exclusions: [], files, unstableFiles: [] };
  const dispositions = files.map((file) => ({ schemaVersion: "content-migration-disposition/v1", status: "verified",
    sourcePath: file.path, source: { sha256: file.sha256, byteLength: file.byteLength }, destination: route(file),
    remote: { sha256: file.sha256, byteLength: file.byteLength, evidence: { verificationPolicy: "full-readback",
      readback: { sha256: file.sha256, byteLength: file.byteLength } } } }));
  return { root, census, dispositions };
}

test("emits a complete JSON-safe manifest without mutating local files", async (t) => {
  const state = await fixture(t);
  const manifest = await createContentRetirementAudit({ ...state, workspaceRoot: state.root, route, now: fixedNow });
  assert.equal(manifest.completeCoverage, true); assert.equal(manifest.actionPerformed, false);
  assert.deepEqual([manifest.retirement.files, manifest.retirement.byteLength], [2, 9]);
  assert.deepEqual(manifest.retirement.entries.map(({ sourcePath }) => sourcePath), ["content/a.txt", "content/b.txt"]);
  assert.doesNotThrow(() => JSON.stringify(manifest));
  assert.equal(await readFile(join(state.root, "content/a.txt"), "utf8"), "alpha");
});

test("uses only the latest disposition per source and requires full readback", async (t) => {
  const state = await fixture(t, [["content/a.txt", "alpha"]]);
  const stale = structuredClone(state.dispositions[0]); stale.remote.evidence.verificationPolicy = "remote-commitment";
  await assert.doesNotReject(createContentRetirementAudit({ ...state, dispositions: [stale, state.dispositions[0]], workspaceRoot: state.root, route }));
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: [state.dispositions[0], stale], workspaceRoot: state.root, route }), /full-readback/u);
});

test("refuses incomplete coverage and records outside the census before hashing", async (t) => {
  const state = await fixture(t);
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: state.dispositions.slice(1), workspaceRoot: state.root, route }), /coverage is incomplete/u);
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: [...state.dispositions, { sourcePath: "foreign.txt" }], workspaceRoot: state.root, route }), /outside the census/u);
});

test("refuses wrong readback hashes, sizes, routes, and destination collisions", async (t) => {
  const state = await fixture(t);
  const badHash = structuredClone(state.dispositions); badHash[0].remote.evidence.readback.sha256 = "0".repeat(64);
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: badHash, workspaceRoot: state.root, route }), /full-readback/u);
  const badSize = structuredClone(state.dispositions); badSize[0].remote.evidence.readback.byteLength += 1;
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: badSize, workspaceRoot: state.root, route }), /full-readback/u);
  const wrongRoute = structuredClone(state.dispositions); wrongRoute[0].destination.key = "wrong";
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: wrongRoute, workspaceRoot: state.root, route }), /wrong destination/u);
  const collisionRoute = () => ({ bucket: "archive", key: "same" });
  const collisions = structuredClone(state.dispositions); for (const item of collisions) item.destination = collisionRoute();
  await assert.rejects(createContentRetirementAudit({ ...state, dispositions: collisions, workspaceRoot: state.root, route: collisionRoute }), /destination collision/u);
});

test("refuses local bytes changed after the census", async (t) => {
  const state = await fixture(t, [["content/a.txt", "alpha"]]);
  await writeFile(join(state.root, "content/a.txt"), "ALPHA");
  await assert.rejects(createContentRetirementAudit({ ...state, workspaceRoot: state.root, route }), /SHA-256 changed/u);
});

test("classifies all four repository source assets as protected by default", async (t) => {
  const offered = DEFAULT_PROTECTED_RETIREMENT_PATHS.map((path, index) => [path, `source-${index}`]);
  const state = await fixture(t, offered);
  const manifest = await createContentRetirementAudit({ ...state, workspaceRoot: state.root, route, now: fixedNow });
  assert.equal(manifest.protected.files, 4); assert.equal(manifest.retirement.files, 0);
  assert.equal(manifest.protected.entries.every((entry) => entry.classification === "protected-source-asset" && !entry.retirementEligible), true);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runContentMigration } from "../src/content-migration-runner.mjs";

const sha = (body) => createHash("sha256").update(body).digest("hex");
const collect = async (source) => { const chunks = []; for await (const chunk of source) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); };

function memoryStorage() {
  const objects = new Map(), calls = [];
  const id = (bucket, key) => `${bucket}/${key}`;
  return {
    calls, objects,
    async putObject(input) {
      calls.push(["put", input.bucket, input.key, input.checksumSha256]);
      const body = await collect(input.body), digest = sha(body);
      const value = { body, sha256: digest, byteLength: body.length, generation: 1, etag: digest.slice(0, 8) };
      objects.set(id(input.bucket, input.key), value); return { ...value, body: undefined };
    },
    async copyObject(input) {
      calls.push(["copy", input.sourceBucket, input.sourceKey, input.bucket, input.key]);
      const source = objects.get(id(input.sourceBucket, input.sourceKey));
      if (!source) return null;
      const value = { ...source, generation: 1 }; objects.set(id(input.bucket, input.key), value);
      return { ...value, body: undefined };
    },
    async headObject({ bucket, key }) {
      calls.push(["head", bucket, key]); const value = objects.get(id(bucket, key));
      return value ? { ...value, body: undefined } : null;
    },
    async getObject({ bucket, key }) {
      calls.push(["get", bucket, key]); const value = objects.get(id(bucket, key));
      return value ? { ...value, body: [value.body] } : null;
    },
  };
}

async function fixture(entries) {
  const root = await mkdtemp(join(tmpdir(), "migration-runner-"));
  const files = [];
  for (const [path, text] of entries) {
    const body = Buffer.from(text); await writeFile(join(root, path), body);
    files.push({ path, sha256: sha(body), byteLength: body.length, mediaTypeHint: "text/plain" });
  }
  return { root, census: { schemaVersion: "migration-census/v1", pathMode: "workspace-relative", files } };
}

const route = (file) => ({ bucket: "media.example", key: file.path });
const run = (state, extra = {}) => runContentMigration({ census: state.census, workspaceRoot: state.root,
  storage: state.storage, route, verificationPolicy: "remote-commitment", ...extra });

test("uploads one exact payload and copies every duplicate destination, including across buckets", async (t) => {
  const state = await fixture([["a.txt", "same"], ["b.txt", "same"], ["c.txt", "same"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const records = await run(state, { route: (file) => ({ bucket: file.path === "c.txt" ? "other.example" : "media.example", key: file.path }) });
  assert.equal(state.storage.calls.filter(([name]) => name === "put").length, 1);
  assert.equal(state.storage.calls.filter(([name]) => name === "copy").length, 2);
  assert.deepEqual(records.map(({ transferStatus }) => transferStatus), ["uploaded", "copied", "copied"]);
  assert.ok(state.storage.calls.find((call) => call[0] === "copy" && call[3] === "other.example"));
  assert.equal(state.storage.calls.find(([name]) => name === "put")[3], state.census.files[0].sha256);
});

test("refuses route collisions between different payloads before upload", async (t) => {
  const state = await fixture([["a.txt", "one"], ["b.txt", "two"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  await assert.rejects(run(state, { route: () => ({ bucket: "media.example", key: "same" }) }), /route collision/u);
  assert.equal(state.storage.calls.length, 0);
});

test("resumes from a matching remote head without reading local bytes", async (t) => {
  const state = await fixture([["a.txt", "already remote"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const file = state.census.files[0]; state.storage.objects.set("media.example/a.txt",
    { body: Buffer.from("already remote"), sha256: file.sha256, byteLength: file.byteLength, generation: 7 });
  const records = await run(state);
  assert.equal(state.storage.calls.filter(([name]) => name === "put").length, 0);
  assert.equal(records[0].transferStatus, "resumed"); assert.equal(records[0].remote.generation, 7);
});

test("uses an existing disposition as a verified copy source", async (t) => {
  const state = await fixture([["new.txt", "prior"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const file = state.census.files[0]; state.storage.objects.set("archive.example/old.txt",
    { body: Buffer.from("prior"), sha256: file.sha256, byteLength: file.byteLength, generation: 2 });
  const records = await run(state, { existingDispositions: [{ source: { sha256: file.sha256 },
    destination: { bucket: "archive.example", key: "old.txt" } }] });
  assert.equal(state.storage.calls.filter(([name]) => name === "put").length, 0);
  assert.equal(state.storage.calls.filter(([name]) => name === "copy").length, 1);
  assert.equal(records[0].transferStatus, "copied");
});

test("fails closed when a local source changed after census", async (t) => {
  const state = await fixture([["a.txt", "before"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  await writeFile(join(state.root, "a.txt"), "after but a different length");
  await assert.rejects(run(state), /source changed since census/u);
  assert.equal(state.storage.calls.filter(([name]) => name === "put").length, 0);
});

test("projects every verified logical destination and records JSON-safe evidence", async (t) => {
  const state = await fixture([["a.txt", "same"], ["b.txt", "same"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage(); const projected = [], persisted = [];
  const records = await run(state, { libraryProjector: { async reconcileObject(destination) {
    projected.push(destination); return { status: "projected", nested: { z: 1, a: true } };
  } }, onDisposition: async (record) => { persisted.push(record); } });
  assert.deepEqual(projected, [{ bucket: "media.example", key: "a.txt" }, { bucket: "media.example", key: "b.txt" }]);
  assert.equal(records.every(({ projection }) => projection.status === "projected"), true);
  assert.deepEqual(persisted, records);
  assert.doesNotThrow(() => JSON.stringify(records));
});

test("full-readback hashes every destination and fails on corrupt returned bytes", async (t) => {
  const state = await fixture([["a.txt", "truth"], ["b.txt", "truth"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const records = await run(state, { verificationPolicy: "full-readback" });
  assert.equal(state.storage.calls.filter(([name]) => name === "get").length, 2);
  assert.equal(records.every(({ remote }) => remote.evidence.readback.sha256 === state.census.files[0].sha256), true);
  state.storage.getObject = async ({ bucket, key }) => {
    const value = state.storage.objects.get(`${bucket}/${key}`); return { ...value, body: [Buffer.from("lies!")] };
  };
  await assert.rejects(run(state, { verificationPolicy: "full-readback" }), /full readback/u);
});

test("never deletes or moves source files", async (t) => {
  const state = await fixture([["keep.txt", "keep me"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  await run(state);
  assert.equal(await readFile(join(state.root, "keep.txt"), "utf8"), "keep me");
  assert.equal("deleteObject" in state.storage, false);
});

test("a deferred restart retains its durable disposition without reuploading or appending it", async (t) => {
  const state = await fixture([["keep.txt", "one durable fact"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const firstPersisted = [];
  const first = await run(state, { projectionPhase: "deferred",
    onDisposition: async (record) => firstPersisted.push(record) });
  const callsAfterFirst = state.storage.calls.length, secondPersisted = [];
  const second = await run(state, { projectionPhase: "deferred", existingDispositions: firstPersisted,
    onDisposition: async (record) => secondPersisted.push(record) });
  assert.equal(first[0].projection.status, "deferred");
  assert.equal(second[0].projection.status, "deferred");
  assert.equal(secondPersisted.length, 0);
  assert.equal(state.storage.calls.slice(callsAfterFirst).some(([operation]) => operation === "put" || operation === "copy"), false);
});

test("an inline restart advances only a previously deferred projection", async (t) => {
  const state = await fixture([["project-later.txt", "payload first"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const deferred = await run(state, { projectionPhase: "deferred" });
  const callsBeforeProjection = state.storage.calls.length, projected = [], persisted = [];
  const records = await run(state, { projectionPhase: "inline", existingDispositions: deferred,
    libraryProjector: { async reconcileObject(value) { projected.push(value); return { status: "projected" }; } },
    onDisposition: async (record) => persisted.push(record) });
  assert.deepEqual(projected, [{ bucket: "media.example", key: "project-later.txt" }]);
  assert.equal(records[0].projection.status, "projected");
  assert.equal(persisted.length, 1);
  assert.equal(state.storage.calls.slice(callsBeforeProjection).some(([operation]) => operation === "put" || operation === "copy"), false);
});

test("an inline restart reuses a durable full-readback witness", async (t) => {
  const state = await fixture([["project-once.txt", "read the payload only once"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const deferred = await run(state, { projectionPhase: "deferred", verificationPolicy: "full-readback" });
  assert.equal(state.storage.calls.filter(([operation]) => operation === "get").length, 1);
  const persisted = [];
  const projected = await run(state, { projectionPhase: "inline", verificationPolicy: "full-readback",
    existingDispositions: deferred,
    libraryProjector: { async reconcileObject() { return { status: "projected" }; } },
    onDisposition: async (record) => persisted.push(record) });
  assert.equal(state.storage.calls.filter(([operation]) => operation === "get").length, 1);
  assert.equal(projected[0].remote.evidence.verificationPolicy, "full-readback");
  assert.deepEqual(projected[0].remote.evidence.readback, deferred[0].remote.evidence.readback);
  assert.equal(persisted.length, 1);
});

test("admits an explicitly enumerated migration census", async (t) => {
  const state = await fixture([["enumerated.txt", "one admitted path"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  state.census.schemaVersion = "enumerated-migration-census/v1";
  const records = await run(state);
  assert.equal(records.length, 1);
  assert.equal(records[0].status, "verified");
});

test("recovers an uncertain successful upload by checking its head before retransmission", async (t) => {
  const state = await fixture([["uncertain.txt", "arrived despite a lost reply"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const putObject = state.storage.putObject.bind(state.storage); let first = true; const delays = [];
  state.storage.putObject = async (input) => {
    const result = await putObject(input);
    if (first) { first = false; throw Object.assign(new Error("lost completion"),
      { code: "provider-refused", evidence: { status: 429 } }); }
    return result;
  };
  const records = await run(state, { retryPolicy: { maxAttempts: 3, baseDelayMilliseconds: 5,
    maximumDelayMilliseconds: 20 }, wait: async (delay) => delays.push(delay) });
  assert.deepEqual(delays, [5]);
  assert.equal(state.storage.calls.filter(([operation]) => operation === "put").length, 1);
  assert.equal(records[0].transferStatus, "resumed");
});

test("recovers an uncertain successful logical copy without creating another revision", async (t) => {
  const state = await fixture([["a.txt", "same payload"], ["b.txt", "same payload"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  const copyObject = state.storage.copyObject.bind(state.storage); let first = true; const delays = [];
  state.storage.copyObject = async (input) => {
    const result = await copyObject(input);
    if (first) { first = false; throw Object.assign(new Error("lost copy completion"),
      { code: "provider-refused", evidence: { status: 403 } }); }
    return result;
  };
  await run(state, { retryPolicy: { maxAttempts: 3, baseDelayMilliseconds: 5,
    maximumDelayMilliseconds: 20 }, wait: async (delay) => delays.push(delay) });
  assert.deepEqual(delays, [5]);
  assert.equal(state.storage.calls.filter(([operation]) => operation === "copy").length, 1);
});

test("bounds repeated quota retries and reports their schedule", async (t) => {
  const state = await fixture([["quota.txt", "wait politely"]]);
  t.after(() => rm(state.root, { recursive: true })); state.storage = memoryStorage();
  let attempts = 0; const delays = [], progress = [];
  state.storage.headObject = async () => { attempts += 1; throw Object.assign(new Error("quota"),
    { code: "provider-refused", evidence: { status: 429 } }); };
  await assert.rejects(run(state, { retryPolicy: { maxAttempts: 3, baseDelayMilliseconds: 5,
    maximumDelayMilliseconds: 8 }, wait: async (delay) => delays.push(delay),
  onProgress: async (event) => progress.push(event) }), /quota/u);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [5, 8]);
  assert.deepEqual(progress.map(({ event }) => event), ["retry-scheduled", "retry-scheduled", "retry-exhausted"]);
});

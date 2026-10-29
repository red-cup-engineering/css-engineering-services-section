import assert from "node:assert/strict";
import test from "node:test";
import { createFilesetObjectStorage, ObjectStorageError } from "../src/fileset-object-storage.mjs";
import { createMemoryObjectCustody } from "../src/memory-object-custody.mjs";

async function body(result) {
  const chunks = [];
  for await (const chunk of result.body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const payloadKeys = (custody) => [...custody.inspect().keys()].filter((key) => key.startsWith("payloads/"));

test("stores one intact content-addressed payload and serves metadata and ranges", async () => {
  const custody = createMemoryObjectCustody();
  const storage = createFilesetObjectStorage({ custody, chunkBytes: 4 });
  const stored = await storage.putObject({ bucket: "media.test", key: "video/crow.bin",
    body: [Buffer.from("abc"), Buffer.from("defghijk")], contentType: "video/example", metadata: { mtime: "123.4" } });
  assert.equal(stored.byteLength, 11);
  assert.equal(payloadKeys(custody).length, 1);
  assert.equal(custody.inspect().get(payloadKeys(custody)[0]).body.toString(), "abcdefghijk");
  const headed = await storage.headObject({ bucket: "media.test", key: "video/crow.bin" });
  assert.equal(headed.contentType, "video/example");
  assert.equal(headed.metadata.mtime, "123.4");
  const ranged = await storage.getObject({ bucket: "media.test", key: "video/crow.bin",
    range: { start: 3, endExclusive: 9 } });
  assert.equal((await body(ranged)).toString(), "defghi");
});

test("routes only materialized catalog records through explicit catalog custody writes", async () => {
  const base = createMemoryObjectCustody(), calls = [];
  const custody = { ...base,
    async putImmutableCatalogRecord(key, value) {
      calls.push({ operation: "immutable-record", key, value });
      return base.putImmutable(key, value);
    },
    async putCurrentCatalogRecord(key, value, conditions) {
      calls.push({ operation: "current-record", key, value });
      return base.putCurrent(key, value, conditions);
    },
  };
  const storage = createFilesetObjectStorage({ custody });
  await storage.putObject({ bucket: "media.test", key: "movie.mp4", body: "intact payload", contentType: "video/mp4" });
  assert.deepEqual(calls.map(({ operation }) => operation), ["immutable-record", "current-record"]);
  assert.equal(calls.every(({ value }) => value.mediaType === "application/json"
    && value.body instanceof Uint8Array && value.body.length === value.byteLength), true);
  assert.equal(calls.some(({ key }) => key.startsWith("payloads/")), false);
});

test("serves an intact zero-byte payload", async () => {
  const custody = createMemoryObjectCustody();
  const storage = createFilesetObjectStorage({ custody });
  await storage.putObject({ bucket: "media.test", key: "empty", body: Buffer.alloc(0) });
  const retained = await storage.getObject({ bucket: "media.test", key: "empty" });
  assert.equal(retained.byteLength, 0);
  assert.equal((await body(retained)).length, 0);
});

test("deduplicates exact payloads while retaining independent key commits", async () => {
  const custody = createMemoryObjectCustody();
  const storage = createFilesetObjectStorage({ custody });
  const a = await storage.putObject({ bucket: "media.test", key: "a", body: "abcdefgh" });
  const b = await storage.putObject({ bucket: "media.test", key: "b", body: "abcdefgh" });
  assert.equal(a.sha256, b.sha256);
  assert.equal(payloadKeys(custody).length, 1);
  assert.deepEqual((await storage.listObjects({ bucket: "media.test" })).objects.map(({ key }) => key), ["a", "b"]);
});

test("copies a key alias without reading or duplicating payload bytes", async () => {
  const custody = createMemoryObjectCustody();
  const storage = createFilesetObjectStorage({ custody });
  await storage.putObject({ bucket: "media.test", key: "old/name.mp4", body: "whole movie", contentType: "video/mp4" });
  const before = payloadKeys(custody);
  const copied = await storage.copyObject({ sourceBucket: "media.test", sourceKey: "old/name.mp4",
    bucket: "media.test", key: "new/name.mp4" });
  assert.equal(copied.sha256, (await storage.headObject({ bucket: "media.test", key: "old/name.mp4" })).sha256);
  assert.deepEqual(payloadKeys(custody), before);
  assert.equal((await body(await storage.getObject({ bucket: "media.test", key: "new/name.mp4" }))).toString(), "whole movie");
});

test("a failed head write never advances the visible key", async () => {
  const base = createMemoryObjectCustody();
  const custody = { ...base, async putCurrent(key, value, conditions) {
    if (key.startsWith("heads/")) throw new Error("injected head failure");
    return base.putCurrent(key, value, conditions);
  } };
  const storage = createFilesetObjectStorage({ custody });
  await assert.rejects(storage.putObject({ bucket: "media.test", key: "unpublished", body: "bytes" }), /injected head failure/u);
  assert.equal(await storage.headObject({ bucket: "media.test", key: "unpublished" }), null);
  assert.equal((await storage.listObjects({ bucket: "media.test" })).objects.length, 0);
  assert.equal(payloadKeys(base).length, 1, "unreferenced canonical bytes are safe for later garbage collection");
});

test("deletion writes a tombstone but preserves a payload referenced by another key", async () => {
  const custody = createMemoryObjectCustody();
  const storage = createFilesetObjectStorage({ custody });
  await storage.putObject({ bucket: "media.test", key: "a", body: "shared" });
  await storage.copyObject({ sourceBucket: "media.test", sourceKey: "a", bucket: "media.test", key: "b" });
  const retainedKey = payloadKeys(custody)[0];
  assert.equal((await storage.deleteObject({ bucket: "media.test", key: "a" })).deleted, true);
  assert.equal(await storage.headObject({ bucket: "media.test", key: "a" }), null);
  assert.equal((await body(await storage.getObject({ bucket: "media.test", key: "b" }))).toString(), "shared");
  assert.ok(custody.inspect().has(retainedKey));
});

test("enforces conditional writes while leaving the preceding revision readable", async () => {
  const storage = createFilesetObjectStorage({ custody: createMemoryObjectCustody() });
  const first = await storage.putObject({ bucket: "media.test", key: "same", body: "one" });
  await assert.rejects(storage.putObject({ bucket: "media.test", key: "same", body: "two", ifNoneMatch: "*" }),
    (error) => error instanceof ObjectStorageError && error.code === "PreconditionFailed");
  await assert.rejects(storage.putObject({ bucket: "media.test", key: "same", body: "two", ifMatch: '"wrong"' }),
    (error) => error.code === "PreconditionFailed");
  assert.equal((await body(await storage.getObject({ bucket: "media.test", key: "same" }))).toString(), "one");
  await storage.putObject({ bucket: "media.test", key: "same", body: "two", ifMatch: first.etag });
  assert.equal((await body(await storage.getObject({ bucket: "media.test", key: "same" }))).toString(), "two");
});

test("multipart completion promotes one intact canonical payload", async () => {
  const custody = createMemoryObjectCustody();
  const storage = createFilesetObjectStorage({ custody, uuid: () => "upload_12345678" });
  const upload = await storage.createMultipartUpload({ bucket: "media.test", key: "multipart", contentType: "video/example" });
  const one = await storage.uploadPart({ ...upload, partNumber: 1, body: "abcdef" });
  const two = await storage.uploadPart({ ...upload, partNumber: 2, body: "ghijkl" });
  const completed = await storage.completeMultipartUpload({ ...upload, parts: [
    { partNumber: 1, etag: one.etag }, { partNumber: 2, etag: two.etag },
  ] });
  assert.match(completed.etag, /-2"$/u);
  assert.equal(payloadKeys(custody).length, 1);
  assert.equal(custody.inspect().get(payloadKeys(custody)[0]).body.toString(), "abcdefghijkl");
  assert.equal(custody.inspectStages().size, 0);
  assert.equal((await body(await storage.getObject({ bucket: "media.test", key: "multipart" }))).toString(), "abcdefghijkl");
});

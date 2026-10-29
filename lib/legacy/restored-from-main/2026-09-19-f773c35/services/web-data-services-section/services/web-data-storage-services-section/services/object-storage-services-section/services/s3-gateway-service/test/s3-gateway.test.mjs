import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { createFilesetObjectStorage } from "../../fileset-object-storage-service/src/fileset-object-storage.mjs";
import { createMemoryObjectCustody } from "../../fileset-object-storage-service/src/memory-object-custody.mjs";
import { createS3GatewayHandler, signS3Request, S3_EMPTY_PAYLOAD_SHA256 } from "../src/s3-gateway.mjs";

const NOW = new Date("2026-08-20T04:00:00.000Z");
const ACCESS = "test-access", SECRET = "test-secret-value";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(t) {
  const storage = createFilesetObjectStorage({ custody: createMemoryObjectCustody(), chunkBytes: 4,
    clock: () => NOW, uuid: () => "upload_12345678" });
  const server = createServer(createS3GatewayHandler({ storage, credentials: { [ACCESS]: { secretAccessKey: SECRET, buckets: ["media.test"] } }, clock: () => NOW }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = "GET", body, headers = {} } = {}) {
    const payloadHash = body === undefined ? S3_EMPTY_PAYLOAD_SHA256 : sha256(body);
    const signed = signS3Request({ method, url: `${origin}${path}`, headers, accessKeyId: ACCESS,
      secretAccessKey: SECRET, now: NOW, payloadHash });
    return fetch(`${origin}${path}`, { method, headers: signed, ...(body === undefined ? {} : { body }) });
  }
  return { request };
}

test("serves the admitted signed S3 surface over fileset storage", async (t) => {
  const { request } = await fixture(t), bytes = Buffer.from("abcdefghijk");
  const put = await request("/media.test/video/crow.bin", { method: "PUT", body: bytes,
    headers: { "content-type": "video/example", "x-amz-meta-mtime": "1787198400.0" } });
  assert.equal(put.status, 200); assert.match(put.headers.get("etag"), /^"[a-f0-9]{32}"$/u);
  const head = await request("/media.test/video/crow.bin", { method: "HEAD" });
  assert.equal(head.status, 200); assert.equal(head.headers.get("content-length"), "11");
  assert.equal(head.headers.get("x-amz-meta-mtime"), "1787198400.0");
  const ranged = await request("/media.test/video/crow.bin", { headers: { range: "bytes=3-8" } });
  assert.equal(ranged.status, 206); assert.equal(await ranged.text(), "defghi");
  const listed = await request("/media.test?list-type=2&prefix=video%2F");
  assert.equal(listed.status, 200); assert.match(await listed.text(), /<Key>video\/crow\.bin<\/Key>/u);
  assert.equal((await request("/media.test/video/crow.bin", { method: "DELETE" })).status, 204);
  assert.equal((await request("/media.test/video/crow.bin", { method: "HEAD" })).status, 404);

  assert.equal((await request("/media.test", { method: "HEAD" })).status, 200);
  assert.match(await (await request("/media.test?location")).text(), /<LocationConstraint>auto<\/LocationConstraint>/u);
  assert.match(await (await request("/")).text(), /<Name>media\.test<\/Name>/u);
  await request("/media.test/video/a.bin", { method: "PUT", body: Buffer.from("a") });
  await request("/media.test/video/nested/b.bin", { method: "PUT", body: Buffer.from("b") });
  const delimited = await (await request("/media.test?list-type=2&prefix=video%2F&delimiter=%2F")).text();
  assert.match(delimited, /<Key>video\/a\.bin<\/Key>/u);
  assert.match(delimited, /<CommonPrefixes><Prefix>video\/nested\/<\/Prefix><\/CommonPrefixes>/u);

  const initiated = await request("/media.test/large.bin?uploads", { method: "POST", body: Buffer.alloc(0) });
  assert.equal(initiated.status, 200); const uploadId = /<UploadId>([^<]+)<\/UploadId>/u.exec(await initiated.text())[1];
  const one = await request(`/media.test/large.bin?partNumber=1&uploadId=${uploadId}`, { method: "PUT", body: Buffer.from("abcdef") });
  const two = await request(`/media.test/large.bin?partNumber=2&uploadId=${uploadId}`, { method: "PUT", body: Buffer.from("ghijkl") });
  const completion = Buffer.from(`<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>${one.headers.get("etag")}</ETag></Part><Part><PartNumber>2</PartNumber><ETag>${two.headers.get("etag")}</ETag></Part></CompleteMultipartUpload>`);
  const completed = await request(`/media.test/large.bin?uploadId=${uploadId}`, { method: "POST", body: completion });
  assert.equal(completed.status, 200);
  assert.equal(await (await request("/media.test/large.bin")).text(), "abcdefghijkl");

  assert.equal((await fetch((await request("/media.test?list-type=2")).url)).status, 403);
  assert.equal((await request("/other.test?list-type=2")).status, 403);
});

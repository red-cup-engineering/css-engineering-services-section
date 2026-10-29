import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { readBody, readFormBody, readJsonBody, readMultipartBody, readTextBody } from "../src/read-http-request-body.mts";

function request(body: Buffer | string, headers: Record<string, string> = {}) {
  const stream = Readable.from([body]) as Readable & { headers: Record<string, string> };
  stream.headers = headers;
  return stream;
}

test("enforces encoded and decoded body limits", async () => {
  await assert.rejects(readBody(request("12345") as never, { maxEncodedBytes: 4 }), /request body exceeded 4 bytes/);
  const compressed = gzipSync(Buffer.from("expanded body".repeat(100)));
  await assert.rejects(
    readBody(request(compressed, { "content-encoding": "gzip" }) as never, { maxEncodedBytes: compressed.length, maxBytes: 30 }),
    /decoded request body exceeded 30 bytes/,
  );
});

test("decodes charset, JSON, and URL-encoded forms", async () => {
  assert.equal(
    await readTextBody(request(Buffer.from([0x63, 0x61, 0x66, 0xe9]), { "content-type": "text/plain; charset=latin1" }) as never),
    "café",
  );
  assert.deepEqual(
    await readJsonBody(request('{"ok":true}', { "content-type": "application/json" }) as never),
    { ok: true },
  );
  assert.deepEqual(await readJsonBody(request("") as never, { empty: { empty: true } }), { empty: true });
  assert.equal(
    (await readFormBody(request("a=one&a=two", { "content-type": "application/x-www-form-urlencoded" }) as never)).getAll("a").length,
    2,
  );
  await assert.rejects(readFormBody(request("x", { "content-type": "application/json" }) as never), /expected application\/x-www-form-urlencoded/);
});

test("reads multipart fields and files through the declared boundary", async () => {
  const boundary = "reader-boundary";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    "",
    "hello",
    `--${boundary}`,
    'Content-Disposition: form-data; name="asset"; filename="a.txt"',
    "Content-Type: text/plain",
    "",
    "file body",
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const form = await readMultipartBody(
    request(body, { "content-type": `multipart/form-data; boundary=${boundary}` }) as never,
  );
  assert.equal(form.get("title"), "hello");
  assert.equal(form.file("asset")?.text(), "file body");
});

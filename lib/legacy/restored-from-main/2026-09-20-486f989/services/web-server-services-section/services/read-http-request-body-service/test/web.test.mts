import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync, deflateSync, brotliCompressSync } from "node:zlib";
import { Readable } from "node:stream";
import * as web from "../src/web.mts";
import * as native from "../src/read-http-request-body.mts";
const make = (body: BodyInit | null, headers: Record<string, string> = {}) => new Request("https://example.test/", { method: "POST", headers, body, duplex: "half" } as RequestInit);
const refusal = (status: number, code: string) => (error: unknown) => error instanceof web.BodyReadError && error.status === status && error.code === code;
function nativeRequest(body: Uint8Array, headers: Record<string, string>) {
  return Object.assign(Readable.from([body]), { headers }) as never;
}
for (const transport of ["web", "native"] as const) {
  test(`encoded/decoded/identity limits and decoding use one contract: ${transport}`, async () => {
    const read = (bytes: Uint8Array<ArrayBuffer>, headers: Record<string, string>, options: web.BodyParseOptions) => transport === "web" ? web.readBody(make(bytes, headers), options) : native.readBody(nativeRequest(bytes, headers), options);
    const plain = new TextEncoder().encode("expanded body".repeat(100));
    const compressed = new Uint8Array(gzipSync(plain));
    assert.deepEqual(new Uint8Array(await read(compressed, { "content-encoding": "gzip" }, { maxEncodedBytes: compressed.length, maxBytes: plain.length })), plain);
    await assert.rejects(read(compressed, { "content-encoding": "gzip" }, { maxBytes: 30, maxEncodedBytes: compressed.length }), refusal(413, "body-too-large"));
    await assert.rejects(read(compressed, { "content-encoding": "gzip" }, { maxBytes: plain.length, maxEncodedBytes: compressed.length - 1 }), refusal(413, "body-too-large"));
    await assert.rejects(read(plain, {}, { maxBytes: 5, maxEncodedBytes: plain.length }), refusal(413, "body-too-large"));
    const twice = new Uint8Array(deflateSync(compressed));
    assert.deepEqual(new Uint8Array(await read(twice, { "content-encoding": "gzip, deflate" }, { maxBytes: plain.length })), plain);
    await assert.rejects(read(plain, { "content-encoding": "gzip" }, { maxBytes: plain.length }), refusal(400, "invalid-body"));
    await assert.rejects(read(plain, { "content-encoding": "unknown" }, {}), refusal(415, "unsupported-content-coding"));
    assert.deepEqual(new Uint8Array(await read(compressed, { "content-encoding": "gzip" }, { decodeContentEncoding: false })), compressed);
  });
}
test("portable JSON admits JSON media and structured suffixes; classifies invalid JSON/media/charset/UTF-8", async () => {
  for (const type of ["application/json", "application/problem+json; charset=utf-8"]) assert.deepEqual(await web.readJsonBody(make('{"ok":true}', { "content-type": type })), { ok: true });
  await assert.rejects(web.readJsonBody(make("{}", { "content-type": "text/plain" })), refusal(415, "unsupported-media-type"));
  await assert.rejects(web.readJsonBody(make("{}")), refusal(415, "unsupported-media-type"));
  await assert.rejects(web.readJsonBody(make("{", { "content-type": "application/json" })), refusal(400, "invalid-json"));
  await assert.rejects(web.readJsonBody(make("", { "content-type": "application/json" })), refusal(400, "invalid-json"));
  assert.equal(await web.readJsonBody(make("", { "content-type": "application/json" }), { empty: null }), null);
  await assert.rejects(web.readTextBody(make("x", { "content-type": "text/plain; charset=utf-16" })), refusal(415, "unsupported-charset"));
  await assert.rejects(web.readTextBody(make(new Uint8Array([255]))), refusal(400, "invalid-body"));
  assert.equal(await web.readTextBody(make(new Uint8Array([99, 97, 102, 233]), { "content-type": "text/plain; charset=latin1" })), "café");
});
test("portable URL-encoded and multipart intake preserves repeated fields and files", async () => {
  const urlencoded = () => make("tag=one&tag=two", { "content-type": "application/x-www-form-urlencoded" });
  assert.deepEqual((await web.readFormBody(urlencoded())).getAll("tag"), ["one", "two"]);
  assert.deepEqual((await web.readFormDataBody(urlencoded())).getAll("tag"), ["one", "two"]);
  const data = new FormData(); data.append("tag", "one"); data.append("tag", "two"); data.append("asset", new Blob(["file body"], { type: "text/plain" }), "a.txt");
  const result = await web.readMultipartBody(make(data));
  assert.deepEqual(result.getAll("tag"), ["one", "two"]);
  const file = result.get("asset") as File; assert.equal(file.name, "a.txt"); assert.equal(await file.text(), "file body");
  await assert.rejects(web.readMultipartBody(make("x", { "content-type": "multipart/form-data" })), refusal(400, "invalid-form"));
  await assert.rejects(web.readMultipartBody(make("x", { "content-type": "multipart/form-data; boundary=none" })), refusal(400, "invalid-form"));
  const encoded = make(data);
  const encodedType = encoded.headers.get("content-type")!;
  await assert.rejects(web.readFormDataBody(make(await encoded.arrayBuffer(), { "content-type": encodedType }), { maxBytes: 3 }), refusal(413, "body-too-large"));
});
test("portable size refusal cancels a producer, including an unconsumed tee", async () => {
  let cancelled = false;
  const request = make(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(64)); }, cancel() { cancelled = true; } }));
  await assert.rejects(web.readBody(request, { maxBytes: 5 }), refusal(413, "body-too-large"));
  assert.equal(cancelled, true);
  const original = make(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(64)); } }));
  const clone = original.clone();
  await assert.rejects(web.readBody(clone, { maxBytes: 5 }), refusal(413, "body-too-large"));
  await original.body!.cancel();
});
test("request cancellation interrupts a stalled body and cleans up its producer", async () => {
  let cancelled = false;
  const controller = new AbortController();
  const request = new Request("https://example.test", { method: "POST", body: new ReadableStream({ cancel() { cancelled = true; } }), signal: controller.signal, duplex: "half" } as RequestInit);
  const reading = web.readBody(request); const reason = new Error("receiver left"); controller.abort(reason);
  await assert.rejects(reading, (error) => error === reason); assert.equal(cancelled, true);
  await assert.rejects(web.readBody(new Request("https://example.test", { signal: controller.signal })), (error) => error === reason);
});
test("stream failure is a typed malformed-body refusal", async () => {
  await assert.rejects(web.readBody(make(new ReadableStream({ start(controller) { controller.error(new Error("broken transport")); } }))), refusal(400, "invalid-body"));
});
test("portable intake has a finite default limit and supports an explicit zero-byte limit", async () => {
  assert.equal((await web.readBody(make(null), { maxBytes: 0 })).byteLength, 0);
  await assert.rejects(web.readBody(make(new Uint8Array(web.DEFAULT_BODY_LIMIT + 1))), refusal(413, "body-too-large"));
  await assert.rejects(web.readBody(make("x"), { maxBytes: -1 }), RangeError);
});
test("native transport retains its Brotli representation binding", async () => {
  assert.equal((await native.readBody(nativeRequest(brotliCompressSync("hello"), { "content-encoding": "br" }))).toString(), "hello");
});

test("portable body refusals remain observable through a real Node listener", async (t) => {
  const { createWebServerEngine } = await import("@red-cup-engineering/web-server-services-section");
  const { startWebServer } = await import("@red-cup-engineering/web-server-services-section/node");
  const engine = createWebServerEngine({ resources: [{ match: "/", methods: ["POST"], handler: async (ctx) => {
    try { return Response.json(await web.readJsonBody(ctx.request, { maxBytes: 1024 })); }
    catch (error) { if (error instanceof web.BodyReadError) return Response.json({ code: error.code }, { status: error.status }); throw error; }
  } }] });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  await new Promise((resolve) => setTimeout(resolve, 150));
  const url = `http://127.0.0.1:${server.port}/`;
  for (const [body, contentType, status] of [['{"ok":true}', "application/json", 200], ["{", "application/json", 400], ["{}", "text/plain", 415], [JSON.stringify({ text: "x".repeat(65536) }), "application/json", 413]] as const) {
    const init = { method: "POST", headers: { "content-type": contentType }, body };
    const direct = await engine.fetch(new Request(url, init));
    const remote = await fetch(url, init);
    assert.equal(direct.status, status); assert.equal(remote.status, status);
    assert.deepEqual(await remote.json(), await direct.json());
  }
});

for (const transport of ["web", "native"] as const) {
  test(`ASCII rejects high-bit octets and JSON always decodes RFC8259 UTF-8: ${transport}`, async () => {
    const readText = (body: Uint8Array<ArrayBuffer>, type: string) => transport === "web" ? web.readTextBody(make(body, { "content-type": type })) : native.readTextBody(nativeRequest(body, { "content-type": type }));
    await assert.rejects(readText(new Uint8Array([233]), "text/plain; charset=us-ascii"), refusal(400, "invalid-body"));
    assert.equal(await readText(new Uint8Array([65]), "text/plain; charset=us-ascii"), "A");
    const readJson = (body: Uint8Array<ArrayBuffer>) => transport === "web" ? web.readJsonBody(make(body, { "content-type": "application/json; charset=latin1" })) : native.readJsonBody(nativeRequest(body, { "content-type": "application/json; charset=latin1" }));
    await assert.rejects(readJson(new Uint8Array([34, 233, 34])), refusal(400, "invalid-body"));
    // RFC8259 defines no charset parameter: it cannot override JSON's UTF-8 encoding.
    assert.equal(await readJson(new TextEncoder().encode('"é"')), "é");
  });
}

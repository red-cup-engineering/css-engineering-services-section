import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { connect as connectHttp2 } from "node:http2";
import { connect as connectSocket } from "node:net";
import { request as nodeRequest } from "node:http";
import { createWebServerEngine } from "../src/web-server-engine.mts";
const createFetchHandler = (specification: Parameters<typeof createWebServerEngine>[0]) => { const engine = createWebServerEngine(specification); return Object.assign(engine.fetch, { engine }); };
import { startWebServer as startServer, installGracefulShutdown } from "../src/node.mts";
import type { WebApplication } from "@red-cup-engineering/http-server-application-contract-service/web";

// This WSL receiver exposes a new ephemeral listener asynchronously to local clients.
// Readiness settles before application checks; production start remains unchanged.
async function start(...args: Parameters<typeof startServer>) {
  const server = await startServer(...args);
  await new Promise((resolve) => setTimeout(resolve, 150));
  return server;
}

const encoder = new TextEncoder();
const application: WebApplication = {
  resources: [
    { match: "/hello/:name", methods: ["GET"], handler: (ctx) => new Response(ctx.params.name, { headers: { "x-route": ctx.route! } }) },
    { match: "/cookies", handler: () => { const headers = new Headers(); headers.append("set-cookie", "one=1; HttpOnly"); headers.append("set-cookie", "two=2; Secure"); return new Response("cookies", { headers }); } },
    { match: "/empty", handler: () => new Response(null, { status: 204 }) },
    { match: "/cached", handler: () => new Response(null, { status: 304, headers: { etag: '"v1"' } }) },
    { match: "/redirect", handler: () => new Response(null, { status: 303, headers: { location: "/hello/next" } }) },
    { match: "/reject", handler: () => Response.json({ errors: { name: "required" } }, { status: 422 }) },
    { match: "/error", handler: () => { throw new Error("private secret"); } },
    { match: "/negotiate", methods: ["GET"], produces: ["text/plain"], languages: ["en"], handler: (ctx) => new Response(ctx.negotiatedType, { headers: { "content-type": ctx.negotiatedType! } }) },
    { match: /\/repeat/g, handler: () => new Response("repeat") },
  ],
  security: { strictTransportSecurity: false },
};

for (const [path, method, headers] of [
  ["/hello/Ada", "GET", {}], ["/hello/Ada", "HEAD", {}], ["/hello/Ada", "POST", {}], ["/hello/Ada", "OPTIONS", {}],
  ["/missing", "GET", {}], ["/cookies", "GET", {}], ["/empty", "GET", {}], ["/cached", "GET", {}],
  ["/redirect", "GET", {}], ["/reject", "GET", {}], ["/error", "GET", {}], ["/hello/%ZZ", "GET", {}],
  ["/negotiate", "GET", { accept: "text/plain", "accept-language": "en" }],
  ["/negotiate", "GET", { accept: "application/json" }],
] as const) {
  test(`direct Fetch and Node transport agree: ${method} ${path}`, async (t) => {
    const handle = createFetchHandler(application);
    const server = await start((handle).engine, { port: 0, host: "127.0.0.1" });
    t.after(() => server.close());
    const url = `http://127.0.0.1:${server.port}${path}`;
    const expected = await handle(new Request(url, { method, headers }));
    const actual = await fetch(url, { method, headers, redirect: "manual" });
    assert.equal(actual.status, expected.status);
    for (const name of ["allow", "location", "content-type", "content-language", "etag", "vary", "x-route", "content-security-policy"]) assert.equal(actual.headers.get(name), expected.headers.get(name), name);
    assert.deepEqual(actual.headers.getSetCookie(), expected.headers.getSetCookie());
    assert.equal(await actual.text(), await expected.text());
  });
}

test("native resources use the same matching/admission pipeline", async (t) => {
  const server = await start(createWebServerEngine({ resources: [{ match: "/hello/:name", methods: ["GET"], handler: (ctx) => new Response(ctx.params.name) }] }), { port: 0, host: "127.0.0.1" });
  t.after(() => server.close());
  assert.equal(await (await fetch(`http://127.0.0.1:${server.port}/hello/Ada`)).text(), "Ada");
  assert.equal((await fetch(`http://127.0.0.1:${server.port}/hello/%ZZ`)).status, 400);
  const refused = await fetch(`http://127.0.0.1:${server.port}/hello/Ada`, { method: "POST" });
  assert.equal(refused.status, 405); assert.match(refused.headers.get("allow")!, /GET/);
});

test("global route patterns are independent of earlier requests", async () => {
  const handle = createFetchHandler(application);
  for (let index = 0; index < 3; index++) assert.equal(await (await handle(new Request("https://example.test/repeat"))).text(), "repeat");
});

test("response starts before stream completion on Fetch and Node", async (t) => {
  const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
  const handle = createFetchHandler({ resources: [{ match: "/", handler: () => new Response(new ReadableStream({ start(controller) { controllers.push(controller); controller.enqueue(encoder.encode("first")); } }), { headers: { "content-type": "text/event-stream" } }) }] });
  const server = await start((handle).engine, { port: 0, host: "127.0.0.1" });
  t.after(() => server.close());
  for (const response of [await handle(new Request("https://example.test/")), await fetch(`http://127.0.0.1:${server.port}/`)]) {
    const reader = response.body!.getReader();
    assert.equal(new TextDecoder().decode((await reader.read()).value), "first");
    const controller = controllers.shift()!; controller.enqueue(encoder.encode("last")); controller.close();
    assert.equal(new TextDecoder().decode((await reader.read()).value), "last");
    assert.equal((await reader.read()).done, true);
  }
});

test("request abort cancels the response producer after headers", async () => {
  const aborted = new AbortController(); let reason: unknown;
  const handle = createFetchHandler({ resources: [{ match: "/", handler: () => new Response(new ReadableStream({ cancel(value) { reason = value; } })) }] });
  const response = await handle(new Request("https://example.test/", { signal: aborted.signal }));
  const reader = response.body!.getReader(); const pending = reader.read();
  aborted.abort(new Error("receiver left"));
  await assert.rejects(pending, /receiver left/); assert.match(String(reason), /receiver left/);
});

test("HEAD cancels unused representation bodies", async () => {
  let cancelled = false;
  const handle = createFetchHandler({ resources: [{ match: "/", handler: () => new Response(new ReadableStream({ cancel() { cancelled = true; } })) }] });
  const response = await handle(new Request("https://example.test/", { method: "HEAD" }));
  assert.equal(response.body, null); assert.equal(cancelled, true);
});

test("Fetch response applies bounded demand instead of eagerly draining the body", async () => {
  let pulls = 0;
  const handle = createFetchHandler({ resources: [{ match: "/", handler: () => new Response(new ReadableStream({ pull(controller) { pulls++; controller.enqueue(new Uint8Array(1024)); } })) }] });
  const response = await handle(new Request("https://example.test/"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(pulls <= 1, `unexpected eager pulls: ${pulls}`);
  const reader = response.body!.getReader(); await reader.read();
  assert.ok(pulls <= 3); await reader.cancel();
});

test("Fetch identity is absent unless supplied; forwarded identity needs Node proxy trust", async (t) => {
  const handle = createFetchHandler({ resources: [{ match: "/", handler: (ctx) => Response.json({ origin: ctx.url.origin, remote: ctx.remoteAddress ?? null }) }] });
  const direct = await handle(new Request("https://actual.test/", { headers: { "x-forwarded-host": "spoof.test" } }));
  assert.deepEqual(await direct.json(), { origin: "https://actual.test", remote: null });
  for (const trustProxy of [false, true]) {
    const server = await start((handle).engine, { ...{ port: 0, host: "127.0.0.1" }, trustProxy }); t.after(() => server.close());
    const response = await fetch(`http://127.0.0.1:${server.port}/`, { headers: { "x-forwarded-host": "public.test", "x-forwarded-proto": "https" } });
    const value = await response.json(); assert.equal(value.origin, trustProxy ? "https://public.test" : `http://127.0.0.1:${server.port}`); assert.equal(value.remote, "127.0.0.1");
  }
});

test("Node client disconnect cancels a streaming producer", async (t) => {
  let cancel!: () => void; const cancelled = new Promise<void>((resolve) => { cancel = resolve; });
  const handle = createFetchHandler({ resources: [{ match: "/", handler: () => new Response(new ReadableStream({ start(controller) { controller.enqueue(encoder.encode("first")); }, cancel() { cancel(); } })) }] });
  const server = await start((handle).engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  const request = nodeRequest(`http://127.0.0.1:${server.port}/`); request.end();
  const [response] = await once(request, "response"); await once(response, "data"); response.destroy();
  await cancelled;
});

test("explicit lifecycle drain remains idempotent", async () => {
  let stops = 0;
  const server = await start((createFetchHandler(application)).engine, { ...{ port: 0, host: "127.0.0.1" }, onStop: () => { stops++; } });
  const shutdown = installGracefulShutdown(server, { signals: [] });
  const first = shutdown.drain(); assert.equal(shutdown.drain(), first); await first;
  assert.equal(stops, 1); assert.equal(shutdown.state.phase, "closed"); shutdown.dispose();
});

test("Node backpressure bounds an unfinished response and disconnect stops production", async (t) => {
  let produced = 0, cancel!: () => void;
  const cancelled = new Promise<void>((resolve) => { cancel = resolve; });
  const handle = createFetchHandler({ resources: [{ match: "/", handler: () => new Response(new ReadableStream({
    pull(controller) { produced++; controller.enqueue(new Uint8Array(64 * 1024)); }, cancel() { cancel(); },
  })) }] });
  const server = await start((handle).engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  const request = nodeRequest(`http://127.0.0.1:${server.port}/`); request.end();
  const [response] = await once(request, "response"); response.pause();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.ok(produced < 256, `unbounded production: ${produced} chunks`);
  response.destroy(); await cancelled;
  const finalCount = produced; await new Promise((resolve) => setTimeout(resolve, 25)); assert.equal(produced, finalCount);
});

test("CORS preflight refusal and credentialed response agree across transports", async (t) => {
  const handle = createFetchHandler({ ...application, cors: { origins: ["https://allowed.test"], credentials: true, methods: ["GET"], headers: ["x-example"], strictPreflight: true } });
  const server = await start((handle).engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  for (const origin of ["https://allowed.test", "https://denied.test"]) {
    const url = `http://127.0.0.1:${server.port}/hello/Ada`;
    const init = { method: "OPTIONS", headers: { origin, "access-control-request-method": "GET", "access-control-request-headers": "x-example" } };
    const direct = await handle(new Request(url, init)); const remote = await fetch(url, init);
    assert.equal(remote.status, direct.status);
    assert.equal(remote.status, origin.includes("allowed") ? 204 : 403);
    for (const name of ["access-control-allow-origin", "access-control-allow-credentials", "access-control-allow-methods", "vary"]) assert.equal(remote.headers.get(name), direct.headers.get(name));
    assert.equal(await remote.text(), await direct.text());
  }
});


test("HTTP/2 uses the shared application through native transport", async (t) => {
  const server = await start((createFetchHandler(application)).engine, { ...{ port: 0, host: "127.0.0.1" }, http2: true }); t.after(() => server.close());
  const client = connectHttp2(`http://127.0.0.1:${server.port}`); t.after(() => client.destroy());
  const stream = client.request({ ":path": "/hello/H2" }); stream.setEncoding("utf8"); stream.end();
  let body = ""; stream.on("data", (chunk) => { body += chunk; });
  const [headers] = await once(stream, "response"); await once(stream, "end");
  assert.equal(headers[":status"], 200); assert.equal(body, "H2");
});

test("native upgrade dispatch remains outside the Fetch pipeline", async (t) => {
  let upgraded = false;
  const server = await start((createFetchHandler(application)).engine, { ...{ port: 0, host: "127.0.0.1" }, upgrades: [{ match: "/socket", handler(_request, socket) {
    upgraded = true; (socket as import("node:net").Socket).end("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: example\r\n\r\n");
  } }] }); t.after(() => server.close());
  const socket = connectSocket(server.port, "127.0.0.1"); t.after(() => socket.destroy());
  await once(socket, "connect"); socket.write("GET /socket HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: example\r\n\r\n");
  const [chunk] = await once(socket, "data"); assert.match(String(chunk), /101 Switching Protocols/); assert.equal(upgraded, true);
});


test("Node transport refuses competing application policy instead of silently ignoring it", async () => {
  await assert.rejects(startServer({ resources: [] } as never, { port: 0 }), /constructed web engine/);
});

for (const transport of ["fetch", "fetch-node", "native-node"] as const) {
  test(`method-disjoint routes, Allow union, and declaration order: ${transport}`, async (t) => {
    const resources = [
      { match: "/same/:id", methods: ["GET"], produces: ["text/plain"], handler: (ctx: { params: Readonly<Record<string, string>> }) => new Response(`read ${ctx.params.id}`, { headers: { "x-handler": "read" } }) },
      { match: "/same/:id", methods: ["POST"], handler: (ctx: { params: Readonly<Record<string, string>> }) => new Response(`write ${ctx.params.id}`, { headers: { "x-handler": "write" } }) },
      { match: "/same/:id", methods: ["GET"], produces: ["application/json"], handler: () => new Response("shadowed") },
      { match: "/ordered/:id", methods: ["GET"], handler: () => new Response("first pattern") },
      { match: "/ordered/exact", methods: ["GET"], handler: () => new Response("later exact") },
      { match: "/fallback/:id", methods: ["GET"], handler: () => new Response("first method") },
      { match: /^\/fallback\//, handler: () => new Response("fallback method") },
    ];
    const handle = createFetchHandler({ resources });
    const server = transport === "fetch" ? null : await start(handle.engine, { port: 0, host: "127.0.0.1" });
    if (server) t.after(() => server.close());
    const origin = server ? `http://127.0.0.1:${server.port}` : "https://example.test";
    const receive = (path: string, init?: RequestInit) => server ? fetch(origin + path, init) : handle(new Request(origin + path, init));
    for (const method of ["GET", "HEAD", "POST", "OPTIONS", "PUT"]) {
      const response = await receive("/same/Ada", { method });
      assert.equal(response.status, method === "PUT" ? 405 : method === "OPTIONS" ? 204 : 200, method);
      if (method === "PUT" || method === "OPTIONS") assert.deepEqual(new Set(response.headers.get("allow")!.split(/,\s*/)), new Set(["GET", "HEAD", "POST", "OPTIONS"]));
      else {
        assert.equal(response.headers.get("x-handler"), method === "POST" ? "write" : "read");
        assert.equal(await response.text(), method === "HEAD" ? "" : method === "POST" ? "write Ada" : "read Ada");
      }
      if (method === "PUT" || method === "OPTIONS") await response.arrayBuffer();
    }
    const negotiation = await receive("/same/Ada", { headers: { accept: "application/json" } });
    assert.equal(negotiation.status, 406); await negotiation.arrayBuffer();
    assert.equal(await (await receive("/ordered/exact")).text(), "first pattern");
    assert.equal(await (await receive("/fallback/Ada", { method: "POST" })).text(), "fallback method");
    const missing = await receive("/missing", { method: "OPTIONS" }); assert.equal(missing.status, 404); await missing.arrayBuffer();
  });
}

test("cancelling an oversized incoming upload preserves its HTTP refusal", async (t) => {
  let abortedByCancellation = false;
  const handle = createFetchHandler({ resources: [{ match: "/", methods: ["POST"], handler: async (ctx) => {
    const reader = ctx.request.body!.getReader();
    const first = await reader.read(); assert.ok(first.value!.byteLength > 1024);
    await reader.cancel("body limit");
    abortedByCancellation = ctx.signal.aborted;
    return Response.json({ error: "too large" }, { status: 413 });
  } }] });
  const server = await start((handle).engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  const request = nodeRequest(`http://127.0.0.1:${server.port}/`, { method: "POST" });
  // Keep the upload unfinished: a response cannot depend on draining it first.
  request.write(new Uint8Array(2048));
  const [response] = await once(request, "response");
  let body = ""; response.setEncoding("utf8"); response.on("data", (chunk: string) => { body += chunk; });
  await once(response, "end");
  assert.equal(response.statusCode, 413); assert.equal(response.headers.connection, "close");
  assert.deepEqual(JSON.parse(body), { error: "too large" }); assert.equal(abortedByCancellation, false);
  request.destroy();
});
test("a real client abort still terminates a pending incoming body read", async (t) => {
  let observe!: () => void, seen!: () => void;
  const observed = new Promise<void>((resolve) => { observe = resolve; });
  const received = new Promise<void>((resolve) => { seen = resolve; });
  const handle = createFetchHandler({ resources: [{ match: "/", methods: ["POST"], handler: async (ctx) => {
    const reader = ctx.request.body!.getReader();
    await reader.read(); seen();
    try { await reader.read(); } catch { assert.equal(ctx.signal.aborted, true); observe(); }
    return new Response(null, { status: 204 });
  } }] });
  const server = await start((handle).engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
  const request = nodeRequest(`http://127.0.0.1:${server.port}/`, { method: "POST" }); request.on("error", () => {});
  request.write("first"); await received; request.destroy(); await observed;
});

test("HTTP/2 refusal closes only the unfinished upload after delivering its response", { timeout: 3000 }, async (t) => {
  const handle = createFetchHandler({ resources: [
    { match: "/", methods: ["POST"], handler: async (ctx) => { const reader = ctx.request.body!.getReader(); await reader.read(); await reader.cancel("limit"); return new Response("too large", { status: 413 }); } },
    { match: "/sibling", methods: ["GET"], handler: () => new Response("still available") },
  ] });
  const server = await start((handle).engine, { ...{ port: 0, host: "127.0.0.1" }, http2: true }); t.after(() => server.close());
  const client = connectHttp2(`http://127.0.0.1:${server.port}`); t.after(() => client.destroy());
  const upload = client.request({ ":path": "/", ":method": "POST" }); upload.setEncoding("utf8");
  const closed = once(upload, "close"); let body = ""; upload.on("data", (chunk) => { body += chunk; });
  upload.write(new Uint8Array(2048)); const [headers] = await once(upload, "response");
  await closed; assert.equal(headers[":status"], 413); assert.equal(body, "too large");
  const sibling = client.request({ ":path": "/sibling" }); sibling.setEncoding("utf8"); sibling.end();
  let other = ""; sibling.on("data", (chunk) => { other += chunk; }); await once(sibling, "end");
  assert.equal(other, "still available");
});

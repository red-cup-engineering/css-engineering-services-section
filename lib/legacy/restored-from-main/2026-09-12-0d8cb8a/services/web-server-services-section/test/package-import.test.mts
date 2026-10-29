import assert from "node:assert/strict";
import test from "node:test";
import { createWebServerEngine, createWebApplicationEngine, createWebPlatformEngine } from "../src/index.mts";
import { startWebServer } from "../src/node.mts";

test("server/application/platform specialize the same HTTP contract", async (t) => {
  for (const engine of [
    createWebServerEngine({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] }),
    createWebApplicationEngine({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] }),
    createWebPlatformEngine({ application: { resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] } }),
  ]) {
    const server = await startWebServer(engine, { port: 0, host: "127.0.0.1" }); t.after(() => server.close());
    for (const method of ["GET", "HEAD", "OPTIONS", "POST"]) {
      const url = `http://127.0.0.1:${server.port}/value`;
      const direct = await engine.fetch(new Request(url, { method })); const remote = await fetch(url, { method });
      assert.equal(remote.status, direct.status); assert.equal(remote.headers.get("allow"), direct.headers.get("allow"));
      assert.equal(await remote.text(), await direct.text());
    }
    if ("close" in engine) await engine.close();
  }
});
test("application input is bounded, memoized and shared across representations", async () => {
  const engine = createWebApplicationEngine({ body: { maxBytes: 100 }, resources: [{ match: "/input", methods: ["POST"], body: { maxBytes: 30 }, handler: async (ctx) => {
    const first = await ctx.input.json(); const second = await ctx.input.json(); assert.equal(first, second);
    return Response.json({ json: first, text: await ctx.input.text(), count: (await ctx.input.bytes()).length });
  } }] });
  const receive = (body: string, type = "application/json") => engine.fetch(new Request("https://example.test/input", { method: "POST", headers: { "content-type": type }, body }));
  const good = await receive('{"value":1}'); assert.equal(good.status, 200); assert.deepEqual((await good.json()).json, { value: 1 });
  assert.equal((await receive("x".repeat(31))).status, 413);
  assert.equal((await receive("{")).status, 400);
  assert.equal((await receive("{}", "text/plain")).status, 415);
});
test("application schema admission and OpenAPI come from the same resource", async () => {
  let actions = 0;
  const engine = createWebApplicationEngine({ resources: [{ match: "/values/:id", methods: ["POST"], validation: { body: { type: "object", required: ["value"], properties: { value: { type: "number" } } } }, openapi: { summary: "Store value" }, handler: async (ctx) => { actions++; return Response.json(await ctx.input.json()); } }] });
  const receive = (body: string) => engine.fetch(new Request("https://example.test/values/one", { method: "POST", headers: { "content-type": "application/json" }, body }));
  assert.equal((await receive("{}")).status, 400); assert.equal(actions, 0);
  assert.equal((await receive('{"value":1}')).status, 200); assert.equal(actions, 1);
  const paths = engine.openapi().paths as Record<string, Record<string, { requestBody: unknown }>>;
  assert.ok(paths["/values/{id}"]!.post!.requestBody);
});
test("application modules compose without another request dispatcher", async () => {
  const engine = createWebApplicationEngine({ applications: [{ resources: [{ match: "/same", methods: ["GET"], handler: () => new Response("read") }] }, { resources: [{ match: "/same", methods: ["POST"], handler: () => new Response("write") }] }] });
  assert.equal(await (await engine.fetch(new Request("https://example.test/same", { method: "POST" }))).text(), "write");
  assert.throws(() => createWebApplicationEngine({ applications: [{ cacheControl: "no-store" }, { cacheControl: "public" }] }), /explicit cacheControl/);
});
test("platform provider activation is shared, effects are visible, and release is ordered", async () => {
  const events: string[] = [];
  const engine = createWebPlatformEngine({ providers: [
    { name: "storage", start: () => { events.push("storage+"); return new Map([["value", 7]]); }, close: () => { events.push("storage-"); } },
    { name: "clock", start: () => { events.push("clock+"); return () => 123; }, close: () => { events.push("clock-"); } },
  ], application: { resources: [{ match: "/", handler: (ctx) => Response.json({ value: (ctx.capabilities.storage as Map<string, number>).get("value"), time: (ctx.capabilities.clock as () => number)() }) }] } });
  assert.deepEqual(events, []);
  const responses = await Promise.all([engine.fetch(new Request("https://example.test")), engine.fetch(new Request("https://example.test"))]);
  assert.deepEqual(await responses[0]!.json(), { value: 7, time: 123 }); assert.deepEqual(events, ["storage+", "clock+"]);
  await responses[1]!.arrayBuffer(); await engine.close(); await engine.close(); assert.deepEqual(events, ["storage+", "clock+", "clock-", "storage-"]);
  const closed = await engine.fetch(new Request("https://example.test", { method: "HEAD" })); assert.equal(closed.status, 503); assert.equal(closed.body, null);
});
test("platform startup failure releases earlier capabilities and refuses through the same pipeline", async () => {
  let released = 0, actions = 0;
  const engine = createWebPlatformEngine({ providers: [{ name: "storage", start: () => new Map(), close: () => { released++; } }, { name: "unavailable", start: () => { throw new Error("private provider details"); } }], application: { resources: [{ match: "/", handler: () => { actions++; return new Response("bad"); } }] } });
  const response = await engine.fetch(new Request("https://example.test")); assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private/); assert.equal(released, 1); assert.equal(actions, 0); await engine.close(); assert.equal(released, 1);
});

test("hooks and resources share one intake while resource encoded/decoded limits still refuse", async () => {
  const { gzipSync } = await import("node:zlib");
  for (const mode of ["same", "decoded", "encoded"]) {
    let actions = 0; let pulls = 0;
    const body = new TextEncoder().encode(JSON.stringify({ value: "x".repeat(40) }));
    const encoded = new Uint8Array(gzipSync(body));
    const engine = createWebApplicationEngine({ body: { maxBytes: 200 },
      onRequest: async (ctx) => { ctx.locals.parsed = await ctx.input.json(); },
      resources: [{ match: "/", methods: ["POST"], body: mode === "decoded" ? { maxBytes: 30 } : mode === "encoded" ? { maxEncodedBytes: 10 } : {},
        handler: async (ctx) => { actions++; return Response.json({ original: ctx.locals.parsed, again: await ctx.input.json() }); } }],
    });
    const stream = new ReadableStream({ pull(controller) { pulls++; controller.enqueue(encoded); controller.close(); } });
    const response = await engine.fetch(new Request("https://example.test/", { method: "POST", headers: { "content-type": "application/json", "content-encoding": "gzip" }, body: stream, duplex: "half" } as RequestInit));
    assert.equal(pulls, 1);
    assert.equal(response.status, mode === "same" ? 200 : 413);
    assert.equal(actions, mode === "same" ? 1 : 0);
    if (mode === "same") { const value = await response.json(); assert.deepEqual(value.original, value.again); }
  }
});

test("closing during provider startup prevents an admitted action and releases once", async () => {
  let ready!: () => void, entered!: () => void;
  const starting = new Promise<void>((resolve) => { entered = resolve; });
  const pending = new Promise<void>((resolve) => { ready = resolve; });
  let releases = 0, actions = 0;
  const engine = createWebPlatformEngine({ providers: [{ name: "resource", start: async () => { entered(); await pending; return {}; }, close: () => { releases++; } }],
    application: { resources: [{ match: "/", handler: () => { actions++; return new Response("value"); } }] },
  });
  const request = engine.fetch(new Request("https://example.test/"));
  await starting; const closing = engine.close(); ready();
  assert.equal((await request).status, 503); await closing;
  assert.equal(actions, 0); assert.equal(releases, 1);
});
test("Node lifecycle starts and releases platform capabilities around its listener", async () => {
  let starts = 0, closes = 0;
  const engine = createWebPlatformEngine({ providers: [{ name: "resource", start: () => { starts++; return {}; }, close: () => { closes++; } }], application: {} });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.1" });
  assert.equal(starts, 1); await server.close(); assert.equal(closes, 1);
});

test("a hostless Node listener defaults to an IPv4 binding", async (t) => {
  const engine = createWebServerEngine({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] });
  const server = await startWebServer(engine, 0);
  t.after(() => server.close());
  assert.deepEqual(server.address, { address: "0.0.0.0", family: "IPv4", port: server.port });
});

test("a Node listener preserves explicit IPv4 and IPv6 bindings", async (t) => {
  for (const [host, origin] of [["127.0.0.1", "http://127.0.0.1"], ["::1", "http://[::1]"]] as const) {
    const engine = createWebServerEngine({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] });
    const server = await startWebServer(engine, { port: 0, host });
    t.after(() => server.close());
    const response = await fetch(`${origin}:${server.port}/value`);
    assert.deepEqual(await response.json(), { value: 1 });
  }
});

test("a listener preserves an explicit address without requiring a self-connection", async (t) => {
  const engine = createWebServerEngine({ resources: [] });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.2" });
  t.after(() => server.close());
  assert.deepEqual(server.address, { address: "127.0.0.2", family: "IPv4", port: server.port });
});

test("platform shutdown waits for active response stream completion or cancellation", async () => {
  for (const terminal of ["end", "cancel", "abort"]) {
    let closes = 0; let controller!: ReadableStreamDefaultController<Uint8Array>;
    const engine = createWebPlatformEngine({ providers: [{ name: "stream", start: () => ({}), close: () => { closes++; } }], application: {
      resources: [{ match: "/", handler: () => new Response(new ReadableStream<Uint8Array>({ start(value) { controller = value; value.enqueue(new Uint8Array([1])); } })) }],
    } });
    const abort = new AbortController();
    const response = await engine.fetch(new Request("https://example.test/", { signal: abort.signal }));
    const reader = response.body!.getReader(); await reader.read();
    const closing = engine.close(); await Promise.resolve(); assert.equal(closes, 0);
    if (terminal === "end") { controller.close(); await reader.read(); }
    else if (terminal === "cancel") await reader.cancel();
    else { abort.abort(); await assert.rejects(reader.read()); }
    await closing; assert.equal(closes, 1);
  }
});

test("provider release waits for asynchronous stream cancellation cleanup", async () => {
  for (const terminal of ["cancel", "abort", "HEAD"]) {
    const events: string[] = [];
    let finish!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const cancelling = new Promise<void>((resolve) => { entered = resolve; });
    const engine = createWebPlatformEngine({ providers: [{ name: "connection", start: () => ({}), close: () => { events.push("release"); } }], application: {
      resources: [{ match: "/", handler: () => new Response(new ReadableStream<Uint8Array>({ async cancel() { events.push("cancel-start"); entered(); await gate; events.push("cancel-end"); } })) }],
    } });
    const abort = new AbortController();
    const fetching = engine.fetch(new Request("https://example.test/", { method: terminal === "HEAD" ? "HEAD" : "GET", signal: abort.signal }));
    let cancellation: Promise<unknown> | undefined;
    if (terminal !== "HEAD") { const response = await fetching; if (terminal === "cancel") cancellation = response.body!.cancel(); else abort.abort(); }
    await cancelling; const closing = engine.close(); await Promise.resolve();
    assert.deepEqual(events, ["cancel-start"]); finish();
    await Promise.all([fetching, cancellation, closing]);
    assert.deepEqual(events, ["cancel-start", "cancel-end", "release"]);
  }
});
test("completion-hook failure always leaves a terminal response", async () => {
  for (const terminal of ["end", "cancel", "HEAD"]) {
    const engine = createWebServerEngine({ onComplete: () => { throw new Error("completion failed"); }, resources: [{ match: "/", handler: () => new Response("value") }] });
    const fetching = engine.fetch(new Request("https://example.test/", { method: terminal === "HEAD" ? "HEAD" : "GET" }));
    if (terminal === "HEAD") await assert.rejects(fetching, /completion failed/);
    else { const response = await fetching; await assert.rejects(terminal === "end" ? response.text() : response.body!.cancel(), /completion failed/); }
  }
});

test("Node startup failure releases acquired capabilities", async () => {
  let closes = 0;
  const engine = createWebPlatformEngine({ providers: [{ name: "resource", start: () => ({}), close: () => { closes++; } }], application: {} });
  await assert.rejects(startWebServer(engine, { port: 0, tls: { key: "invalid private key", cert: "invalid certificate" } }));
  assert.equal(closes, 1);
});
test("a throwing Node stop hook cannot release capabilities before transport drain", async (t) => {
  let controller!: ReadableStreamDefaultController<Uint8Array>, closes = 0;
  const engine = createWebPlatformEngine({ providers: [{ name: "resource", start: () => ({}), close: () => { closes++; } }], application: { resources: [{ match: "/", handler: () => new Response(new ReadableStream<Uint8Array>({ start(value) { controller = value; value.enqueue(new Uint8Array([1])); } })) }] } });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.1", onStop: () => { throw new Error("stop failed"); } });
  t.after(() => server.close().catch(() => {}));
  await new Promise((resolve) => setTimeout(resolve, 150));
  const response = await fetch(`http://127.0.0.1:${server.port}/`); const reader = response.body!.getReader(); await reader.read();
  const stopped = assert.rejects(server.close(), /shutdown failed/); await Promise.resolve(); assert.equal(closes, 0);
  controller.close(); await reader.read(); await stopped; assert.equal(closes, 1);
});
test("platform providers precede child hooks and all completion hooks run after a child failure", async () => {
  let closes = 0;
  const engine = createWebPlatformEngine({ providers: [{ name: "resource", start: () => 7, close: () => { closes++; } }], application: { applications: [{ onRequest: (ctx) => { assert.equal(ctx.capabilities.resource, 7); }, onComplete: () => { throw new Error("child completion"); }, resources: [{ match: "/", handler: () => new Response("value") }] }] } });
  const response = await engine.fetch(new Request("https://example.test/"));
  await assert.rejects(response.text(), /completion failed/); await engine.close(); assert.equal(closes, 1);
});

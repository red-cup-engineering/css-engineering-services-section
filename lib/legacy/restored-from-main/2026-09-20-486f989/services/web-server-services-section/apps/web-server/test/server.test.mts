import assert from "node:assert/strict";
import test from "node:test";
import { createWebServer } from "../src/index.mts";
import { createNodeServer, startWebServer } from "../src/node.mts";

test("a compiled web server carries its specification and one fetch handler", async () => {
  const server = createWebServer({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] });
  assert.equal(typeof server.fetch, "function");
  assert.equal(server.specification.resources?.length, 1);
  const response = await server.fetch(new Request("https://example.test/value"));
  assert.deepEqual(await response.json(), { value: 1 });
  assert.equal((await server.fetch(new Request("https://example.test/value", { method: "POST" }))).status, 405);
  assert.equal((await server.fetch(new Request("https://example.test/missing"))).status, 404);
});

test("a hostless Node listener defaults to an IPv4 binding", async (t) => {
  const engine = createWebServer({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] });
  const server = await startWebServer(engine, 0);
  t.after(() => server.close());
  assert.deepEqual(server.address, { address: "0.0.0.0", family: "IPv4", port: server.port });
});

test("a listener preserves an explicit address without requiring a self-connection", async (t) => {
  const engine = createWebServer({ resources: [] });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.2" });
  t.after(() => server.close());
  assert.deepEqual(server.address, { address: "127.0.0.2", family: "IPv4", port: server.port });
});

test("the Node transport agrees with the direct Fetch handler", async (t) => {
  const engine = createWebServer({ resources: [{ match: "/value", methods: ["GET"], handler: () => Response.json({ value: 1 }) }] });
  const server = await startWebServer(engine, { port: 0, host: "127.0.0.1" });
  t.after(() => server.close());
  // This WSL receiver exposes a new ephemeral listener asynchronously to local clients.
  await new Promise((resolve) => setTimeout(resolve, 150));
  for (const method of ["GET", "HEAD", "OPTIONS", "POST"]) {
    const url = `http://127.0.0.1:${server.port}/value`;
    const direct = await engine.fetch(new Request(url, { method }));
    const remote = await fetch(url, { method });
    assert.equal(remote.status, direct.status);
    assert.equal(remote.headers.get("allow"), direct.headers.get("allow"));
    assert.equal(await remote.text(), await direct.text());
  }
});

test("createNodeServer builds a managed server that is not yet listening", () => {
  const managed = createNodeServer(createWebServer({ resources: [] }));
  assert.equal(typeof managed.closeGracefully, "function");
  assert.equal(managed.address(), null);
});

test("completion-hook failure always leaves a terminal response", async () => {
  for (const terminal of ["end", "cancel", "HEAD"]) {
    const engine = createWebServer({ onComplete: () => { throw new Error("completion failed"); }, resources: [{ match: "/", handler: () => new Response("value") }] });
    const fetching = engine.fetch(new Request("https://example.test/", { method: terminal === "HEAD" ? "HEAD" : "GET" }));
    if (terminal === "HEAD") await assert.rejects(fetching, /completion failed/);
    else { const response = await fetching; await assert.rejects(terminal === "end" ? response.text() : response.body!.cancel(), /completion failed/); }
  }
});

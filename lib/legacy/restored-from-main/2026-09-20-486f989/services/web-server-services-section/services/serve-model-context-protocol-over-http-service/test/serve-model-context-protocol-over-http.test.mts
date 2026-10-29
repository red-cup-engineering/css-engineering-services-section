import assert from "node:assert/strict";
import test from "node:test";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID, collectTypeSystem, defineType } from "@red-cup-engineering/computer-data-engine";
import { createComputerPlatform, type ComputerPlatform } from "@red-cup-engineering/computer-platform";
import { declareCapabilityOperation, type Operation } from "@red-cup-engineering/computer-platform/operations";
import type { WebApplicationContext } from "@red-cup-engineering/http-server-application-contract-service/web";
import { mcpResource, mcpToolsOfOperations } from "../src/serve-model-context-protocol-over-http.mts";

type Rpc = { jsonrpc: "2.0"; id: number; method: string; params?: unknown };

function context(request: Request, extra: Partial<WebApplicationContext> = {}): WebApplicationContext {
  return {
    request, url: new URL(request.url), params: {}, locals: {}, capabilities: {}, nonce: "n", signal: new AbortController().signal,
    trace: { kind: "web-server.request-trace", id: "test", entries: [] }, responseHeaders: new Headers(), startedAt: 0,
    input: { bytes: async () => new Uint8Array(await request.clone().arrayBuffer()), text: () => request.clone().text(), json: () => request.clone().json(), formData: () => request.clone().formData() },
    ...extra,
  } as unknown as WebApplicationContext;
}

function post(body: Rpc, headers: Record<string, string> = {}, path = "/mcp"): Request {
  return new Request(`https://assist.test${path}`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json", ...headers }, body: JSON.stringify(body) });
}

const text = defineType({ id: "test:text", name: "Text", description: "Text.", parents: [], schema: { type: "object", required: ["value"], properties: { value: { type: "string" } }, additionalProperties: false } });
const upper = defineType({ id: "test:upper", name: "Upper", description: "Uppercased text.", parents: [], schema: { type: "object", required: ["value"], properties: { value: { type: "string", pattern: "^[A-Z]*$" } } } });
assert.ok(text.ok && upper.ok);
const uppercase = declareCapabilityOperation({ id: "uppercase", description: "Uppercases text.", domain: text.value, codomain: upper.value, effects: ["compute"], capability: "uppercase" });
const refusing = declareCapabilityOperation({ id: "refusing", description: "Always refuses.", domain: text.value, codomain: upper.value, effects: ["compute"], capability: "refusing" });
assert.ok(uppercase.ok && refusing.ok);
const operations: readonly Operation[] = [uppercase.value, refusing.value];

async function startedPlatform(): Promise<ComputerPlatform> {
  const platform = createComputerPlatform({
    id: "test",
    operations,
    providers: [
      { name: "uppercase", start: () => (input: unknown) => ({ value: String((input as { value: string }).value).toUpperCase() }) },
      { name: "refusing", start: () => () => { throw Object.assign(new Error("scope esi-wallet is missing"), { code: "missing_scope" }); } },
    ],
  });
  await platform.start();
  return platform;
}

test("forms one MCP resource; stateless retrieval is refused and unsupported protocol versions are refused before reading a body", async () => {
  const resource = mcpResource({ serverInfo: { name: "test", version: "1" }, tools: [], dispatch: () => undefined });
  assert.equal(resource.match, "/mcp");
  assert.deepEqual(resource.methods, ["GET", "HEAD", "POST", "DELETE"]);
  const retrieval = await resource.handler(context(new Request("https://assist.test/mcp")));
  assert.equal(retrieval.status, 405);
  assert.equal(retrieval.headers.get("allow"), "POST");
  const version = await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "initialize" }, { "mcp-protocol-version": "1900-01-01" })));
  assert.equal(version.status, 400);
  const custom = mcpResource({ path: "/assist/mcp", serverInfo: { name: "test", version: "1" }, tools: [], dispatch: () => undefined });
  assert.equal(custom.match, "/assist/mcp");
  assert.throws(() => mcpResource({ serverInfo: { name: "test", version: "1" }, tools: [] }), /requires dispatch/u);
});

test("serves the SDK lifecycle statelessly over a native tool catalog, admitting arguments before dispatch", async () => {
  let calls = 0;
  const resource = mcpResource({
    serverInfo: { name: "native", version: "1" },
    tools: [{ name: "double", inputSchema: { type: "object", required: ["value"], properties: { value: { type: "integer" } }, additionalProperties: false } }],
    dispatch: (_name, args) => { calls += 1; return { value: Number(args.value) * 2 }; },
  });
  const initialized = await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })));
  assert.equal(initialized.status, 200);
  assert.equal(initialized.headers.get("mcp-session-id"), null);
  assert.equal(((await initialized.json()) as { result: { serverInfo: { name: string } } }).result.serverInfo.name, "native");
  const listed = await resource.handler(context(post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })));
  const list = (await listed.json()) as { result: { tools: readonly { name: string; inputSchema: { properties: { value: { type: string } } } }[] } };
  assert.equal(list.result.tools[0]?.inputSchema.properties.value.type, "integer");
  const invalid = await resource.handler(context(post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "double", arguments: { value: "bad" } } })));
  assert.match(((await invalid.json()) as { error: { message: string } }).error.message, /arguments outside inputSchema/u);
  assert.equal(calls, 0);
  const called = await resource.handler(context(post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "double", arguments: { value: 21 } } })));
  assert.deepEqual(JSON.parse(((await called.json()) as { result: { content: { text: string }[] } }).result.content[0]!.text), { value: 42 });
  assert.equal(calls, 1);
});

test("typed operations are the catalog: projected by id, description, domain and codomain, and executed by the request's platform", async () => {
  const tools = mcpToolsOfOperations(operations);
  assert.deepEqual(tools.map((tool) => tool.name), ["uppercase", "refusing"]);
  assert.equal(tools[0]?.description, "Uppercases text.");
  assert.equal((tools[0]?.inputSchema as { required: string[] }).required[0], "value");
  assert.equal((tools[0]?.outputSchema as { properties: { value: { pattern: string } } }).properties.value.pattern, "^[A-Z]*$");
  const platform = await startedPlatform();
  const resource = mcpResource({ serverInfo: { name: "typed", version: "1" }, operations });
  const ctx = (body: Rpc) => context(post(body), { platform, capabilities: platform.capabilities() });
  const listed = (await (await resource.handler(ctx({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }))).json()) as { result: { tools: readonly { name: string }[] } };
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["uppercase", "refusing"]);
  const called = (await (await resource.handler(ctx({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "uppercase", arguments: { value: "hello" } } }))).json()) as { result: { structuredContent: unknown; isError?: boolean } };
  assert.deepEqual(called.result.structuredContent, { value: "HELLO" });
  assert.equal(called.result.isError, undefined);
  const refused = (await (await resource.handler(ctx({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "refusing", arguments: { value: "x" } } }))).json()) as { result: { content: { text: string }[]; isError?: boolean } };
  assert.equal(refused.result.isError, true);
  assert.match(refused.result.content[0]!.text, /^missing_scope: scope esi-wallet is missing$/u);
  const noPlatform = (await (await resource.handler(context(post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "uppercase", arguments: { value: "x" } } })))).json()) as { result: { content: { text: string }[]; isError?: boolean } };
  assert.equal(noPlatform.result.isError, true);
  assert.match(noPlatform.result.content[0]!.text, /HostUnavailable/u);
  await platform.close();
});

test("bearer authentication resolves the principal every dispatch sees, and refuses with a challenge otherwise", async () => {
  const seen: unknown[] = [];
  const resource = mcpResource<{ id: number }>({
    serverInfo: { name: "auth", version: "1" },
    tools: [{ name: "whoami", inputSchema: { type: "object", properties: {} } }],
    dispatch: (_name, _args, meta) => { seen.push(meta.principal); return { principal: meta.principal, bearer: meta.bearer }; },
    auth: { verify: (bearer) => (bearer === "good" ? { id: 7 } : undefined), realm: "assist", resourceMetadataUrl: "https://assist.test/.well-known/oauth-protected-resource" },
  });
  const call = (headers: Record<string, string>) => resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "whoami", arguments: {} } }, headers)));
  const missing = await call({});
  assert.equal(missing.status, 401);
  assert.match(missing.headers.get("www-authenticate") ?? "", /Bearer .*realm="assist"/u);
  assert.equal((await call({ authorization: "Bearer bad" })).status, 401);
  const accepted = await call({ authorization: "Bearer good" });
  assert.equal(accepted.status, 200);
  assert.deepEqual(JSON.parse(((await accepted.json()) as { result: { content: { text: string }[] } }).result.content[0]!.text), { principal: { id: 7 }, bearer: "good" });
  assert.deepEqual(seen, [{ id: 7 }]);
  const loopback = mcpResource({ serverInfo: { name: "auth", version: "1" }, tools: [], dispatch: () => undefined, auth: { verify: () => undefined, loopbackBypass: true } });
  const local = await loopback.handler(context(post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }), { remoteAddress: "127.0.0.1" }));
  assert.equal(local.status, 200);
});

test("origin policy admits same-origin and configured origins only", async () => {
  const resource = mcpResource({ serverInfo: { name: "origin", version: "1" }, tools: [], dispatch: () => undefined, allowedOrigins: ["https://client.test"] });
  const call = (origin: string) => resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }, { origin })));
  assert.equal((await call("https://assist.test")).status, 200);
  assert.equal((await call("https://client.test")).status, 200);
  assert.equal((await call("https://evil.test")).status, 403);
  assert.equal((await call("not a url")).status, 403);
});

test("session transport keeps one server per mcp-session-id for a long-lived process", async () => {
  const resource = mcpResource({ serverInfo: { name: "sessions", version: "1" }, tools: [], dispatch: () => undefined, sessions: true });
  const initialized = await resource.handler(context(post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })));
  const sessionId = initialized.headers.get("mcp-session-id");
  assert.ok(sessionId, await initialized.text());
  const listed = await resource.handler(context(post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, { "mcp-session-id": sessionId, "mcp-protocol-version": "2025-06-18" })));
  assert.equal(listed.status, 200);
  assert.deepEqual(((await listed.json()) as { result: { tools: unknown[] } }).result.tools, []);
  const unknown = await resource.handler(context(post({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }, { "mcp-session-id": "nope" })));
  assert.equal(unknown.status, 404);
});


test("authenticated platform binding is the dispatch owner and closes after the response", async () => {
  const opened: ComputerPlatform[] = [];
  const resource = mcpResource<string>({
    serverInfo: { name: "bound", version: "1" }, operations,
    auth: { verify: (bearer) => bearer === "allowed" ? "receiver" : undefined },
    platform: async (meta) => {
      assert.equal(meta.principal, "receiver");
      const platform = await startedPlatform(); opened.push(platform); return platform;
    },
  });
  const request: Rpc = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uppercase", arguments: { value: "bound" } } };
  assert.equal((await resource.handler(context(post(request)))).status, 401);
  assert.equal(opened.length, 0);
  const response = await resource.handler(context(post(request, { authorization: "Bearer allowed" })));
  const body = await response.json() as { result: { structuredContent: unknown } };
  assert.deepEqual(body.result.structuredContent, { value: "BOUND" });
  assert.equal(opened.length, 1);
  assert.equal(opened[0]!.closed(), true);
});

import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actions } from "@red-cup-engineering/relating/actions";

import { actionMcpHandle } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";
import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";
import { operationsManifoldUri } from "@red-cup-engineering/computer-system-engine/rpc/manifold";
import { actionOpenApi, mcpToolNameForIdentity } from "@red-cup-engineering/computer-system-engine/rpc/apex";
import { resolveJsonPointer } from "@red-cup-engineering/json-services-section/resolve-json-pointer";

function referencesOf(value) {
  if (Array.isArray(value)) return value.flatMap(referencesOf);
  if (typeof value !== "object" || value === null) return [];
  return [
    ...(typeof value.$ref === "string" ? [value.$ref] : []),
    ...Object.entries(value)
      .filter(([key]) => !["const", "default", "enum", "examples"].includes(key))
      .flatMap(([, item]) => referencesOf(item)),
  ];
}

describe("generated action-apex projections", () => {
  const induced = induceSurface(actions, { packageName: "@red-cup-engineering/relating" });

  it("resolves empty and URI JSON Pointer fragments", async () => {
    const document = { nested: { "a/b": { "~key": "kept" } } };
    assert.strictEqual(resolveJsonPointer(document, ""), document);
    assert.strictEqual(resolveJsonPointer(document, "#"), document);
    assert.equal(resolveJsonPointer(document, "#/nested/a~1b/~0key"), "kept");
    assert.equal(resolveJsonPointer(document, "#/nested/a%7E1b/%7E0key"), "kept");
    assert.equal(resolveJsonPointer(document, "#/nested/missing"), undefined);
  });

  it("generates OpenAPI without opening a port", async () => {
    const openapi = actionOpenApi(induced);
    assert.equal(openapi.openapi, "3.1.1");
    assert.equal(Object.keys(openapi.paths).length, actions.length);
    assert.ok(openapi.paths["/settle"]);
  });

  it("generates MCP tools and the operations-manifold resource from the same apex", async () => {
    const tools = await actionMcpHandle(induced, { jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
    assert.equal(tools.result.tools.length, actions.length);

    const uri = operationsManifoldUri("@red-cup-engineering/relating");
    const resources = await actionMcpHandle(induced, { jsonrpc: "2.0", id: 2, method: "resources/list" }, {});
    assert.ok(resources.result.resources.some((resource) => resource.uri === uri));

    const read = await actionMcpHandle(induced, { jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri } }, {});
    const manifold = JSON.parse(read.result.contents[0].text);
    assert.equal(manifold.kind, "operations-manifold");
    assert.ok(manifold.extrema.edges.some((edge) => edge.from === "utter" && edge.to === "articulate"));
  });

  it("projects recursive carrier schemas locally and returns typed MCP output in an object envelope", async () => {
    const nested = schemaFrom({
      $id: "relating/test/mcp-schema/nested",
      type: "object",
      required: ["value"],
      properties: { value: { type: "string" }, next: { $ref: "#" } },
    });
    const fragment = schemaFrom({
      $id: "relating/test/mcp-schema/fragment",
      $defs: { value: { type: "string" } },
      type: "object",
    });
    const input = schemaFrom({
      $id: "relating/test/mcp-schema/input",
      type: "object",
      required: ["payload", "$id", "external"],
      $defs: { literalData: { const: { $ref: "literal-data" } } },
      properties: {
        payload: { $ref: nested.id },
        $id: { type: "string" },
        external: { $ref: `${fragment.id}#/$defs/value` },
      },
    });
    const output = schemaFrom({
      $id: "relating/test/mcp-schema/output",
      type: "array",
      items: { $ref: nested.id },
    });
    const echo = operation({
      verb: "mcp-schema-echo",
      domain: input,
      codomain: output,
      run: (value) => [value.payload],
    });
    const apex = induceSurface([echo], { packageName: "@red-cup-engineering/relating-test" });
    const listed = await actionMcpHandle(apex, { jsonrpc: "2.0", id: 4, method: "tools/list" }, {});
    const tool = listed.result.tools[0];

    assert.ok(referencesOf(tool.inputSchema).every((reference) => reference.startsWith("#")));
    assert.ok(referencesOf(tool.outputSchema).every((reference) => reference.startsWith("#")));
    const inputDefinition = tool.inputSchema.$defs[input.id];
    assert.deepEqual(inputDefinition.$defs.literalData.const, { $ref: "literal-data" });
    assert.ok(Object.hasOwn(inputDefinition.properties, "$id"));
    assert.equal(inputDefinition.properties.external.$ref, "#/$defs/relating~1test~1mcp-schema~1fragment/$defs/value");
    const admittedInput = schemaFrom({ $id: "relating/test/mcp-schema/admitted-input", ...tool.inputSchema });
    const admittedOutput = schemaFrom({ $id: "relating/test/mcp-schema/admitted-output", ...tool.outputSchema });
    const value = {
      payload: { value: "kept", next: { value: "recursive" } },
      $id: "retained-data-key",
      external: "fragment-value",
    };
    admittedInput.assert({ input: value });
    admittedOutput.assert({ output: [value.payload] });
    assert.throws(() => admittedOutput.assert([value.payload]));

    const cli = apex.dispatch([echo.verb], JSON.stringify(value));
    assert.equal(cli.code, 0);
    const mcp = await actionMcpHandle(apex, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: echo.verb, arguments: { input: value } },
    }, {});
    const direct = echo.execute(value, {});
    assert.deepEqual(JSON.parse(cli.stdout), direct);
    assert.equal(mcp.result.content[0].text, cli.stdout.trim());
    assert.deepEqual(mcp.result.structuredContent, { output: direct });

    const refused = await actionMcpHandle(apex, {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: echo.verb, arguments: { input: { payload: { value: 4 } } } },
    }, {});
    assert.equal(refused.result.isError, true);
    assert.equal("structuredContent" in refused.result, false);
  });

  it("maps nonconforming action identities to stable MCP names without changing dispatch identities", async () => {
    const syncIdentity = `operation/jsnode-operation-package:receipt/scripts/fold-${"x".repeat(160)}.mjs/foldFabricationReceiptIntoWorldRows`;
    const asyncIdentity = "operation/πακέτο:receipt/scripts/async.mjs/run";
    const sync = operation({ verb: syncIdentity, run: (value) => ({ mode: "sync", value }) });
    const asynchronous = operation({ verb: asyncIdentity, run: async (value) => ({ mode: "async", value }) });
    const apex = induceSurface([sync, asynchronous], { packageName: "@red-cup-engineering/relating-mcp-name-test" });

    const listed = await actionMcpHandle(apex, { jsonrpc: "2.0", id: 7, method: "tools/list" }, {});
    const listedAgain = await actionMcpHandle(apex, { jsonrpc: "2.0", id: 8, method: "tools/list" }, {});
    assert.deepEqual(listed.result.tools, listedAgain.result.tools);
    const syncTool = listed.result.tools.find((tool) => tool._meta["relating/action-identity"] === syncIdentity);
    const asyncTool = listed.result.tools.find((tool) => tool._meta["relating/action-identity"] === asyncIdentity);
    assert.equal(syncTool.name, mcpToolNameForIdentity(syncIdentity));
    assert.equal(asyncTool.name, mcpToolNameForIdentity(asyncIdentity));
    assert.match(syncTool.name, /^[A-Za-z0-9_.-]{1,128}$/);
    assert.match(asyncTool.name, /^[A-Za-z0-9_.-]{1,128}$/);

    const syncCall = await actionMcpHandle(apex, {
      jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: syncTool.name, arguments: { input: { kept: true } } },
    }, {});
    assert.deepEqual(JSON.parse(syncCall.result.content[0].text), { mode: "sync", value: { kept: true } });
    assert.equal(syncCall.result._meta["relating/action-identity"], syncIdentity);

    const asyncCall = await actionMcpHandle(apex, {
      jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: asyncTool.name, arguments: { input: { kept: true } } },
    }, {});
    assert.deepEqual(JSON.parse(asyncCall.result.content[0].text), { mode: "async", value: { kept: true } });
    assert.equal(asyncCall.result._meta["relating/action-identity"], asyncIdentity);
    assert.equal((await actionMcpHandle(apex, {
      jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: syncIdentity, arguments: { input: { kept: true } } },
    }, {})).error.code, -32602);

    const collision = operation({ verb: mcpToolNameForIdentity(syncIdentity), run: (value) => value });
    const collidingApex = induceSurface([sync, collision], { packageName: "@red-cup-engineering/relating-mcp-name-collision-test" });
    await assert.rejects(() => actionMcpHandle(collidingApex, { jsonrpc: "2.0", id: 12, method: "tools/list" }, {}), /MCP tool name collision/);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actions } from "@red-cup-engineering/relating/actions";
import { actionMcpHandle, induceBins, operationsManifoldUri } from "@red-cup-engineering/relating/running";
import { actionOpenApi } from "@red-cup-engineering/relating/projections";

describe("generated action-apex projections", () => {
  const induced = induceBins(actions, { packageName: "@red-cup-engineering/relating" });

  it("generates OpenAPI without opening a port", () => {
    const openapi = actionOpenApi(induced);
    assert.equal(openapi.openapi, "3.1.1");
    assert.equal(Object.keys(openapi.paths).length, actions.length);
    assert.ok(openapi.paths["/settle"]);
  });

  it("generates MCP tools and the operations-manifold resource from the same apex", () => {
    const tools = actionMcpHandle(induced, { jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
    assert.equal(tools.result.tools.length, actions.length);

    const uri = operationsManifoldUri("@red-cup-engineering/relating");
    const resources = actionMcpHandle(induced, { jsonrpc: "2.0", id: 2, method: "resources/list" }, {});
    assert.ok(resources.result.resources.some((resource) => resource.uri === uri));

    const read = actionMcpHandle(induced, { jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri } }, {});
    const manifold = JSON.parse(read.result.contents[0].text);
    assert.equal(manifold.kind, "relating.operations-manifold");
    assert.equal(manifold.extrema.edges.length, 0);
    assert.deepEqual(manifold.extrema.incoming, manifold.extrema.domains);
    assert.deepEqual(manifold.extrema.outgoing, manifold.extrema.codomains);
  });
});

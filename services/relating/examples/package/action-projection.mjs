import { actions } from "@red-cup-engineering/relating/actions";
import { actionMcpHandle, induceBins, operationsManifoldUri } from "@red-cup-engineering/relating/running";
import { actionOpenApi } from "@red-cup-engineering/relating/projections";

const induced = induceBins(actions, { packageName: "@red-cup-engineering/relating" });
const openapi = actionOpenApi(induced);
const manifoldUri = operationsManifoldUri("@red-cup-engineering/relating");
const tools = actionMcpHandle(induced, { jsonrpc: "2.0", id: 1, method: "tools/list" }, {});
const resources = actionMcpHandle(induced, { jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: manifoldUri } }, {});

console.log(JSON.stringify({
  openapi: {
    version: openapi.openapi,
    pathCount: Object.keys(openapi.paths).length,
  },
  mcp: {
    toolCount: tools.result.tools.length,
    operationsManifold: JSON.parse(resources.result.contents[0].text).kind,
  },
}, null, 2));

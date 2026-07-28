import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  createRelationalOperationProtocol,
  executeRelationalOperationMessage,
  loadBoundRuntime,
} from "../src/boundary.mjs";

const protocol = createRelationalOperationProtocol({
  requestKind: "org.emsenn.test.request.v1",
  responseKind: "org.emsenn.test.response.v1",
  label: "test boundary",
});

function message(operation) {
  const request = protocol.encodeRequest(operation, { value: "one" });
  return Message.toJSON({
    messageId: "one",
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(semanticBytes(request.term))],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
}

function response(output) {
  return protocol.decodeResponse(decodeSemantic(extractRmnPart(Message.fromJSON(output).parts).bytes));
}

test("an unknown operation never reaches a runtime loader", async () => {
  let loaded = false;
  const output = await executeRelationalOperationMessage(message("foreign"), {
    protocol,
    operations: { owned: async () => ({}) },
    runtimeLoader: async () => { loaded = true; return {}; },
  });
  assert.equal(loaded, false);
  assert.equal(response(output).disposition, "refused");
});

test("the bad incumbent case refuses an inactive deployment before execution", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "a2a-boundary-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const boundaryPath = join(root, "boundary.json");
  writeFileSync(boundaryPath, JSON.stringify({ type: "CustomerBoundary", version: 1, status: "not-activated", runtimeAdapterModule: null }));
  let executed = false;
  const output = await executeRelationalOperationMessage(message("owned"), {
    protocol,
    operations: { owned: async () => { executed = true; return {}; } },
    runtimeLoader: () => loadBoundRuntime({
      boundaryPath,
      boundaryType: "CustomerBoundary",
      factoryExport: "createRuntime",
      root,
      inactiveMessage: "customer deployment is not activated",
    }),
  });
  assert.equal(executed, false);
  assert.equal(response(output).reason, "customer deployment is not activated");
});

test("one admitted active runtime executes exactly once", async () => {
  let calls = 0;
  const output = await executeRelationalOperationMessage(message("owned"), {
    protocol,
    operations: { owned: async (input, runtime) => { calls += 1; return { input, provider: runtime.provider }; } },
    runtimeLoader: async () => ({ provider: "urn:provider:one" }),
  });
  assert.equal(calls, 1);
  assert.equal(response(output).result.provider, "urn:provider:one");
});

test("a relative runtime adapter cannot escape the customer membrane", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "a2a-boundary-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const boundaryPath = join(root, "boundary.json");
  writeFileSync(boundaryPath, JSON.stringify({ type: "CustomerBoundary", version: 1, status: "active", runtimeAdapterModule: "../../foreign.mjs" }));
  await assert.rejects(loadBoundRuntime({ boundaryPath, boundaryType: "CustomerBoundary", factoryExport: "createRuntime", root }), /crosses the customer settlement membrane/u);
});

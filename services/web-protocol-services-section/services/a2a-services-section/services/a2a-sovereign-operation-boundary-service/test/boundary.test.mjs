import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
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
    parts: [rmnPart(request.bytes)],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
}

function response(output) {
  const input = extractRmnPart(Message.fromJSON(output).parts);
  return protocol.admitResponse(input.bytes, input.ni);
}

function messageWithBytes(bytes) {
  return Message.toJSON({
    messageId: "hostile",
    contextId: "",
    taskId: "",
    role: Role.ROLE_USER,
    parts: [rmnPart(bytes)],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
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

test("foreign bytes are refused before runtime loading", async () => {
  let loaded = false;

  await assert.rejects(
    executeRelationalOperationMessage(messageWithBytes(Buffer.from("foreign carrier", "utf8")), {
      protocol,
      operations: { owned: async () => ({}) },
      runtimeLoader: async () => { loaded = true; return {}; },
    }),
    /canonical RMN normalized-content envelope/u,
  );
  assert.equal(loaded, false);
});

test("token drift is refused before runtime loading", async () => {
  const request = protocol.encodeRequest("owned", { value: "one" });
  const hostile = messageWithBytes(request.bytes);
  hostile.parts[0].metadata.ni = rmnPart(Buffer.from("foreign bytes", "utf8")).metadata.ni;
  let loaded = false;

  await assert.rejects(
    executeRelationalOperationMessage(hostile, {
      protocol,
      operations: { owned: async () => ({}) },
      runtimeLoader: async () => { loaded = true; return {}; },
    }),
    /bytes do not match their ni identity/u,
  );
  assert.equal(loaded, false);
});

test("a relative runtime adapter cannot escape the customer membrane", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "a2a-boundary-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const boundaryPath = join(root, "boundary.json");
  writeFileSync(boundaryPath, JSON.stringify({ type: "CustomerBoundary", version: 1, status: "active", runtimeAdapterModule: "../../foreign.mjs" }));
  await assert.rejects(loadBoundRuntime({ boundaryPath, boundaryType: "CustomerBoundary", factoryExport: "createRuntime", root }), /crosses the customer settlement membrane/u);
});

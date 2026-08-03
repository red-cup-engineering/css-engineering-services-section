import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { cloudComputeTermId } from "../src/semantic-content.mjs";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";
import { inciteImprovementMarketSupplier } from "../src/client.mjs";
import { ACTOR } from "../src/improvement-board-forager.mjs";

const exact = (body) => ({ id: cloudComputeTermId(body, "cloud-compute.supplier-operation"), ...body });
const incitement = exact({ type: "Create", actor: "urn:ame:test-inciter", target: ACTOR, object: { type: "ImprovementForagerIncitement", evidence: ["urn:evidence:test"], sequence: 1 } });

test("the advertised incitement entry crosses only the authenticated A2A client boundary", () => {
  const entry = readFileSync(new URL("../scripts/forage-improvement-boards.mjs", import.meta.url), "utf8");
  assert.match(entry, /inciteImprovementMarketSupplier/u);
  assert.doesNotMatch(entry, /forageImprovementBoards/u);
  const runtimeFiles = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))["x-agentic-metro-enterprise"]["operation-catalog"]["forage-improvement-boards"].runtimeFiles;
  assert.ok(runtimeFiles.includes("src/client.mjs"));
  assert.ok(runtimeFiles.includes("src/a2a-executor.mjs"));
});

test("the supplier invocation declares its stateless runtime contract in the operation catalog", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const operation = manifest["x-agentic-metro-enterprise"]["operation-catalog"]["forage-improvement-boards"];
  assert.equal(operation.accepts, "provider-addressed ActivityPub/A2A Create<ImprovementForagerIncitement>");
  assert.ok(operation.runtimeFiles.includes("src/client.mjs"));
  assert.ok(operation.runtimeFiles.includes("src/a2a-executor.mjs"));
  assert.doesNotMatch(JSON.stringify(operation), /systemd|PRIVATE_KEY|API_KEY|BEARER_TOKEN/u);
});

test("the supplier control face is one canonical RMN operation over A2A", async () => {
  const request = exact({ type: "ImprovementMarketSupplierIncitementRequest", provider: ACTOR, incitement });
  const source = Message.toJSON({ messageId: "00000000-0000-4000-8000-000000000001", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const output = await executeA2aMessage(source, { forageImprovementBoards: async () => ({ type: "Accept", object: { type: "ImprovementForagerIncitementReceipt" } }) });
  const part = extractRmnPart(Message.fromJSON(output).parts);
  const response = operationFromBytes(part.bytes, part.ni);
  assert.equal(response.type, "ImprovementMarketSupplierIncitementResult");
  assert.equal(response.request, request.id);
});

test("the inciter-side client requires the exact authenticated signed supplier response", async () => {
  const send = async ({ message, bearerTokenFile }) => {
    assert.equal(bearerTokenFile, "/contract/credential");
    const part = extractRmnPart(Message.fromJSON(message).parts);
    const input = operationFromBytes(part.bytes, part.ni);
    const response = exact({ type: "ImprovementMarketSupplierIncitementResult", provider: ACTOR, request: input.id, incitement: input.incitement.id, result: { type: "Accept" } });
    return { result: Message.fromJSON(Message.toJSON({ messageId: "", contextId: "", taskId: "", role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: {}, extensions: [], referenceTaskIds: [] })), inputNi: input.id, outputNi: response.id, agentCard: { name: "supplier die" } };
  };
  const result = await inciteImprovementMarketSupplier(incitement, { agentCardUrl: "https://supplier.example/.well-known/agent-card.json", bearerTokenFile: "/contract/credential", send });
  assert.equal(result.type, "Accept");
  assert.equal(result.supplierProvider, ACTOR);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";
import { inciteImprovementMarketSupplier } from "../src/client.mjs";
import { ACTOR } from "../src/improvement-board-forager.mjs";

const exact = (body) => ({ id: semanticId(relationalRwilDocument(body)), ...body });
const incitement = exact({ type: "Create", actor: "urn:ame:test-inciter", target: ACTOR, object: { type: "ImprovementForagerIncitement", evidence: ["urn:evidence:test"], sequence: 1 } });

test("the advertised incitement entry crosses only the authenticated A2A client boundary", () => {
  const entry = readFileSync(new URL("../bin/forage-improvement-boards.mjs", import.meta.url), "utf8");
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
  /* Retired host-unit assertions retained only as migration history. */
  /* const unit = readFileSync(new URL("../ops/systemd/bare-cedar-fog-cloud-compute-services-section-a2a.service", import.meta.url), "utf8");
  for (const exactLine of [
    "Environment=RWIL_RDF_AGENT=http://127.0.0.1:19764/.well-known/agent-card.json",
    "Environment=CLOUD_COMPUTE_ACTIVITYPUB_ORIGIN=https://bare-cedar-fog.561.group",
    "Environment=CLOUD_COMPUTE_ACTIVITYPUB_IDENTIFIER=cloud-compute-services-section",
    "Environment=CLOUD_COMPUTE_A2A_AGENT_CARD=https://bare-cedar-fog.561.group/a2a/improvement-market-supplier/.well-known/agent-card.json",
    "Environment=CLOUD_COMPUTE_ACTIVITYPUB_KEYS_PATH=/home/emsenn/info/lib/emsenn/services/561-group/services/red-cup-engineering/services/software-services-section/web-services-section/services/cloud-compute-services-section/data/activitypub/keys.json",
    "Environment=ACCEPTANCE_CAPSULE_PROCUREMENT_AGENT_CARD_URL=http://127.0.0.1:19842/.well-known/agent-card.json",
    "Environment=SOFTWARE_MISSION_EXECUTION_AGENT_CARD_URL=https://bare-cedar-fog.561.group/a2a/software-mission-execution/.well-known/agent-card.json",
  ]) assert.ok(unit.split("\n").includes(exactLine), `missing exact supplier contract: ${exactLine}`);
  assert.doesNotMatch(unit, /CLOUD_COMPUTE_A2A_AGENT_CARD=https:\/\/bare-cedar-fog\.561\.group\/a2a\/cloud-compute-services-section(?:\n|$)/u);
  assert.doesNotMatch(unit, /Environment=(?:.*PRIVATE_KEY|.*API_KEY|.*BEARER_TOKEN)=/u);
  assert.match(unit, /^Environment=A2A_TASK_STORE_ROOT=\/home\/emsenn\/info\/lib\/emsenn\/services\/561-group\/services\/red-cup-engineering\/services\/web-services-section\/services\/cloud-compute-services-section\/data\/a2a\/tasks$/mu);
  const activityPubUnit = readFileSync(new URL("../ops/systemd/bare-cedar-fog-cloud-compute-services-section-activitypub.service", import.meta.url), "utf8");
  assert.match(activityPubUnit, /^Environment=ACTIVITYPUB_KEYS_PATH=\/home\/emsenn\/info\/lib\/emsenn\/services\/561-group\/services\/red-cup-engineering\/services\/web-services-section\/services\/cloud-compute-services-section\/data\/activitypub\/keys\.json$/mu);
  assert.match(activityPubUnit, /^Environment=ACTIVITYPUB_STATE_PATH=\/home\/emsenn\/info\/lib\/emsenn\/services\/561-group\/services\/red-cup-engineering\/services\/web-services-section\/services\/cloud-compute-services-section\/data\/activitypub\/state\.jsonl$/mu);
  assert.doesNotMatch(`${unit}\n${activityPubUnit}`, /\.local\/share\/emsenn\/(?:a2a\/cloud-compute-services-section-improvement-market-supplier-tasks|activitypub\/cloud-compute-services-section\.json)/u); */
});

test("the supplier control face is one canonical RMN operation over A2A", async () => {
  const request = exact({ type: "ImprovementMarketSupplierIncitementRequest", provider: ACTOR, incitement });
  const source = Message.toJSON({ messageId: "00000000-0000-4000-8000-000000000001", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const output = await executeA2aMessage(source, { forageImprovementBoards: async () => ({ type: "Accept", object: { type: "ImprovementForagerIncitementReceipt" } }) });
  const response = operationFromBytes(extractRmnPart(Message.fromJSON(output).parts).bytes);
  assert.equal(response.type, "ImprovementMarketSupplierIncitementResult");
  assert.equal(response.request, request.id);
});

test("the inciter-side client requires the exact authenticated signed supplier response", async () => {
  const send = async ({ message, bearerTokenFile }) => {
    assert.equal(bearerTokenFile, "/contract/credential");
    const input = operationFromBytes(extractRmnPart(Message.fromJSON(message).parts).bytes);
    const response = exact({ type: "ImprovementMarketSupplierIncitementResult", provider: ACTOR, request: input.id, incitement: input.incitement.id, result: { type: "Accept" } });
    return { result: Message.fromJSON(Message.toJSON({ messageId: "", contextId: "", taskId: "", role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: {}, extensions: [], referenceTaskIds: [] })), inputNi: input.id, outputNi: response.id, agentCard: { name: "supplier die" } };
  };
  const result = await inciteImprovementMarketSupplier(incitement, { agentCardUrl: "https://supplier.example/.well-known/agent-card.json", bearerTokenFile: "/contract/credential", send });
  assert.equal(result.type, "Accept");
  assert.equal(result.supplierProvider, ACTOR);
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { extractRmnPart, parseA2aMessage, userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const A2A_JSON_OBJECT_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_JSON_OBJECT_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_JSON_OBJECT_KIND }).value;
import { querySettlementRecords, recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { startWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/test-provider";
import { executeCommissionProcessingMessage } from "../src/a2a-commission-processing-executor.mjs";
import { ACTOR, NODE_ROOT, contentId } from "../src/broker.mjs";
import { processCommission } from "../src/process-commission.mjs";

const AT = "2096-07-21T12:00:00.000Z";
const CHANNEL = "urn:ame:youtube-channel-enterprise";
const SETTLEMENT = "eip155:31337:0x6666666666666666666666666666666666666666";
function exact(body) { return { id: contentId(body), ...body }; }
function delivery() {
  const observation = exact({ type: "AudienceAttentionObservation", channel: CHANNEL, legalPrincipal: "emsenn", source: "YouTubeAnalyticsAPI", window: { from: "2096-07-01", through: "2096-07-20" }, sourceDataDigest: `sha256:${"a".repeat(64)}`, dimensions: ["video"], measures: [{ name: "views", value: 4 }, { name: "estimatedMinutesWatched", value: 20 }, { name: "averageViewDurationSeconds", value: 120 }], rawDataHeldByChannel: true, platformPolicyStatus: "processing-permitted-for-exact-contract", observedAt: AT });
  const receipt = exact({ type: "InternalAnalyticsSettlementReceipt", payer: CHANNEL, payee: ACTOR, service: "one-audience-observation-interpretation", inputObservation: observation.id, termsCommitment: "urn:terms", amountMicros: 5000, accountingUnit: "USD-micros", cashSettlementRequired: false, legalBodyRelation: "same-legal-body", status: "settled-internal-cost-allocation", settledAt: AT });
  const contract = exact({ type: "AnalyticsProcessingContract", customer: CHANNEL, provider: ACTOR, inputObservation: observation.id, legalPrincipal: "emsenn", purpose: "Identify bounded audience questions worth editorial consideration.", permittedOutputs: ["AnalyticsInterpretation", "CuriosityCandidate"], retentionUntil: "2096-08-20T12:00:00.000Z", noRawRetention: true, noOnwardTransfer: true, noCredentialAccess: true, noFutureFeed: true, accountingTreatment: "same-principal-management", settlementReceipt: receipt.id, platformPolicyBasis: "urn:policy:emsenn0:analytics-custody-and-trade", platformPolicyCheckedAt: AT });
  return exact({ type: "Accept", actor: CHANNEL, target: ACTOR, object: { type: "AnalyticsProcessingDelivery", observation, contract, settlementReceipt: receipt } });
}
async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "analytics-processing-")), witnessJournal = await startWitnessJournalProviderProcess(), item = delivery();
  t.after(async () => { await witnessJournal.close(); rmSync(root, { recursive: true, force: true }); });
  return { item, options: { dataRoot: join(root, "data"), runtimeRoot: join(root, "runtime"), witnessJournalAgentUrl: witnessJournal.agentCardUrl, settlement: SETTLEMENT, at: AT, client: { pickup: async () => item, verifyDelivery: (value) => value === item } } };
}

test("processing is content-identically replayable and creates only one interpretation and offer", async (t) => {
  const { options } = await fixture(t), first = await processCommission({ channel: CHANNEL, commission: `urn:sha256:${"c".repeat(64)}` }, options), replay = await processCommission({ channel: CHANNEL, commission: `urn:sha256:${"c".repeat(64)}` }, { ...options, at: "2096-07-22T12:00:00.000Z" });
  assert.equal(replay.interpretation.id, first.interpretation.id);
  assert.equal(replay.offer.id, first.offer.id);
  assert.equal((await querySettlementRecords("channel-analytics.interpretation-admission", { agentUrl: options.witnessJournalAgentUrl })).length, 1);
  assert.equal((await querySettlementRecords("channel-analytics.curiosity-candidate-offer", { agentUrl: options.witnessJournalAgentUrl })).length, 1);
});

test("a noncanonical historical carrier is preserved but does not mask the one canonical replay", async (t) => {
  const { options } = await fixture(t), first = await processCommission({ channel: CHANNEL, commission: `urn:sha256:${"c".repeat(64)}` }, options), malformedObject = { ...first.offer.object };
  delete malformedObject.id;
  const malformed = exact({ type: "Offer", actor: ACTOR, object: malformedObject, published: "2096-07-20T12:00:00.000Z" });
  await options.client.pickup();
  await recordSettlementRecord({ agentUrl: options.witnessJournalAgentUrl, settlement: null, actor: ACTOR, category: "channel-analytics.curiosity-candidate-offer", recordedAt: AT, record: { ...malformed } });
  const replay = await processCommission({ channel: CHANNEL, commission: `urn:sha256:${"c".repeat(64)}` }, { ...options, at: "2096-07-22T12:00:00.000Z" });
  assert.equal(replay.offer.id, first.offer.id);
  assert.equal((await querySettlementRecords("channel-analytics.curiosity-candidate-offer", { agentUrl: options.witnessJournalAgentUrl })).length, 2);
});

test("the signed operation returns only bounded product identities", async (t) => {
  const { options } = await fixture(t), commission = `urn:sha256:${"c".repeat(64)}`, request = exact({ type: "AnalyticsCommissionProcessingRequest", customer: CHANNEL, provider: ACTOR, commission });
  const response = await executeCommissionProcessingMessage(userRmnMessage(semanticBytes(["analytics-commission-processing-request", request]), "request.rmn.cbor"), options);
  const result = decodeSemantic(extractRmnPart(parseA2aMessage(response).parts).bytes)[1];
  assert.equal(result.disposition, "processed");
  assert.equal(result.commission, commission);
  assert.match(result.candidate, /^urn:sha256:/u);
  assert.equal("observation" in result, false);
  assert.ok(result.authorityWithheld.includes("spending"));
});

#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { querySettlementRecords, recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { ACTOR, NODE_ROOT, admitInterpretation, contentId, formCuriosityCandidateOffer, witnessJournalBinding } from "./broker.mjs";
import { channelBinding, createAnalyticsChannelClient } from "./channel-client.mjs";

const POLICY_BASIS = "urn:policy:emsenn0:analytics-custody-and-trade";
function exact(value) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === contentId(body); }
export function analysisFor(observation) { const watched = observation.measures.find((entry) => entry.name === "estimatedMinutesWatched")?.value, duration = observation.measures.find((entry) => entry.name === "averageViewDurationSeconds")?.value; if (![watched, duration].every(Number.isFinite)) throw new TypeError("interpretation requires the admitted attention measures"); return { method: "Single-observation descriptive assay. Treat the measures only as a bounded demand signal; do not join outside data or infer causation.", attribution: "Attributed to the Channel Analytics Interpretation Broker from one customer-owned YouTube Analytics API observation.", findings: ["This video is the channel customer's highest estimated-watch-time uncommissioned observation in its latest closed window, making its subject a reasonable candidate for qualitative follow-up."], limitations: ["One platform window cannot establish why viewers watched, what they understood, or whether the subject should govern editorial priorities.", "Platform measurements may be revised and are not research evidence."], hypotheses: ["The observed attention may reflect subject demand, packaging, distribution, prior audience familiarity, or viewing context; the observation alone does not discriminate among them."], curiosityCandidates: [{ question: "Which relational features of this video's subject and presentation sustained audience attention, and what follow-up explanation would discriminate among plausible causes?", whyItMayMatter: "A bounded follow-up can turn an attention signal into a testable editorial question without treating platform metrics as research truth.", restrictedMeasurementDisclosure: "none" }] }; }
export function verifiersFor(delivery, at) { const payload = delivery.object, contract = payload.contract, receipt = payload.settlementReceipt; return {
  verifySettlement: async (channel, receiptId) => exact(receipt) && receipt.id === receiptId && receipt.id === contract.settlementReceipt && receipt.payer === channel && receipt.payee === ACTOR && receipt.inputObservation === payload.observation.id && receipt.amountMicros === 5000 && receipt.accountingUnit === "USD-micros" && receipt.cashSettlementRequired === false && receipt.legalBodyRelation === "same-legal-body" && receipt.status === "settled-internal-cost-allocation",
  verifyPlatformPolicy: async (observation, exactContract) => observation.platformPolicyStatus === "processing-permitted-for-exact-contract" && exactContract.platformPolicyBasis === POLICY_BASIS && Date.parse(exactContract.platformPolicyCheckedAt) <= Date.parse(at) && Date.parse(at) - Date.parse(exactContract.platformPolicyCheckedAt) <= 30 * 86_400_000,
  verifyDisclosure: async (_observation, analysis) => analysis.curiosityCandidates.every((entry) => entry.restrictedMeasurementDisclosure === "none" && !/\b(?:views|minutes|duration|watch(?:ed)?|\d+)\b/iu.test(entry.question + " " + entry.whyItMayMatter)),
  }; }
export async function processCommission({ channel, commission } = {}, options = {}) {
  const at = options.at ?? new Date().toISOString();
  const dataRoot = options.dataRoot;
  const client = options.client ?? createAnalyticsChannelClient({ binding: channelBinding(channel) });
  const delivery = await client.pickup(commission);
  const verifiers = verifiersFor(delivery, at);
  const interpretation = await admitInterpretation({ delivery, analysis: analysisFor(delivery.object.observation) }, { dataRoot, runtimeRoot: options.runtimeRoot, witnessJournalAgentUrl: options.witnessJournalAgentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT, at, verifyDelivery: async (value) => client.verifyDelivery(value), ...verifiers });
  const binding = await witnessJournalBinding(options);
  const history = (await querySettlementRecords("channel-analytics.curiosity-candidate-offer", binding)).filter((entry) => entry.object?.motivatingInterpretation === interpretation.id);
  const prior = history.filter((recorded) => exact(recorded) && recorded.type === "Offer" && recorded.actor === ACTOR && exact(recorded.object));
  if (prior.length > 1) throw new TypeError("analytics interpretation has conflicting canonical curiosity-offer history");
  let offer;
  if (prior.length) {
    offer = prior[0];
  } else {
    offer = formCuriosityCandidateOffer(interpretation, 0, at);
    await recordSettlementRecord({ ...binding, settlement: options.settlement ?? null, actor: ACTOR, category: "channel-analytics.curiosity-candidate-offer", recordedAt: at, record: { ...offer } });
  }
  return { interpretation, offer, delivery };
}
function value(flag) { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; }
if (process.argv[1] === fileURLToPath(import.meta.url)) { const activation = JSON.parse(readFileSync(join(NODE_ROOT, "content/config/activation.json"), "utf8")); if (activation.liveProcessing !== "granted-same-principal") throw new TypeError("analytics broker live processing is not active"); await processCommission({ channel: value("--channel"), commission: value("--commission") }).then((result) => process.stdout.write(`${JSON.stringify({ type: "AnalyticsCommissionProcessingRun", interpretation: result.interpretation.id, curiosityOffer: result.offer.id, inputObservation: result.interpretation.inputObservation })}\n`)).catch((error) => { process.stderr.write(`refused: ${error.message}\n`); process.exitCode = 78; }); }

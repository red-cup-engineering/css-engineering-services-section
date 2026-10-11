import { resolve } from "node:path";
import { recordWitnessJournalBatch, relationalWitnessJournalDocument } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage.independent-witness-and-books.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
export function witnessBrokerageOutcome({ originatingActor, witnessActor = "urn:ame:brokerage-independent-witness-and-books", inputs, output, externalEvidence, observedAt }) {
  if (originatingActor === witnessActor) throw new TypeError("assertion-refused");
  if (!Number.isFinite(Date.parse(observedAt))) throw new TypeError("witness-observation-time-required");
  if (!Array.isArray(inputs) || inputs.length === 0 || !output?.id || !Array.isArray(externalEvidence) || externalEvidence.length === 0 || externalEvidence.some((e) => !e.uri || !e.digest)) throw new TypeError("replay-evidence-incomplete");
  const body = { type: "IndependentBrokerageOutcomeWitness", version: 1, witnessActor, originatingActor, inputDigests: inputs.map((x) => x.id ?? semanticId(x)).sort(),
    outputDigest: output.id, externalEvidence, observedAt, disposition: "replayable-evidence-recorded", correctnessClaim: "not-unbound" };
  return Object.freeze({ id: semanticId(body), ...body });
}

export function createBrokerageOutcomeWitnessRecorder(env = process.env, dependencies = {}) {
  const agentUrl = env.WITNESS_JOURNAL_RDF_AGENT, dataRoot = env.BROKERAGE_BOOKS_DATA_ROOT, settlementAccount = env.BROKERAGE_BOOKS_ACCOUNT;
  if (!agentUrl || !dataRoot || !settlementAccount) throw new Error("WITNESS_JOURNAL_RDF_AGENT, BROKERAGE_BOOKS_DATA_ROOT, and CAIP-10 BROKERAGE_BOOKS_ACCOUNT are required");
  const record = dependencies.record || recordWitnessJournalBatch, now = dependencies.now || (() => new Date().toISOString());
  return async function recordBrokerageOutcome(input) {
    const observedAt = input.observedAt ?? now(), witness = witnessBrokerageOutcome({ ...input, observedAt });
    const graph = witness.id;
    const recordReceipt = await record({ agentUrl, root: resolve(dataRoot), nodeId: "brokerage-independent-witness-and-books", batch: {
      settlement: settlementAccount, graph, recordedAt: observedAt, document: relationalWitnessJournalDocument(witness),
      assertions: [
        ["urn:emsenn:brokerage:originating-actor", witness.originatingActor],
        ["urn:emsenn:brokerage:output-digest", witness.outputDigest],
        ["urn:emsenn:brokerage:disposition", witness.disposition],
        ["urn:prov:generatedAtTime", observedAt],
      ].map(([predicate, value]) => ({ subject: graph, predicate, object: { kind: "literal", value: String(value) } })),
    } });
    return Object.freeze({ type: "RecordedIndependentBrokerageOutcomeWitness", version: 1, witness, graph, recordReceipt });
  };
}

export function createBrokerageMarketEventRecorder({ originatingActor, nodeId }, env = process.env, dependencies = {}) {
  const witnessActor = "urn:ame:brokerage-independent-witness-and-books", agentUrl = env.WITNESS_JOURNAL_RDF_AGENT, dataRoot = env.BROKERAGE_BOOKS_DATA_ROOT, settlementAccount = env.BROKERAGE_BOOKS_ACCOUNT;
  if (!originatingActor || originatingActor === witnessActor || !nodeId) throw new TypeError("independent-market-event-origin-required");
  if (!agentUrl || !dataRoot || !settlementAccount) throw new Error("WITNESS_JOURNAL_RDF_AGENT, BROKERAGE_BOOKS_DATA_ROOT, and CAIP-10 BROKERAGE_BOOKS_ACCOUNT are required");
  const record = dependencies.record || recordWitnessJournalBatch, now = dependencies.now || (() => new Date().toISOString());
  const recordMarketEvent = async function recordMarketEvent(event) {
    const recordedAt = event?.recordedAt ?? event?.confirmedAt ?? event?.attemptedAt ?? now(); if (!Number.isFinite(Date.parse(recordedAt))) throw new TypeError("market-event-time-required");
    const body = { type: "IndependentBrokerageMarketEventRecord", version: 1, witnessActor, originatingActor, event, recordedAt, selfAttestation: false };
    const eventId = semanticId(body), graph = eventId;
    const recordReceipt = await record({ agentUrl, root: resolve(dataRoot), nodeId, batch: { settlement: settlementAccount, graph, recordedAt,
      document: relationalWitnessJournalDocument({ id: eventId, ...body }), assertions: [
        ["urn:emsenn:brokerage:originating-actor", originatingActor], ["urn:emsenn:brokerage:market-event-type", event?.type ?? "unknown"], ["urn:prov:generatedAtTime", recordedAt],
      ].map(([predicate, value]) => ({ subject: graph, predicate, object: { kind: "literal", value: String(value) } })) } });
    return Object.freeze({ type: "RecordedIndependentBrokerageMarketEvent", version: 1, id: eventId, graph, recordReceipt });
  };
  Object.defineProperties(recordMarketEvent, { originatingActor: { value: originatingActor, enumerable: true }, witnessActor: { value: witnessActor, enumerable: true }, nodeId: { value: nodeId, enumerable: true } });
  return Object.freeze(recordMarketEvent);
}

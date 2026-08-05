import { resolve } from "node:path";
import { recordWitnessJournalBatch, relationalWitnessJournalDocument } from "@red-cup-engineering/witness-journal-rdf-projection-service/client";
import { settlementWitnessGraphId } from "@red-cup-engineering/x402-settlement-witness-identity";

const NODE_ID = "coinbase-x402-bazaar-border";
export function createBrokerageX402SettlementWitness(env = process.env, dependencies = {}) {
  const agentUrl = env.WITNESS_JOURNAL_RDF_AGENT, dataRoot = env.BROKERAGE_X402_DATA_ROOT, settlementAccount = env.BROKERAGE_X402_ACCOUNT;
  if (!agentUrl || !dataRoot || !settlementAccount) throw new Error("WITNESS_JOURNAL_RDF_AGENT, BROKERAGE_X402_DATA_ROOT, and CAIP-10 BROKERAGE_X402_ACCOUNT are required");
  const record = dependencies.record || recordWitnessJournalBatch, now = dependencies.now || (() => new Date().toISOString());
  return async function appendSettlement(context) {
    const transaction = context?.result?.transaction, network = context?.result?.network, amount = context?.result?.amount ?? context?.requirements?.amount;
    if (!transaction || !network || amount == null) throw new Error("settled brokerage x402 context incomplete");
    const recordedAt = now(), payer = context.result.payer ?? null;
    const graph = settlementWitnessGraphId({ network, transaction });
    const resource = context.requirements?.resource ?? context.resource ?? "unknown";
    return record({ agentUrl, root: resolve(dataRoot), nodeId: NODE_ID, batch: { settlement: settlementAccount, graph, recordedAt,
      document: relationalWitnessJournalDocument({ type: "BrokerageX402SettlementWitness", resource: String(resource), payment: { network, transaction, payer, amount: String(amount) } }),
      assertions: [["urn:x402:network", network], ["urn:x402:transaction", transaction], ["urn:x402:payer", payer ?? "undisclosed"], ["urn:x402:amount", amount], ["urn:emsenn:brokerage:resource", resource], ["urn:prov:generatedAtTime", recordedAt]].map(([predicate, value]) => ({ subject: graph, predicate, object: { kind: "literal", value: String(value) } })) } });
  };
}

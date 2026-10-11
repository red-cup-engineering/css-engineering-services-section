import { semanticIdOf } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";

const semanticId = semanticIdOf("brokerage.union-consideration-settlement.record");

export const UNION_SETTLEMENT_ACTOR = "urn:ame:union-consideration-settlement-service";
export const INDEPENDENT_BOOKS_ACTOR = "urn:ame:brokerage-independent-witness-and-books";
const identify = (body) => ({ id: semanticId(body), ...body });
const exactText = (value, label) => { if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`); return value; };

export function createUnionConsiderationSettlementProvider({ consumeGrant, recordSettlement, settlementActor = UNION_SETTLEMENT_ACTOR, witnessActor = INDEPENDENT_BOOKS_ACTOR }) {
  if (typeof consumeGrant !== "function" || typeof recordSettlement !== "function") throw new TypeError("union-settlement-providers-required");
  exactText(settlementActor, "settlement-actor"); exactText(witnessActor, "witness-actor");
  if (settlementActor === witnessActor) throw new TypeError("union-settlement-assertion-refused");
  if (recordSettlement.originatingActor !== settlementActor || recordSettlement.witnessActor !== witnessActor) throw new TypeError("union-settlement-independent-recorder-contract-required");
  const settle = async ({ contract, output, witness }) => {
    if (contract?.type !== "UnionBrokerageProductContract" || !contract.id || !contract.provider || !contract.customer) throw new TypeError("union-settlement-contract-required");
    const grant = contract.considerationGrant, price = contract.price;
    if (!grant?.id || grant.asset !== price?.asset || grant.unit !== price?.unit || String(grant.amount) !== String(price?.amount)) throw new TypeError("union-settlement-exact-grant-required");
    if (!output?.id || !witness?.id || witness.witnessActor !== witnessActor || witness.originatingActor !== contract.provider
      || witness.witnessActor === settlementActor) throw new TypeError("union-settlement-output-or-independent-witness-required");
    const consumed = await consumeGrant(Object.freeze({ type: "UnionConsiderationGrantConsumptionRequest", version: 1,
      grant: grant.id, asset: grant.asset, unit: grant.unit, amount: String(grant.amount), beneficiary: contract.provider,
      contract: contract.id, customer: contract.customer, output: output.id, independentWitness: witness.id }));
    if (consumed?.success !== true || consumed.grant !== grant.id || consumed.asset !== grant.asset || consumed.unit !== grant.unit
      || String(consumed.amount) !== String(grant.amount) || consumed.beneficiary !== contract.provider || consumed.contract !== contract.id
      || typeof consumed.receipt !== "string" || consumed.receipt.trim() === "" || !Number.isFinite(Date.parse(consumed.consumedAt))) throw new TypeError("union-settlement-consumption-receipt-invalid");
    const body = { type: "UnionConsiderationSettlementReceipt", version: 1, settlementActor, witnessActor, contract: contract.id,
      grant: grant.id, customer: contract.customer, beneficiary: contract.provider, asset: grant.asset, unit: grant.unit, amount: String(grant.amount),
      output: output.id, independentWitness: witness.id, consumptionReceipt: consumed.receipt, consumedAt: consumed.consumedAt,
      conversionRate: null, customerBrokerageAssetAuthority: false, paymentCredentialCustody: false };
    const receipt = Object.freeze(identify(body));
    const recorded = await recordSettlement(receipt);
    if (!recorded?.id && !recorded?.graph && !recorded?.recordReceipt) throw new TypeError("union-settlement-independent-record-receipt-required");
    return Object.freeze({ success: true, contract: contract.id, receipt: receipt.id, settlement: receipt, independentRecord: recorded.id ?? recorded.graph ?? recorded.recordReceipt });
  };
  Object.defineProperties(settle, { originatingActor: { value: settlementActor, enumerable: true }, witnessActor: { value: witnessActor, enumerable: true } });
  return Object.freeze(settle);
}

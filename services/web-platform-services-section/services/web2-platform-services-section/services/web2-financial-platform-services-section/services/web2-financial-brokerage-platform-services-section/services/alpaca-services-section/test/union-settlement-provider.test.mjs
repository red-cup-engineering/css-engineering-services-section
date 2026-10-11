import assert from "node:assert/strict";
import test from "node:test";
import { createUnionConsiderationSettlementProvider, INDEPENDENT_BOOKS_ACTOR, UNION_SETTLEMENT_ACTOR } from "../services/union-consideration-settlement-service/src/settlement-provider.mjs";

const contract = { id: "sha256:contract", type: "UnionBrokerageProductContract", provider: "urn:ame:issuer-research-media-service", customer: "https://customer.example/actors/one",
  considerationGrant: { id: "grant:customer-wallet:one", asset: "urn:iso:currency:USDC", unit: "USDC", amount: "0.25" }, price: { asset: "urn:iso:currency:USDC", unit: "USDC", amount: "0.25" } };
const output = { id: "sha256:output" }, witness = { id: "sha256:witness", witnessActor: INDEPENDENT_BOOKS_ACTOR, originatingActor: contract.provider };
const recorder = (implementation = async () => ({ graph: "ni:///sha-256;record" })) => Object.assign(implementation, { originatingActor: UNION_SETTLEMENT_ACTOR, witnessActor: INDEPENDENT_BOOKS_ACTOR });

test("Union settlement consumes one exact opaque grant and independently records its deterministic receipt", async () => {
  let request, record; const settle = createUnionConsiderationSettlementProvider({ consumeGrant: async (input) => { request = input; return { success: true, grant: input.grant, asset: input.asset, unit: input.unit,
    amount: input.amount, beneficiary: input.beneficiary, contract: input.contract, receipt: "x402:0xabc", consumedAt: "2026-07-22T23:00:00.000Z" }; }, recordSettlement: recorder(async (input) => { record = input; return { graph: "ni:///sha-256;record" }; }) });
  const result = await settle({ contract, output, witness });
  assert.equal(request.grant, contract.considerationGrant.id); assert.equal(request.beneficiary, contract.provider); assert.equal(request.output, output.id); assert.equal(request.independentWitness, witness.id);
  assert.equal(result.success, true); assert.equal(result.contract, contract.id); assert.equal(result.receipt, record.id); assert.match(result.receipt, /^ni:\/\/\/sha-256;/u); assert.equal(record.conversionRate, null); assert.equal(record.paymentCredentialCustody, false);
  assert.equal(settle.originatingActor, UNION_SETTLEMENT_ACTOR); assert.equal(settle.witnessActor, INDEPENDENT_BOOKS_ACTOR);
});

test("Union settlement refuses exact-term drift, invalid consumption evidence, and assertion", async () => {
  const consumeGrant = async (input) => ({ success: true, ...input, receipt: "receipt:one", consumedAt: "2026-07-22T23:00:00.000Z" }), recordSettlement = recorder();
  const settle = createUnionConsiderationSettlementProvider({ consumeGrant, recordSettlement });
  await assert.rejects(() => settle({ contract: { ...contract, considerationGrant: { ...contract.considerationGrant, amount: "0.24" } }, output, witness }), /exact-grant/u);
  await assert.rejects(() => createUnionConsiderationSettlementProvider({ consumeGrant: async (input) => ({ success: true, ...input, amount: "0.24", receipt: "bad", consumedAt: "2026-07-22T23:00:00.000Z" }), recordSettlement })({ contract, output, witness }), /receipt-invalid/u);
  await assert.rejects(() => settle({ contract, output, witness: { ...witness, witnessActor: contract.provider } }), /independent-witness/u);
  assert.throws(() => createUnionConsiderationSettlementProvider({ consumeGrant, recordSettlement, settlementActor: UNION_SETTLEMENT_ACTOR, witnessActor: UNION_SETTLEMENT_ACTOR }), /assertion/u);
  assert.throws(() => createUnionConsiderationSettlementProvider({ consumeGrant, recordSettlement: async () => ({}) }), /independent-recorder/u);
});

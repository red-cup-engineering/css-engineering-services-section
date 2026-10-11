import assert from "node:assert/strict";
import test from "node:test";
import { contractUnionBrokerageOffer, formUnionBrokerageOffer } from "../src/union-border.mjs";

const offer = formUnionBrokerageOffer({ provider: "urn:market:provider", service: "market-evidence", price: { asset: "USDC", unit: "base", amount: "1" }, validUntil: "2031-01-01T00:00:00.000Z", terms: "evidence only" });
const provider = Object.assign(async () => ({ id: "evidence" }), { originatingActor: "urn:market:provider", preflight: async () => {}, externalEvidence: () => [] });

test("union market rejects credential smuggling before provider work", async () => {
  let invoked = false;
  const guarded = Object.assign(async () => { invoked = true; return { id: "evidence" }; }, provider);
  await assert.rejects(contractUnionBrokerageOffer({ offer, customer: "customer", request: { nested: { apiSecret: "forbidden" } }, considerationGrant: { id: "grant", asset: "USDC", unit: "base", amount: "1" }, acceptedAt: "2030-01-01T00:00:00.000Z", provider: guarded }), /credential-bearing-union-market-request-refused/);
  assert.equal(invoked, false);
});

test("union market refuses a forged consideration grant or wrong provider actor", async () => {
  await assert.rejects(contractUnionBrokerageOffer({ offer, customer: "customer", request: {}, considerationGrant: { id: "grant", asset: "USDC", unit: "base", amount: "2" }, acceptedAt: "2030-01-01T00:00:00.000Z", provider }), /consideration/);
  const wrong = Object.assign(async () => ({ id: "evidence" }), { ...provider, originatingActor: "urn:other" });
  await assert.rejects(contractUnionBrokerageOffer({ offer, customer: "customer", request: {}, considerationGrant: { id: "grant", asset: "USDC", unit: "base", amount: "1" }, acceptedAt: "2030-01-01T00:00:00.000Z", provider: wrong }), /provider-unavailable-or-mismatched/);
});

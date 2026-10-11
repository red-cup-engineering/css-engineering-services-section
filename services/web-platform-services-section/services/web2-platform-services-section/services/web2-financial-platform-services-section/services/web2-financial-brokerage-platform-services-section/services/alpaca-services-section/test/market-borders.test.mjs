import assert from "node:assert/strict";
import test from "node:test";
import { formVirtualsBrokerageOffering, createVirtualsBrokerageJobHandler } from "../services/virtuals-brokerage-products-border/src/virtuals-border.mjs";
import { formUnionBrokerageOffer, contractUnionBrokerageOffer, deliverUnionBrokerageContract } from "../services/union-brokerage-products-market-border/src/union-border.mjs";

const provider = (actor, output) => Object.assign(async (request) => output(request), { originatingActor: actor, preflight: async () => true,
  externalEvidence: () => [{ uri: "urn:test:market-evidence", digest: "sha256:market-evidence" }] });
const recordDelivery = async ({ originatingActor, output }) => ({ witness: { id: `witness:${output.id}`, originatingActor } });

test("Virtuals border binds one service-only job to exact price, funding, provider, and terminal receipt", async () => {
  const offering = formVirtualsBrokerageOffering({ operator: "urn:operator:brokerage", operatorWallet: "0x0000000000000000000000000000000000000001", product: "issuer-evidence-packet", publishedAt: "2026-07-22T22:30:00.000Z" });
  const events = [], handler = createVirtualsBrokerageJobHandler({ providers: { "issuer-evidence-packet": provider("urn:ame:issuer-research-media-service", ({ ticker }) => ({ id: `packet:${ticker}`, ticker })) }, recordDelivery,
    marketClient: { acceptJob: async (x) => { events.push(["accept", x]); return { accepted: true }; }, deliverJob: async (x) => { events.push(["deliver", x]); return { completed: true, receipt: "virtuals:terminal:1" }; } } });
  const receipt = await handler({ offering, job: { id: "42", product: "issuer-evidence-packet", priceUsdc: "0.25", serviceOnly: true, settlement: { status: "funded", reference: "virtuals:funding:42" }, requirement: { ticker: "NVDA" } } });
  assert.equal(receipt.deliveryReceipt, "virtuals:terminal:1"); assert.match(receipt.independentWitness, /^witness:/u); assert.equal(receipt.buyerFundCustody, false); assert.deepEqual(events.map(([kind]) => kind), ["accept", "deliver"]);
  await assert.rejects(() => handler({ offering, job: { id: "43", product: offering.product, priceUsdc: "0.24", serviceOnly: true, settlement: { status: "funded", reference: "x" }, requirement: {} } }), /does-not-match/u);
  await assert.rejects(() => handler({ offering, job: { id: "44", product: offering.product, priceUsdc: "0.25", serviceOnly: true, settlement: { status: "funded", reference: "x" }, requirement: { apiSecret: "no" } } }), /credential-bearing/u);
});

test("Virtuals refuses invalid provider work before accepting a funded job", async () => {
  const offering = formVirtualsBrokerageOffering({ operator: "urn:operator:brokerage", operatorWallet: "0x0000000000000000000000000000000000000001", product: "issuer-evidence-packet", publishedAt: "2026-07-22T22:30:00.000Z" });
  let accepted = 0; const refusing = provider("urn:ame:issuer-research-media-service", async () => ({ id: "unreachable" }));
  Object.defineProperty(refusing, "preflight", { value: async () => { throw new TypeError("issuer-request-invalid"); } });
  const handler = createVirtualsBrokerageJobHandler({ providers: { "issuer-evidence-packet": refusing }, recordDelivery,
    marketClient: { acceptJob: async () => { accepted += 1; return { accepted: true }; }, deliverJob: async () => ({ completed: true, receipt: "unreachable" }) } });
  await assert.rejects(() => handler({ offering, job: { id: "invalid", product: offering.product, priceUsdc: offering.priceUsdc, serviceOnly: true,
    settlement: { status: "funded", reference: "virtuals:funding:invalid" }, requirement: {} } }), /issuer-request-invalid/u);
  assert.equal(accepted, 0);
});

test("Union border performs exact-asset offer, contract, provider delivery, settlement, and witnessed revenue receipt", async () => {
  const offer = formUnionBrokerageOffer({ provider: "urn:ame:account-evidence-reconciliation-service", service: "account-normalization-and-reconciliation", price: { asset: "urn:union:credit:relative-resolution-milliquanta-v1", unit: "relative-resolution-milliquanta-v1", amount: "500" }, validUntil: "2030-01-01T00:00:00.000Z", terms: { recordsIncluded: 100 } });
  const reconciliation = provider(offer.provider, async () => ({ id: "reconciliation:1" }));
  const contract = await contractUnionBrokerageOffer({ offer, customer: "urn:customer:one", request: { accountReference: "account-1" }, considerationGrant: { id: "grant:1", asset: offer.price.asset, unit: offer.price.unit, amount: "500" }, acceptedAt: "2026-07-22T22:30:00.000Z", provider: reconciliation });
  assert.deepEqual(contract.considerationGrant, { id: "grant:1", asset: offer.price.asset, unit: offer.price.unit, amount: "500" });
  const receipt = await deliverUnionBrokerageContract({ contract, provider: reconciliation, recordDelivery, settle: async ({ contract: c, witness }) => ({ success: Boolean(witness.id), contract: c.id, receipt: "union:settlement:1" }) });
  assert.equal(receipt.revenueRecognized, true); assert.match(receipt.independentWitness, /^witness:/u); assert.equal(receipt.customerBrokerageProfitRecognizedAsRevenue, false);
  await assert.rejects(() => contractUnionBrokerageOffer({ offer, customer: "x", request: {}, considerationGrant: { id: "g", asset: "USDC", unit: "USDC", amount: "500" }, acceptedAt: "2026-07-22T22:30:00.000Z", provider: reconciliation }), /exactly-match/u);
  await assert.rejects(() => contractUnionBrokerageOffer({ offer, customer: "x", request: {}, considerationGrant: { id: "g", ...offer.price }, acceptedAt: "not-a-time", provider: reconciliation }), /current-union-offer/u);
});

test("Union refuses invalid provider work before forming a consideration contract", async () => {
  const actor = "urn:ame:issuer-research-media-service", offer = formUnionBrokerageOffer({ provider: actor, service: "issuer-evidence-packet",
    price: { asset: "urn:union:credit:relative-resolution-milliquanta-v1", unit: "relative-resolution-milliquanta-v1", amount: "250" }, validUntil: "2030-01-01T00:00:00.000Z", terms: {} });
  const refusing = provider(actor, async () => ({ id: "unreachable" })); Object.defineProperty(refusing, "preflight", { value: async () => { throw new TypeError("issuer-request-invalid"); } });
  await assert.rejects(() => contractUnionBrokerageOffer({ offer, customer: "urn:customer:one", request: {}, considerationGrant: { id: "grant:invalid", ...offer.price },
    acceptedAt: "2026-07-22T22:30:00.000Z", provider: refusing }), /issuer-request-invalid/u);
});

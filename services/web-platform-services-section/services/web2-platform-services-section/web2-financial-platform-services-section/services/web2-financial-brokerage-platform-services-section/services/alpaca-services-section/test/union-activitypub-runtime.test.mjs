import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ACTIVITYSTREAMS_PUBLIC, createUnionBrokerageActivityPubCallbacks, createUnionMarketState, decodeUnionMarketRmn, encodeUnionMarketRmn, extractUnionMarketActivity, projectUnionMarketActivity } from "../services/union-brokerage-products-market-border/src/activitypub-runtime.mjs";
import { formUnionBrokerageOffer } from "../services/union-brokerage-products-market-border/src/union-border.mjs";

const MARKET_ORIGIN = "https://market.example/", MARKET_ID = "brokerage", MARKET_ACTOR = `${MARKET_ORIGIN}actors/${MARKET_ID}`;
const CUSTOMER_ORIGIN = "https://customer.example/", CUSTOMER_ACTOR = `${CUSTOMER_ORIGIN}actors/customer`, CUSTOMER_INBOX = `${CUSTOMER_ACTOR}/inbox`;
const MARKET_CARD = `${MARKET_ORIGIN}.well-known/agent-card.json`, CUSTOMER_CARD = `${CUSTOMER_ORIGIN}.well-known/agent-card.json`;
const actor = "urn:ame:issuer-research-media-service";
const offer = formUnionBrokerageOffer({ provider: actor, service: "issuer-evidence-packet", price: { asset: "urn:iso:currency:USDC", unit: "USDC", amount: "0.25" }, validUntil: "2030-01-01T00:00:00.000Z", terms: { delivery: "independently-witnessed" } });
let executions = 0, witnesses = 0;
const provider = Object.assign(async () => { executions += 1; return { id: "sha256:issuer-output", type: "IssuerEvidencePacket" }; }, { originatingActor: actor, preflight: async (request) => { if (!request.ticker) throw new TypeError("ticker-required"); }, externalEvidence: () => [{ uri: "urn:filing", digest: "sha256:filing" }] });
const purchase = (request = { ticker: "NVDA" }) => ({ type: "UnionBrokeragePurchaseRequest", version: 1, offer: offer.id, customerActor: CUSTOMER_ACTOR, customerInbox: CUSTOMER_INBOX, request,
  considerationGrant: { id: "grant:one", asset: offer.price.asset, unit: offer.price.unit, amount: offer.price.amount }, acceptedAt: "2026-07-22T22:30:00.000Z" });
const incoming = (value = purchase()) => projectUnionMarketActivity({ type: "Offer", origin: CUSTOMER_ORIGIN, identifier: "customer", recipient: MARKET_ACTOR, objectBytes: encodeUnionMarketRmn(value), agentCard: CUSTOMER_CARD });

function runtime(root, { deliverResponse } = {}) {
  const delivered = [], events = []; let settlements = 0;
  const callbacks = createUnionBrokerageActivityPubCallbacks({ origin: MARKET_ORIGIN, identifier: MARKET_ID, agentCard: MARKET_CARD, offers: [offer], providers: { [offer.service]: provider }, state: createUnionMarketState({ stateRoot: root, now: () => "2026-07-22T22:30:00.000Z" }),
    recordDelivery: async ({ originatingActor }) => { witnesses += 1; return { witness: { id: "sha256:independent-witness", originatingActor } }; },
    settle: async ({ contract }) => { settlements += 1; return { success: true, contract: contract.id, receipt: "union:direct-witness:1" }; },
    recordEvent: async (event) => { events.push(event); }, deliverResponse: deliverResponse ?? (async (delivery) => { delivered.push(delivery); return { delivered: true, activity: delivery.activity.id }; }) });
  return { callbacks, delivered, events, settlements: () => settlements };
}

test("Union market publishes exact standard ActivityStreams Offer projections from typed RMN", async () => {
  const root = mkdtempSync(join(tmpdir(), "union-brokerage-")); try {
    const { callbacks } = runtime(root), page = await callbacks.listOutbox({}); assert.equal(page.items.length, 1);
    const json = await page.items[0].toJsonLd({ format: "compact" }), extracted = extractUnionMarketActivity(json, { expectedActor: MARKET_ACTOR, expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: MARKET_CARD });
    const decoded = decodeUnionMarketRmn(extracted.objectBytes); assert.equal(decoded.id, offer.id); assert.deepEqual(decoded.price, offer.price); assert.equal(decoded.conversionRate, null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("verified customer Offer contracts, executes, witnesses, settles, and returns one ActivityPub Accept", async () => {
  executions = 0; witnesses = 0; const root = mkdtempSync(join(tmpdir(), "union-brokerage-")); try {
    const service = runtime(root), activity = incoming(), first = await service.callbacks.onActivity({ jsonLd: activity });
    assert.equal(first.disposition, "accepted"); assert.equal(service.settlements(), 1); assert.equal(executions, 1); assert.equal(witnesses, 1); assert.equal(service.delivered.length, 1); assert.equal(service.delivered[0].activity.type, "Accept");
    const replay = await service.callbacks.onActivity({ jsonLd: activity }); assert.equal(replay.receipt, first.receipt); assert.equal(service.settlements(), 1); assert.equal(executions, 1); assert.equal(witnesses, 1); assert.equal(service.delivered.length, 1); assert.equal(service.events.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("invalid work receives a standard Reject before contract, provider execution, or settlement", async () => {
  executions = 0; witnesses = 0; const root = mkdtempSync(join(tmpdir(), "union-brokerage-")); try {
    const service = runtime(root), result = await service.callbacks.onActivity({ jsonLd: incoming(purchase({})) });
    assert.equal(result.disposition, "rejected"); assert.equal(service.settlements(), 0); assert.equal(executions, 0); assert.equal(witnesses, 0); assert.equal(service.delivered[0].activity.type, "Reject");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a failed Accept transport never turns a settled purchase into a Reject", async () => {
  executions = 0; witnesses = 0; const root = mkdtempSync(join(tmpdir(), "union-brokerage-")); try {
    let attempted = 0; const service = runtime(root, { deliverResponse: async () => { attempted += 1; throw new Error("recipient-inbox-unavailable"); } });
    const first = await service.callbacks.onActivity({ jsonLd: incoming() });
    assert.equal(first.disposition, "accepted-response-pending"); assert.equal(service.settlements(), 1); assert.equal(executions, 1); assert.equal(witnesses, 1); assert.equal(attempted, 1);
    const replay = await service.callbacks.onActivity({ jsonLd: incoming() });
    assert.equal(replay.disposition, "accepted-response-pending"); assert.equal(service.settlements(), 1); assert.equal(executions, 1); assert.equal(witnesses, 1); assert.equal(attempted, 1);
    assert.equal(service.events.some(({ type }) => type === "UnionBrokerageActivityPubRefusal"), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("Union RMN codec rejects noncanonical trailing bytes", () => {
  const encoded = encodeUnionMarketRmn(purchase()); assert.equal(decodeUnionMarketRmn(encoded).type, "UnionBrokeragePurchaseRequest");
  assert.throws(() => decodeUnionMarketRmn(Buffer.concat([encoded, Buffer.from([0])])), /canonical|trailing|CBOR/u);
});

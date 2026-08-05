import assert from "node:assert/strict";
import test from "node:test";
import { createEstherOnboardingRuntime, ESTHER_PRINCIPAL } from "../src/esther-onboarding.mjs";

const AT = "2026-07-22T23:30:00.000Z", EXPIRY = "2030-01-01T00:00:00.000Z";
function recorder(events) { const record = async (event) => { events.push(event); return { graph: `ni:///sha-256;event-${events.length}` }; };
  return Object.assign(record, { originatingActor: "urn:ame:principal-brokerage-interface", witnessActor: "urn:ame:brokerage-independent-witness-and-books" }); }

test("Esther's sponsored onboarding circuit records offer, observed-capital contract, attenuated grant, and revocation", async () => {
  const events = [], runtime = createEstherOnboardingRuntime({}, { now: () => AT, recordEvent: recorder(events) });
  const prepared = await runtime.prepareSponsoredOffer({ validUntil: EXPIRY });
  assert.equal(prepared.value.venue, "alpaca-trading-paper"); assert.equal(prepared.value.scopes.includes("orders:live"), false); assert.equal(prepared.value.scopes.includes("orders:paper"), true);
  assert.equal(prepared.value.principal, ESTHER_PRINCIPAL); assert.equal(prepared.value.expectedCapital.amount, 100); assert.equal(prepared.value.expectedCapital.role, "planning-observation-not-product-ceiling");
  assert.equal(prepared.value.riskPolicy.maximumLossFraction, 1); assert.equal(prepared.value.riskPolicy.leverageLimit, 1); assert.equal(prepared.value.effect, "offer-only-no-brokerage-authority-no-wallet-authority");
  const accepted = await runtime.accept({ offer: prepared.value, accountReference: "alpaca-connect:opaque-esther-account", observedCapitalAmount: 137.42, acceptanceReference: "urn:principal-acceptance:esther:one" });
  assert.equal(accepted.value.capital.amount, 137.42); assert.equal(accepted.value.risk.maximumLossAmount, 137.42); assert.equal(accepted.value.consideration.charged, false);
  const granted = await runtime.grant({ contract: accepted.value, adapter: "alpaca-connect", credentialReference: "urn:brokerage-credential:opaque", scopes: ["account:read", "positions:read"], validUntil: EXPIRY });
  assert.deepEqual(granted.value.scopes, ["account:read", "positions:read"]); assert.equal(granted.value.revoked, false);
  const revoked = await runtime.revoke({ grant: granted.value, reason: "principal-request" }); assert.equal(revoked.value.effective, true);
  assert.deepEqual(events.map(({ type }) => type), ["principal-brokerage-onboarding-offer-formed", "principal-brokerage-onboarding-offer-accepted", "principal-brokerage-authority-granted", "principal-brokerage-authority-revoked"]);
});

test("Esther circuit refuses an uncontracted recorder and credential-bearing onboarding input", async () => {
  assert.throws(() => createEstherOnboardingRuntime({}, { recordEvent: async () => ({}) }), /independent-recorder/u);
  const runtime = createEstherOnboardingRuntime({}, { now: () => AT, recordEvent: recorder([]) });
  await assert.rejects(() => runtime.prepare({ ...estherInput(), apiSecret: "must-not-cross" }), /credential-bearing/u);
});

function estherInput() { return { principal: ESTHER_PRINCIPAL, venue: "alpaca-connect", expectedCapital: { amount: 100, currency: "USD" }, riskPolicy: { maximumLossFraction: 1, maximumOrderFraction: 1, maximumAggregateMultiple: 1, concentrationLimit: 1, leverageLimit: 1 }, scopes: ["account:read"], validUntil: EXPIRY, sponsored: true }; }

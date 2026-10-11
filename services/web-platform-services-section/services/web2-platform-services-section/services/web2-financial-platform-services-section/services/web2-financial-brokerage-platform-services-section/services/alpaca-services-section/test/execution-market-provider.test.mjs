import assert from "node:assert/strict";
import test from "node:test";
import { formAggressivePortfolioIntent } from "../services/alpha-portfolio-order-intent-service/src/aggressive-intent.mjs";
import { createExecutionTransportProvider } from "../services/brokerage-execution-transport-service/src/execute-intent.mjs";
import { formPrincipalBrokerageContract, grantBrokerageAuthority } from "../services/principal-brokerage-interface/src/principal-contract.mjs";
import { createBrokerageProductProviders, indexBrokerageProvidersByService } from "../src/market-runtime.mjs";

const NOW = "2026-07-22T23:45:00.000Z", EXPIRY = "2030-01-01T00:00:00.000Z";
function records() {
  const contract = formPrincipalBrokerageContract({ principal: "urn:principal:customer", venue: "alpaca-connect", accountReference: "alpaca:opaque", capital: { amount: 100, currency: "USD" },
    risk: { maximumLossAmount: 100, maximumOrderNotional: 100, maximumAggregateNotional: 100, concentrationLimit: 1, leverageLimit: 1 }, scopes: ["orders:intent", "orders:live"], validUntil: EXPIRY });
  const authorityGrant = grantBrokerageAuthority({ contract, adapter: "alpaca-connect", credentialReference: "urn:brokerage-credential:opaque", scopes: ["orders:live"], validUntil: EXPIRY });
  const packet = { id: "sha256:evidence", type: "IssuerEvidencePacket" };
  const intent = formAggressivePortfolioIntent({ contract, evidencePackets: [packet], symbol: "NVDA", notional: 100, maximumLoss: 100, thesis: "catalyst", falsifier: "demand reverses",
    liquidityPremise: "fractional order inside available liquidity", executionPremise: "day market order and reconcile", scenarios: [{ pnl: 50 }, { pnl: -100 }] });
  return { contract, authorityGrant, intent, revocation: null };
}

test("paid execution resolves trusted sovereign records before preflight and again before one venue effect", async () => {
  const trusted = records(); let resolutions = 0, orders = 0;
  const provider = createExecutionTransportProvider({ resolveExecutionRecords: async () => { resolutions += 1; return trusted; }, clock: () => NOW,
    adapter: { placeOrder: async ({ order }) => { orders += 1; return { id: `venue:${order.client_order_id}`, status: 200 }; } } });
  const request = { contractReference: trusted.contract.id, authorityGrantReference: trusted.authorityGrant.id, intentReference: trusted.intent.id };
  await provider.preflight(request); assert.equal(orders, 0);
  const receipt = await provider(request); assert.equal(receipt.type, "BrokerageExecutionTransportReceipt"); assert.equal(orders, 1); assert.equal(resolutions, 2); assert.equal(receipt.credentialsExported, false);
  const products = createBrokerageProductProviders({ resolveExecutionRecords: async () => trusted, executionAdapter: { placeOrder: async () => ({ id: "venue:one", status: 200 }) }, executionClock: () => NOW });
  assert.equal(indexBrokerageProvidersByService(products)["execution-transport"], products.execution);
});

test("revocation appearing after paid-product preflight is refused before venue execution", async () => {
  const trusted = records(); let resolutions = 0, orders = 0;
  const provider = createExecutionTransportProvider({ resolveExecutionRecords: async () => { resolutions += 1; return resolutions === 1 ? trusted : { ...trusted, revocation: { type: "BrokerageAuthorityRevocation", effective: true } }; },
    clock: () => NOW, adapter: { placeOrder: async () => { orders += 1; return { id: "unreachable", status: 200 }; } } });
  const request = { contractReference: trusted.contract.id, authorityGrantReference: trusted.authorityGrant.id, intentReference: trusted.intent.id };
  await provider.preflight(request); await assert.rejects(() => provider(request), /authority-refused/u); assert.equal(orders, 0);
  const mismatched = createExecutionTransportProvider({ resolveExecutionRecords: async () => trusted, clock: () => NOW, adapter: { placeOrder: async () => ({ id: "unreachable" }) } });
  await assert.rejects(() => mismatched.preflight({ ...request, intentReference: "sha256:forged" }), /reference-mismatch/u);
});

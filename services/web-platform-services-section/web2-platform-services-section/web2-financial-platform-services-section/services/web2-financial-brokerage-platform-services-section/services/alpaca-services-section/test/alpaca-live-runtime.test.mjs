import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createAuthorityCustodyActuator, createEphemeralAuthorityCustodySubstrate } from "../../../../red-cup-engineering/services/software-services-section/services/resource-brokerage-service-section/services/authority-custody-actuator/src/authority-custody-actuator.mjs";
import { createBrokerageAuthorityCustody } from "../services/brokerage-authority-custody-service/src/authority-custody.mjs";
import { createAlpacaAdapter } from "../services/pluggable-venue-adapter-service/src/alpaca-adapter.mjs";
import { formPrincipalBrokerageContract, grantBrokerageAuthority } from "../services/principal-brokerage-interface/src/principal-contract.mjs";

const NOW = "2026-07-23T02:00:00.000Z", EXPIRY = "2030-01-01T00:00:00.000Z";
const scopes = ["account:read", "positions:read", "orders:read", "orders:live", "activities:read"];
const createCustody = (options) => {
  const authorityCustody = createAuthorityCustodyActuator({ substrate: createEphemeralAuthorityCustodySubstrate(), clock: options.clock });
  return { authorityCustody, custody: createBrokerageAuthorityCustody({ ...options, authorityCustody }) };
};
const storeLive = (authorityCustody, { principal, venue, environment, accountReference, credential }) => authorityCustody.store({ provider: "alpaca", subject: principal, attributes: { kind: "alpaca-trading-api-key-live", venue, environment, accountReference }, secret: { kind: "alpaca-trading-api-key-live", principal, venue, environment, accountReference, credential } });
function records(reference = "urn:brokerage-credential:live") {
  const contract = formPrincipalBrokerageContract({ principal: "urn:principal:esther-davis", venue: "alpaca-trading-live", accountReference: "opaque-live-account", capital: { amount: 100, currency: "USD" }, risk: { maximumLossAmount: 100, maximumOrderNotional: 100, maximumAggregateNotional: 100, concentrationLimit: 1, leverageLimit: 1 }, scopes, validUntil: EXPIRY, acceptanceReference: "urn:acceptance:live" });
  const authorityGrant = grantBrokerageAuthority({ contract, adapter: "alpaca-trading-live", credentialReference: reference, scopes, validUntil: EXPIRY });
  return { contract, authorityGrant, intent: Object.freeze({ id: "sha256:live-intent", type: "AggressiveBrokerageOrderIntent", contract: contract.id, symbol: "NVDA", side: "buy", notional: 100, maximumLoss: 100 }) };
}
const liveClientOrderId = (contractId, intentId) => `live-${createHash("sha256").update(`${contractId}:${intentId}`).digest("hex").slice(0, 48)}`;

test("live trading credential admission returns only an opaque authority reference", async () => {
  const { authorityCustody } = createCustody({ clock: () => NOW, transport: async () => ({ status: 200, body: {} }) });
  const credential = await storeLive(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-live", environment: "live", accountReference: "opaque-live-account", credential: { apiKeyId: "private-id", apiSecret: "private-secret" } });
  assert.equal(credential.provider, "alpaca"); assert.equal(credential.secretBytesReturned, false);
});

test("live requests are confined to api.alpaca.markets and refuse the paper host", async () => {
  let currentGrant; const calls = [];
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => currentGrant, transport: async (request) => { calls.push(request); return { status: 200, headers: { "x-request-id": "live-1" }, body: { id: "acct" } }; } });
  const credential = await storeLive(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-live", environment: "live", accountReference: "opaque-live-account", credential: { apiKeyId: "private-id", apiSecret: "private-secret" } });
  for (const baseUrl of ["http://api.alpaca.markets", "https://paper-api.alpaca.markets", "https://user:pass@api.alpaca.markets", "https://api.alpaca.markets:444", "https://api.alpaca.markets/v2", "https://api.alpaca.markets?x=1"]) assert.throws(() => createAlpacaAdapter({ product: "alpaca-trading-live", baseUrl, authorityClient: custody }), /base-url-refused/u);
  const adapter = createAlpacaAdapter({ product: "alpaca-trading-live", baseUrl: "https://api.alpaca.markets", authorityClient: custody });
  const trusted = records(credential.reference); currentGrant = trusted.authorityGrant;
  const receipt = await adapter.readAccount({ grant: trusted.authorityGrant, now: NOW });
  assert.equal(receipt.status, 200); assert.equal(new URL(calls[0].url).origin, "https://api.alpaca.markets");
  assert.deepEqual(Object.keys(calls[0].headers).sort(), ["APCA-API-KEY-ID", "APCA-API-SECRET-KEY"]);
  await assert.rejects(() => custody.authorizedRequest({ authorityGrantReference: trusted.authorityGrant.id, product: "alpaca-trading-live", method: "GET", url: "https://paper-api.alpaca.markets/v2/account" }), /live-trading-host-refused/u);
});

test("live custody independently resolves and binds principal, account, revocation, expiry, and scope", async () => {
  let resolved, transports = 0;
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => resolved, transport: async () => { transports += 1; return { status: 201, body: {} }; } });
  const credential = await storeLive(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-live", environment: "live", accountReference: "opaque-live-account", credential: { apiKeyId: "x", apiSecret: "y" } });
  const trusted = records(credential.reference), ref = trusted.authorityGrant.id, post = { authorityGrantReference: ref, product: "alpaca-trading-live", method: "POST", url: "https://api.alpaca.markets/v2/orders", body: { symbol: "NVDA" } };
  resolved = { ...trusted.authorityGrant, principal: "urn:principal:someone-else" }; await assert.rejects(() => custody.authorizedRequest(post), /binding-mismatch/u);
  resolved = { ...trusted.authorityGrant, revoked: true }; await assert.rejects(() => custody.authorizedRequest(post), /current-live-authority/u);
  resolved = { ...trusted.authorityGrant, validUntil: "2020-01-01T00:00:00.000Z" }; await assert.rejects(() => custody.authorizedRequest(post), /live-authority-expired/u);
  resolved = { ...trusted.authorityGrant, scopes: ["account:read"] };
  await assert.rejects(() => custody.authorizedRequest({ ...post, scope: "orders:live" }), /reference-only/u);
  await assert.rejects(() => custody.authorizedRequest(post), /operation-scope-refused/u);
  assert.equal(transports, 0);
});

test("live custody requires one exact independently resolved order authorization and refuses drift or revocation", async () => {
  let grant, operationAuthorization, transports = 0;
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => grant, resolveLiveOperationAuthorization: async () => operationAuthorization,
    transport: async () => { transports += 1; return { status: 201, headers: {}, body: { status: "accepted" } }; } });
  const credential = await storeLive(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-live", environment: "live", accountReference: "opaque-live-account", credential: { apiKeyId: "x", apiSecret: "y" } });
  const trusted = records(credential.reference); grant = trusted.authorityGrant;
  const clientOrderId = liveClientOrderId(trusted.contract.id, trusted.intent.id);
  const exactBody = { symbol: trusted.intent.symbol, side: trusted.intent.side, notional: trusted.intent.notional, type: "market", time_in_force: "day", client_order_id: clientOrderId };
  const orderAuthorization = { contract: trusted.contract, authorityGrant: trusted.authorityGrant, intent: trusted.intent, revocation: null };
  const request = { authorityGrantReference: grant.id, operationAuthorizationReference: trusted.intent.id, product: "alpaca-trading-live", method: "POST", url: "https://api.alpaca.markets/v2/orders", body: exactBody };
  operationAuthorization = orderAuthorization;
  await assert.rejects(() => custody.authorizedRequest({ ...request, operationAuthorizationReference: undefined }), /exact-live-operation-authorization/u);
  await assert.rejects(() => custody.authorizedRequest({ ...request, body: { ...exactBody, notional: 1_000_000 } }), /live-order-body-drift-refused/u);
  await assert.rejects(() => custody.authorizedRequest({ ...request, body: { ...exactBody, client_order_id: "attacker-id" } }), /live-order-body-drift-refused/u);
  operationAuthorization = { ...orderAuthorization, revocation: { effective: true } };
  await assert.rejects(() => custody.authorizedRequest(request), /live-order-authorization-binding-refused/u); assert.equal(transports, 0);
  operationAuthorization = orderAuthorization;
  const adapter = createAlpacaAdapter({ product: "alpaca-trading-live", baseUrl: "https://api.alpaca.markets", authorityClient: custody });
  const placed = await adapter.placeOrder({ grant, order: exactBody, operationAuthorizationReference: trusted.intent.id, now: NOW }); assert.equal(placed.status, 201); assert.equal(transports, 1);
  const cancelAuthorization = { id: "urn:live-cancel:one", type: "LiveOrderCancellationAuthorization", authorityGrant: grant.id, orderId: "venue-order/1", revoked: false, validUntil: EXPIRY };
  operationAuthorization = cancelAuthorization;
  const canceled = await adapter.cancelOrder({ grant, orderId: "venue-order/1", operationAuthorizationReference: cancelAuthorization.id, now: NOW }); assert.equal(canceled.status, 201); assert.equal(transports, 2);
});

test("a live-kind credential is refused by every other product, and an observation-shortcut reference is refused for live", async () => {
  let currentGrant;
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => currentGrant, transport: async () => ({ status: 200, body: {} }) });
  const credential = await storeLive(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-live", environment: "live", accountReference: "opaque-live-account", credential: { apiKeyId: "x", apiSecret: "y" } });
  await assert.rejects(() => custody.authorizedRequest({ credentialReference: credential.reference, product: "alpaca-broker", scope: "account:read", method: "GET", url: "https://broker-api.alpaca.markets/v1/trading/accounts/a/account" }), /credential-product-mismatch/u);
  const trusted = records(credential.reference); currentGrant = trusted.authorityGrant;
  await assert.rejects(() => custody.authorizedRequest({ authorityGrantReference: trusted.authorityGrant.id, observationAuthorizationReference: "urn:whatever", product: "alpaca-trading-live", method: "GET", url: "https://api.alpaca.markets/v2/account" }), /live-observation-shortcut-not-supported/u);
});

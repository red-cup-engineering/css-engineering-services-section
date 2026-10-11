import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createAuthorityCustodyActuator, createEphemeralAuthorityCustodySubstrate } from "./support/ephemeral-authority-custody.mjs";
import { createBrokerageAuthorityCustody } from "@red-cup-engineering/brokerage-authority-custody-service";
import { createAlpacaAdapter } from "@red-cup-engineering/pluggable-venue-adapter-service/alpaca";
import { createPaperExecutionAndReconciliationProvider } from "@red-cup-engineering/brokerage-execution-transport-service";
import { formPrincipalBrokerageContract, grantBrokerageAuthority } from "@red-cup-engineering/principal-brokerage-interface";

const NOW = "2026-07-23T02:00:00.000Z", EXPIRY = "2030-01-01T00:00:00.000Z";
const scopes = ["account:read", "positions:read", "orders:read", "orders:paper", "activities:read"];
const createCustody = (options) => {
  const authorityCustody = createAuthorityCustodyActuator({ substrate: createEphemeralAuthorityCustodySubstrate(), clock: options.clock });
  return { authorityCustody, custody: createBrokerageAuthorityCustody({ ...options, authorityCustody }) };
};
const storePaper = (authorityCustody, { principal, venue, environment, accountReference, credential }) => authorityCustody.store({ provider: "alpaca", subject: principal, attributes: { kind: "alpaca-trading-api-key", venue, environment, accountReference }, secret: { kind: "alpaca-trading-api-key", principal, venue, environment, accountReference, credential } });
function records(reference = "urn:brokerage-credential:paper") {
  const contract = formPrincipalBrokerageContract({ principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", accountReference: "opaque-paper-account", capital: { amount: 100, currency: "USD" }, risk: { maximumLossAmount: 100, maximumOrderNotional: 100, maximumAggregateNotional: 100, concentrationLimit: 1, leverageLimit: 1 }, scopes, validUntil: EXPIRY, acceptanceReference: "urn:acceptance:paper" });
  const authorityGrant = grantBrokerageAuthority({ contract, adapter: "alpaca-trading-paper", credentialReference: reference, scopes, validUntil: EXPIRY });
  return { contract, authorityGrant, intent: Object.freeze({ id: "sha256:paper-intent", type: "AggressiveBrokerageOrderIntent", contract: contract.id, symbol: "NVDA", side: "buy", notional: 100, maximumLoss: 100 }) };
}
const requestFor = (trusted) => ({ contractReference: trusted.contract.id, authorityGrantReference: trusted.authorityGrant.id, intentReference: trusted.intent.id });
const observation = (id) => ({ id, status: 200, payload: {} });
function fakeAdapter({ initialStatus = 404, placedStatus = 201, venueStatus = "accepted", mismatch = false } = {}) {
  let stored = initialStatus === 200, places = 0, lookups = 0;
  return { get places() { return places; }, get lookups() { return lookups; },
    async getOrderByClientOrderId({ clientOrderId }) { lookups += 1; return stored ? { id: `lookup:${lookups}`, status: 200, payload: { client_order_id: mismatch ? "wrong-id" : clientOrderId, status: venueStatus } } : { id: `lookup:${lookups}`, status: initialStatus, payload: {} }; },
    async placeOrder({ order }) { places += 1; stored = true; await Promise.resolve(); return { id: `placement:${places}`, status: placedStatus, payload: { client_order_id: order.client_order_id } }; },
    async readAccount() { return observation("account"); }, async listPositions() { return observation("positions"); }, async listOpenOrders() { return { id: "open-orders", status: 200, payload: [] }; }, async listActivities() { return observation("activities"); },
  };
}

test("paper credentials are opaque, exact-origin confined, and recursively scrub mixed secret spellings", async () => {
  let currentGrant; const calls = [], secretPayload = { id: "safe-order-id", Authorization: "x", nested: { API_KEY_ID: "x", "api-secret": "x", "APCA-API-SECRET-KEY": "x", "x-client-secret": "x", "x-access-token": "x", "x-authorization": "x", clientId: "x", CLIENT_SECRET: "x", Access_Token: "x", "refresh-token": "x", private_key: "x", Password: "x", safe: "kept" } };
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => currentGrant, transport: async (request) => { calls.push(request); return { status: 200, headers: { "x-request-id": "paper-1", AUTHORIZATION: "x", "APCA-API-KEY-ID": "x", "x-client-secret": "x" }, body: secretPayload }; } });
  const credential = await storePaper(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", environment: "paper", accountReference: "opaque-paper-account", credential: { apiKeyId: "private-id", apiSecret: "private-secret" } });
  assert.equal(credential.provider, "alpaca"); assert.equal(credential.secretBytesReturned, false);
  for (const baseUrl of ["http://paper-api.alpaca.markets", "https://api.alpaca.markets", "https://user:pass@paper-api.alpaca.markets", "https://paper-api.alpaca.markets:444", "https://paper-api.alpaca.markets/v2", "https://paper-api.alpaca.markets?x=1"]) assert.throws(() => createAlpacaAdapter({ product: "alpaca-trading-paper", baseUrl, authorityClient: custody }), /base-url-refused/u);
  const adapter = createAlpacaAdapter({ product: "alpaca-trading-paper", baseUrl: "https://paper-api.alpaca.markets:443", authorityClient: custody });
  const trusted = records(credential.reference); currentGrant = trusted.authorityGrant; const receipt = await adapter.readAccount({ grant: trusted.authorityGrant, now: NOW });
  assert.deepEqual(receipt.payload, { id: "safe-order-id", nested: { safe: "kept" } }); assert.deepEqual(receipt.authorityCustodyReceipt.secretBytesReturned, false); assert.deepEqual(receipt.venueRequestId, "paper-1");
  assert.equal(new URL(calls[0].url).origin, "https://paper-api.alpaca.markets"); assert.deepEqual(Object.keys(calls[0].headers).sort(), ["APCA-API-KEY-ID", "APCA-API-SECRET-KEY"]);
  await assert.rejects(() => custody.authorizedRequest({ authorityGrantReference: trusted.authorityGrant.id, product: "alpaca-trading-paper", method: "GET", url: "https://user:pass@paper-api.alpaca.markets/v2/account" }), /host-refused/u);
  await assert.rejects(() => custody.authorizedRequest({ credentialReference: credential.reference, product: "unknown", scope: "account:read", method: "GET", url: "https://paper-api.alpaca.markets/v2/account" }), /unknown-brokerage-product/u);
  await assert.rejects(() => adapter.placeOrder({ grant: trusted.authorityGrant, order: { symbol: "NVDA", nested: { Client_Secret: "must-refuse" } }, now: NOW }), /credential-bearing/u);
});

test("paper boundary rejects malformed times and invalid credential expiry", async () => {
  const invalidActuator = createAuthorityCustodyActuator({ substrate: createEphemeralAuthorityCustodySubstrate(), clock: () => "not-time" });
  await assert.rejects(invalidActuator.store({ provider: "alpaca", subject: "x", attributes: {}, secret: {} }), /clock-invalid/u);
  let currentGrant; const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => currentGrant, transport: async () => ({ status: 200, body: {} }) });
  const credential = await storePaper(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", environment: "paper", accountReference: "opaque-paper-account", credential: { apiKeyId: "x", apiSecret: "x" } }), trusted = records(credential.reference); currentGrant = trusted.authorityGrant;
  const adapter = createAlpacaAdapter({ product: "alpaca-trading-paper", baseUrl: "https://paper-api.alpaca.markets", authorityClient: custody });
  await assert.rejects(() => adapter.readAccount({ grant: trusted.authorityGrant, now: "not-time" }), /authority-time-invalid/u);
  await assert.rejects(() => adapter.readAccount({ grant: { ...trusted.authorityGrant, validUntil: "not-time" }, now: NOW }), /authority-time-invalid/u);
});

test("paper custody independently resolves and binds principal, account, revocation, expiry, and operation scope", async () => {
  let resolved, transports = 0;
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => resolved, transport: async () => { transports += 1; return { status: 201, body: {} }; } });
  const credential = await storePaper(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", environment: "paper", accountReference: "opaque-paper-account", credential: { apiKeyId: "x", apiSecret: "y" } });
  const trusted = records(credential.reference), ref = trusted.authorityGrant.id, post = { authorityGrantReference: ref, product: "alpaca-trading-paper", method: "POST", url: "https://paper-api.alpaca.markets/v2/orders", body: { symbol: "NVDA" } };
  resolved = { ...trusted.authorityGrant, principal: "urn:principal:someone-else" }; await assert.rejects(() => custody.authorizedRequest(post), /binding-mismatch/u);
  resolved = { ...trusted.authorityGrant, accountReference: "different-account" }; await assert.rejects(() => custody.authorizedRequest(post), /binding-mismatch/u);
  resolved = { ...trusted.authorityGrant, revoked: true }; await assert.rejects(() => custody.authorizedRequest(post), /current-paper-authority/u);
  resolved = { ...trusted.authorityGrant, validUntil: "2020-01-01T00:00:00.000Z" }; await assert.rejects(() => custody.authorizedRequest(post), /paper-authority-expired/u);
  resolved = { ...trusted.authorityGrant, scopes: ["account:read"] };
  await assert.rejects(() => custody.authorizedRequest({ ...post, scope: "orders:paper" }), /reference-only/u);
  await assert.rejects(() => custody.authorizedRequest(post), /operation-scope-refused/u);
  assert.equal(transports, 0);
  const { custody: noResolver, authorityCustody: noResolverAuthority } = createCustody({ clock: () => NOW, transport: async () => { transports += 1; return { status: 200 }; } });
  const noResolverCredential = await storePaper(noResolverAuthority, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", environment: "paper", accountReference: "opaque-paper-account", credential: { apiKeyId: "x", apiSecret: "y" } });
  await assert.rejects(() => noResolver.authorizedRequest({ ...post, authorityGrantReference: noResolverCredential.reference }), /resolver-required/u); assert.equal(transports, 0);
});

test("paper custody requires one exact independently resolved order or cancellation authorization", async () => {
  let grant, operationAuthorization, transports = 0;
  const { custody, authorityCustody } = createCustody({ clock: () => NOW, resolveAuthorityGrant: async () => grant, resolvePaperOperationAuthorization: async () => operationAuthorization,
    transport: async () => { transports += 1; return { status: 201, headers: {}, body: { status: "accepted" } }; } });
  const credential = await storePaper(authorityCustody, { principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", environment: "paper", accountReference: "opaque-paper-account", credential: { apiKeyId: "x", apiSecret: "y" } });
  const trusted = records(credential.reference); grant = trusted.authorityGrant;
  const clientOrderId = `paper-${createHash("sha256").update(`${trusted.contract.id}:${trusted.intent.id}`).digest("hex").slice(0, 48)}`;
  const exactBody = { symbol: trusted.intent.symbol, side: trusted.intent.side, notional: trusted.intent.notional, type: "market", time_in_force: "day", client_order_id: clientOrderId };
  const orderAuthorization = { contract: trusted.contract, authorityGrant: trusted.authorityGrant, intent: trusted.intent, revocation: null };
  const request = { authorityGrantReference: grant.id, operationAuthorizationReference: trusted.intent.id, product: "alpaca-trading-paper", method: "POST", url: "https://paper-api.alpaca.markets/v2/orders", body: exactBody };
  operationAuthorization = orderAuthorization;
  await assert.rejects(() => custody.authorizedRequest({ ...request, operationAuthorizationReference: undefined }), /exact-paper-operation-authorization/u);
  await assert.rejects(() => custody.authorizedRequest({ ...request, body: { ...exactBody, notional: 1_000_000 } }), /body-drift-refused/u);
  await assert.rejects(() => custody.authorizedRequest({ ...request, body: { ...exactBody, client_order_id: "attacker-id" } }), /body-drift-refused/u);
  await assert.rejects(() => custody.authorizedRequest({ ...request, body: { ...exactBody, extra: true } }), /body-drift-refused/u);
  operationAuthorization = { ...orderAuthorization, revocation: { effective: true } };
  await assert.rejects(() => custody.authorizedRequest(request), /authorization-binding-refused/u); assert.equal(transports, 0);
  operationAuthorization = orderAuthorization;
  const adapter = createAlpacaAdapter({ product: "alpaca-trading-paper", baseUrl: "https://paper-api.alpaca.markets", authorityClient: custody });
  const placed = await adapter.placeOrder({ grant, order: exactBody, operationAuthorizationReference: trusted.intent.id, now: NOW }); assert.equal(placed.status, 201); assert.equal(transports, 1);
  const cancelAuthorization = { id: "urn:paper-cancel:one", type: "PaperOrderCancellationAuthorization", authorityGrant: grant.id, orderId: "venue-order/1", revoked: false, validUntil: EXPIRY };
  operationAuthorization = cancelAuthorization;
  await assert.rejects(() => adapter.cancelOrder({ grant, orderId: "venue-order/1", now: NOW }), /exact-paper-operation-authorization/u);
  await assert.rejects(() => adapter.cancelOrder({ grant, orderId: "different", operationAuthorizationReference: cancelAuthorization.id, now: NOW }), /cancellation-authorization/u);
  const canceled = await adapter.cancelOrder({ grant, orderId: "venue-order/1", operationAuthorizationReference: cancelAuthorization.id, now: NOW }); assert.equal(canceled.status, 201); assert.equal(transports, 2);
});

test("only a 404 lookup permits placement; lookup server failures refuse", async () => {
  const trusted = records(), adapter = fakeAdapter({ initialStatus: 503 });
  const provider = createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: async () => trusted, adapter, clock: () => NOW });
  await assert.rejects(() => provider(requestFor(trusted)), /initial-order-lookup-refused/u); assert.equal(adapter.places, 0);
});

test("revocation on the second resolution prevents the paper venue effect", async () => {
  const trusted = records(), adapter = fakeAdapter(); let resolutions = 0;
  const provider = createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: async () => { resolutions += 1; return resolutions === 1 ? trusted : { ...trusted, revocation: { effective: true } }; }, adapter, clock: () => NOW });
  await assert.rejects(() => provider(requestFor(trusted)), /paper-order-authority-refused/u); assert.equal(resolutions, 2); assert.equal(adapter.lookups, 1); assert.equal(adapter.places, 0);
});

test("concurrent requests serialize by deterministic client order id and place once", async () => {
  const trusted = records(), adapter = fakeAdapter({ venueStatus: "filled" });
  const provider = createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: async () => trusted, adapter, clock: () => NOW });
  const [first, second] = await Promise.all([provider(requestFor(trusted)), provider(requestFor(trusted))]);
  assert.equal(adapter.places, 1); assert.equal(first.clientOrderId, second.clientOrderId); assert.equal(second.idempotent, true); assert.equal(first.orderObservationDisposition, "terminal-order-observed"); assert.equal(first.accountReconciliationDisposition, "pending"); assert.equal(first.reconciliationDisposition, undefined);
});

test("duplicate or ambiguous POST status is never trusted without a correlated re-read", async () => {
  for (const placedStatus of [422, 500]) {
    const trusted = records(), adapter = fakeAdapter({ placedStatus, venueStatus: "accepted" });
    const provider = createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: async () => trusted, adapter, clock: () => NOW });
    const receipt = await provider(requestFor(trusted));
    assert.equal(adapter.lookups, 2); assert.equal(receipt.placementStatus, placedStatus); assert.equal(receipt.orderVenueStatus, "accepted"); assert.equal(receipt.orderObservationDisposition, "pending"); assert.equal(receipt.accountReconciliationDisposition, "pending"); assert.equal(receipt.pendingReason, "order-nonterminal");
  }
});

test("mismatched post-order identity is refused and nonterminal correlated status remains pending", async () => {
  const trusted = records(), mismatch = fakeAdapter({ mismatch: true });
  const provider = createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: async () => trusted, adapter: mismatch, clock: () => NOW });
  await assert.rejects(() => provider(requestFor(trusted)), /post-effect-order-client-id-mismatch/u);
  const pendingAdapter = fakeAdapter({ venueStatus: "partially_filled" });
  const pendingProvider = createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: async () => trusted, adapter: pendingAdapter, clock: () => NOW });
  const receipt = await pendingProvider(requestFor(trusted)); assert.equal(receipt.orderObservationDisposition, "pending"); assert.equal(receipt.accountReconciliationDisposition, "pending"); assert.equal(receipt.observationsComplete, true); assert.equal(receipt.activityCorrelationClaimed, false);
});

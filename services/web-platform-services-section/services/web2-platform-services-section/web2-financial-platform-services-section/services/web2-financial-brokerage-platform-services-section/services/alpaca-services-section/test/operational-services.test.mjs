import assert from "node:assert/strict";
import test from "node:test";
import { createAuthorityCustodyActuator, createEphemeralAuthorityCustodySubstrate } from "../../../../red-cup-engineering/services/software-services-section/services/resource-brokerage-service-section/services/authority-custody-actuator/src/authority-custody-actuator.mjs";

import { acceptPrincipalOnboardingOffer, formPrincipalBrokerageContract, formPrincipalOnboardingOffer, grantBrokerageAuthority, NORMAL_MARKET_PRICES } from "../services/principal-brokerage-interface/src/principal-contract.mjs";
import { createBrokerageAuthorityCustody } from "../services/brokerage-authority-custody-service/src/authority-custody.mjs";
import { createAlpacaConnectOAuthBroker } from "../services/brokerage-authority-custody-service/src/alpaca-connect-oauth.mjs";
import { quoteMeteredCompute, settleMeteredCompute } from "../services/metered-compute-payment-service/src/metered-payment.mjs";
import { createAlpacaAdapter } from "../services/pluggable-venue-adapter-service/src/alpaca-adapter.mjs";
import { createAlpacaBrokerAdministrator } from "../services/pluggable-venue-adapter-service/src/alpaca-broker-admin.mjs";
import { normalizeAlpacaSnapshot, reconcileSnapshots } from "../services/account-evidence-reconciliation-service/src/reconcile.mjs";
import { formIssuerEvidencePacket } from "../services/issuer-research-media-service/src/evidence-packet.mjs";
import { formAggressivePortfolioIntent } from "../services/alpha-portfolio-order-intent-service/src/aggressive-intent.mjs";
import { executeAdmittedIntent } from "../services/brokerage-execution-transport-service/src/execute-intent.mjs";
import { createBrokerageMarketEventRecorder, createBrokerageOutcomeWitnessRecorder, witnessBrokerageOutcome } from "../services/brokerage-independent-witness-and-books/src/witness.mjs";
import { createX402BrokerageBorder } from "../services/coinbase-x402-bazaar-border/src/http-border.mjs";

const expiry = "2030-01-01T00:00:00.000Z";
const createCustody = (options) => {
  const authorityCustody = createAuthorityCustodyActuator({ substrate: createEphemeralAuthorityCustodySubstrate(), clock: options.clock });
  return { authorityCustody, custody: createBrokerageAuthorityCustody({ ...options, authorityCustody }) };
};
const storeOAuth = (authorityCustody, { principal, venue, credential }) => authorityCustody.store({ provider: "alpaca", subject: principal, attributes: { kind: "alpaca-oauth", venue }, secret: { kind: "alpaca-oauth", principal, venue, credential } });
const storeBroker = (authorityCustody, { principal, venue, credential }) => authorityCustody.store({ provider: "alpaca", subject: principal, attributes: { kind: "alpaca-broker-client", venue }, secret: { kind: "alpaca-broker-client", principal, venue, credential } });
const contract = (capital, sponsored = false, principal = "urn:principal:test-customer") => formPrincipalBrokerageContract({ principal, venue: "alpaca-connect", accountReference: `account-${capital}`,
  capital: { amount: capital, currency: "USD" }, risk: { maximumLossAmount: capital, maximumOrderNotional: capital, maximumAggregateNotional: capital,
    concentrationLimit: 1, leverageLimit: 1, shorting: false, options: false }, scopes: ["account:read", "positions:read", "orders:intent", "orders:live", "wallets:read"], validUntil: expiry, sponsored });

test("Esther sponsorship is one contract instance while larger customers retain the same product class and prices", () => {
  const esther = contract(100, true, "urn:principal:esther-davis"), institution = contract(50000, false, "urn:principal:institution-1");
  assert.equal(esther.capital.amount, 100); assert.equal(esther.consideration.charged, false);
  assert.equal(institution.capital.amount, 50000); assert.equal(institution.consideration.charged, true);
  assert.equal(esther.consideration.referencePrices["execution-transport"], NORMAL_MARKET_PRICES["execution-transport"]);
  assert.equal(esther.risk.concentrationLimit, 1); assert.equal(institution.risk.concentrationLimit, 1);
});

test("Esther's approximate capital is an onboarding observation and funded capital parameterizes the accepted aggressive mandate", () => {
  const offer = formPrincipalOnboardingOffer({ principal: "urn:principal:esther-davis", venue: "alpaca-connect", expectedCapital: { amount: 100, currency: "USD" },
    riskPolicy: { maximumLossFraction: 1, maximumOrderFraction: 1, maximumAggregateMultiple: 1, concentrationLimit: 1, leverageLimit: 1 },
    scopes: ["account:read", "positions:read", "orders:intent"], validUntil: expiry, sponsored: true });
  assert.equal(offer.effect, "offer-only-no-brokerage-authority-no-wallet-authority"); assert.equal(offer.expectedCapital.role, "planning-observation-not-product-ceiling");
  const accepted = acceptPrincipalOnboardingOffer({ offer, accountReference: "alpaca-connect:opaque-esther-account", observedCapitalAmount: 137.42, acceptanceReference: "urn:principal-acceptance:esther:example" });
  assert.equal(accepted.capital.amount, 137.42); assert.equal(accepted.risk.maximumLossAmount, 137.42); assert.equal(accepted.risk.maximumOrderNotional, 137.42);
  assert.equal(accepted.consideration.charged, false); assert.equal(accepted.acceptanceReference, "urn:principal-acceptance:esther:example");
});

test("authority is attenuated, revocable, and read scope cannot place an order", async () => {
  const principal = contract(100, true);
  const calls = [], { custody, authorityCustody } = createCustody({ clock: () => "2026-07-22T22:20:00.000Z", transport: async (request) => { calls.push(request); return { status: 200, headers: { "x-request-id": "request-1" }, body: { id: "account-100", status: "ACTIVE", token: "must-be-scrubbed" } }; } });
  const credential = await storeOAuth(authorityCustody, { principal: principal.principal, venue: "alpaca-connect", credential: { accessToken: "stays-inside-custody", refreshToken: "also-private" } });
  assert.equal(credential.accessToken, undefined); assert.equal(credential.secretBytesReturned, false);
  const read = grantBrokerageAuthority({ contract: principal, adapter: "alpaca-connect", credentialReference: credential.reference, scopes: ["account:read"], validUntil: expiry });
  const adapter = createAlpacaAdapter({ product: "alpaca-connect", baseUrl: "https://paper-api.alpaca.markets", authorityClient: custody });
  const receipt = await adapter.readAccount({ grant: read, now: "2026-07-22T22:20:00.000Z" });
  assert.equal(receipt.status, 200); assert.equal(receipt.payload.token, undefined); assert.match(calls[0].headers.Authorization, /^Bearer /u); assert.equal(receipt.authorityCustodyReceipt.secretBytesReturned, false);
  await assert.rejects(() => adapter.placeOrder({ grant: read, order: { symbol: "NVDA", notional: 100 }, now: "2026-07-22T22:20:00.000Z" }), /scope-refused/u);
  assert.throws(() => grantBrokerageAuthority({ contract: principal, adapter: "alpaca-connect", credentialReference: "vault:x", scopes: ["admin:all"], validUntil: expiry }), /widening/u);
});

test("customer compute wallet settles exactly one quoted service without brokerage-funding authority", async () => {
  const walletGrant = { id: "grant:wallet", role: "compute-payment", asset: "USDC", network: "eip155:8453", maximumPerRequest: 2, maximumTotalSpend: 10 };
  const quote = quoteMeteredCompute({ service: "aggressive-alpha-research-packet", provider: "urn:ame:alpha-portfolio-order-intent-service", amount: 1, payTo: "0xprovider", meter: { requests: 1 } });
  const receipt = await settleMeteredCompute({ walletGrant, quote, paymentPayload: "signed-payload", now: "2026-07-22T22:20:00.000Z", verifyAndSettle: async ({ quote: q }) => ({ success: true, quote: q.id, amount: 1, asset: "USDC", network: "eip155:8453", transaction: "0xtx" }) });
  assert.equal(receipt.brokerageFundingAuthority, false); assert.equal(receipt.providerRevenueOwnership, false);
  await assert.rejects(() => settleMeteredCompute({ walletGrant: { ...walletGrant, role: "brokerage-funding" }, quote, paymentPayload: "x", verifyAndSettle: async () => ({}) }), /compute-payment/u);
});

test("Alpaca Connect OAuth verifies state, exchanges backend-only secrets, and returns only an opaque reference", async () => {
  const { authorityCustody: custody } = createCustody({ transport: async () => ({ status: 200, body: {} }) });
  let tokenRequest; const oauth = createAlpacaConnectOAuthBroker({ clientId: "client-id", clientSecret: "never-returned", redirectUri: "https://brokerage.example/oauth/callback", custody,
    fetchImpl: async (url, request) => { tokenRequest = { url, request }; return { ok: true, json: async () => ({ access_token: "principal-token", refresh_token: "principal-refresh", expires_in: 3600 }) }; } });
  const state = "0123456789abcdef0123456789abcdef", url = new URL(oauth.authorizationUrl({ state, environment: "paper", scopes: ["account:write", "trading"] }));
  assert.equal(url.hostname, "app.alpaca.markets"); assert.equal(url.searchParams.get("state"), state); assert.equal(url.searchParams.get("env"), "paper");
  const reference = await oauth.exchangeAuthorizationCode({ code: "temporary-code", state, expectedState: state, principal: "urn:principal:esther-davis" });
  assert.match(reference.reference, /^urn:authority:/u); assert.equal(reference.accessToken, undefined); assert.equal(tokenRequest.url, "https://api.alpaca.markets/oauth/token"); assert.match(String(tokenRequest.request.body), /grant_type=authorization_code/u);
  await assert.rejects(() => oauth.exchangeAuthorizationCode({ code: "x", state: "wrong", expectedState: state, principal: "x" }), /state-mismatch/u);
});

test("Alpaca Broker administration uses scoped API-key custody and keeps strategy and asset ownership out", async () => {
  const brokerContract = formPrincipalBrokerageContract({ principal: "urn:institution:broker-operator", venue: "alpaca-broker", accountReference: "broker-tenant-1",
    capital: { amount: 100000, currency: "USD" }, risk: { maximumLossAmount: 100000, maximumOrderNotional: 100000, maximumAggregateNotional: 100000, concentrationLimit: 1 },
    scopes: ["accounts:create", "accounts:read", "accounts:update", "documents:write", "wallets:read"], validUntil: expiry });
  const calls = [], { custody, authorityCustody } = createCustody({ clock: () => "2026-07-22T22:20:00.000Z", fetchImpl: async () => ({ ok: true, json: async () => ({ access_token: "short-lived-broker-token", expires_in: 899 }) }), transport: async (request) => { calls.push(request); return { status: 201, headers: { "x-request-id": "broker-request-1" }, body: { id: "new-account" } }; } });
  const credential = await storeBroker(authorityCustody, { principal: brokerContract.principal, venue: "alpaca-broker", credential: { clientId: "private-id", clientSecret: "private-secret" } });
  const grant = grantBrokerageAuthority({ contract: brokerContract, adapter: "alpaca-broker", credentialReference: credential.reference, scopes: ["accounts:create"], validUntil: expiry });
  const admin = createAlpacaBrokerAdministrator({ authorityClient: custody });
  const receipt = await admin.createAccount({ grant, application: { contact: { email_address: "customer@example.invalid" }, identity: { given_name: "Customer" } }, now: "2026-07-22T22:20:00.000Z" });
  assert.equal(receipt.status, 201); assert.equal(receipt.strategyAuthority, false); assert.equal(receipt.customerAssetOwnership, false);
  assert.equal(calls[0].headers.Authorization, "Bearer short-lived-broker-token"); assert.equal(receipt.payload.apiSecret, undefined);
  await assert.rejects(() => admin.getAccount({ grant, accountId: "new-account", now: "2026-07-22T22:20:00.000Z" }), /scope-refused/u);
});

test("account evidence normalization detects cash and position mismatches", () => {
  const source = { uri: "urn:alpaca:statement:1", digest: "sha256:statement" }, observedAt = "2026-07-22T22:20:00.000Z";
  const expected = normalizeAlpacaSnapshot({ accountReference: "account-100", observedAt, source, account: { cash: "40", equity: "100", buying_power: "40" }, positions: [{ symbol: "NVDA", qty: "1", market_value: "60" }] });
  const observed = normalizeAlpacaSnapshot({ accountReference: "account-100", observedAt, source: { ...source, digest: "sha256:statement-2" }, account: { cash: "35", equity: "100", buying_power: "35" }, positions: [{ symbol: "NVDA", qty: "0.9", market_value: "60" }] });
  const result = reconcileSnapshots({ expected, observed }); assert.equal(result.disposition, "mismatch"); assert.equal(result.mismatchCount, 3);
});

test("aggressive intent may use full capital but requires sourced evidence, falsifier, execution, liquidity, and bounded scenarios", async () => {
  const principal = contract(100, true);
  const packet = formIssuerEvidencePacket({ ticker: "NVDA", issuer: "NVIDIA Corporation", asOf: "2026-07-22T22:20:00.000Z",
    sources: [{ uri: "https://example.invalid/filing", observedAt: "2026-07-22T20:00:00.000Z", digest: "sha256:filing" }], claims: [{ statement: "Revenue catalyst observed", sourceDigests: ["sha256:filing"] }] });
  const intent = formAggressivePortfolioIntent({ contract: principal, evidencePackets: [packet], symbol: "NVDA", notional: 100, maximumLoss: 100,
    thesis: "Catalyst can reprice shares", falsifier: "Guidance or demand evidence reverses", liquidityPremise: "fractional market order within displayed liquidity",
    executionPremise: "day market order with post-trade reconciliation", scenarios: [{ name: "up", pnl: 60 }, { name: "ruin", pnl: -100 }] });
  assert.equal(intent.concentration, 1); assert.equal(intent.liveVenueEffect, false);
  const grant = grantBrokerageAuthority({ contract: principal, adapter: "alpaca-connect", credentialReference: "vault:esther/alpaca-oauth", scopes: ["orders:live"], validUntil: expiry });
  const transport = await executeAdmittedIntent({ contract: principal, authorityGrant: grant, intent, now: "2026-07-22T22:20:00.000Z", adapter: { placeOrder: async () => ({ id: "venue:receipt", status: 200 }) } });
  assert.equal(transport.credentialsExported, false); assert.equal(transport.strategySelectedByTransport, false);
  assert.throws(() => formAggressivePortfolioIntent({ contract: principal, evidencePackets: [packet], symbol: "NVDA", notional: 101, maximumLoss: 100, thesis: "x", falsifier: "y", liquidityPremise: "z", executionPremise: "q", scenarios: [{ pnl: 1 }, { pnl: -100 }] }), /risk-boundary/u);
});

test("witness refuses assertion", () => {
  const output = { id: "sha256:output" };
  assert.throws(() => witnessBrokerageOutcome({ originatingActor: "urn:ame:brokerage-independent-witness-and-books", inputs: [{ id: "sha256:input" }], output, externalEvidence: [{ uri: "urn:evidence", digest: "sha256:evidence" }], observedAt: "2026-07-22T22:20:00.000Z" }), /assertion/u);
  const witness = witnessBrokerageOutcome({ originatingActor: "urn:ame:alpha-portfolio-order-intent-service", inputs: [{ id: "sha256:input" }], output, externalEvidence: [{ uri: "urn:evidence", digest: "sha256:evidence" }], observedAt: "2026-07-22T22:20:00.000Z" });
  assert.equal(witness.correctnessClaim, "not-unbound");
});

test("independent books append the provider outcome as an WitnessJournal named graph", async () => {
  let recorded; const recorder = createBrokerageOutcomeWitnessRecorder({ WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19764", BROKERAGE_BOOKS_DATA_ROOT: "/tmp/brokerage-books-test", BROKERAGE_BOOKS_ACCOUNT: "eip155:8453:0x0000000000000000000000000000000000000002" }, {
    now: () => "2026-07-22T22:20:00.000Z", record: async (request) => { recorded = request; return { graphPath: "/tmp/graph.cbor" }; },
  });
  const result = await recorder({ originatingActor: "urn:ame:issuer-research-media-service", inputs: [{ ticker: "NVDA" }], output: { id: "sha256:output", type: "IssuerEvidencePacket" }, externalEvidence: [{ uri: "https://example.invalid/filing", digest: "sha256:filing" }] });
  assert.equal(result.witness.correctnessClaim, "not-unbound"); assert.match(result.graph, /^ni:\/\/\/sha-256;/u);
  assert.equal(recorded.nodeId, "brokerage-independent-witness-and-books"); assert.equal(recorded.batch.settlement, "eip155:8453:0x0000000000000000000000000000000000000002");
  assert.equal(recorded.batch.graph, result.graph); assert.equal(recorded.batch.document[0], "ascribe"); assert.equal(recorded.batch.document.length, 3);
});

test("independent books append Virtuals boundary events without assertion", async () => {
  let batch; const recorder = createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:virtuals-brokerage-products-border", nodeId: "virtuals-brokerage-products-border" },
    { WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19764", BROKERAGE_BOOKS_DATA_ROOT: "/tmp/brokerage-books-test", BROKERAGE_BOOKS_ACCOUNT: "eip155:8453:0x0000000000000000000000000000000000000002" },
    { now: () => "2026-07-22T22:20:00.000Z", record: async (request) => { batch = request.batch; return { graphPath: "/tmp/event.nq" }; } });
  const receipt = await recorder({ type: "virtuals-brokerage-delivered", jobId: "42", output: "sha256:output" });
  assert.match(receipt.graph, /^ni:\/\/\/sha-256;/u); assert.equal(batch.document[0], "ascribe"); assert.equal(batch.settlement, "eip155:8453:0x0000000000000000000000000000000000000002");
  assert.throws(() => createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:brokerage-independent-witness-and-books", nodeId: "self" }, {}), /origin-required/u);
});

test("x402 border challenges unpaid calls, refuses credentials, and delivers after injected settlement", async () => {
  const border = createX402BrokerageBorder({ payTo: "0xprovider", facilitator: "https://x402.org/facilitator", verifyAndSettle: async () => ({ success: true, transaction: "0xpaid", settledAt: "2026-07-22T22:20:00.000Z" }), providers: { "issuer-evidence-packet": async ({ ticker }) => ({ id: `packet:${ticker}`, ticker }) } });
  const unpaid = await border({ path: "/v1/issuer-evidence", body: { ticker: "NVDA" } }); assert.equal(unpaid.status, 402); assert.ok(unpaid.headers["payment-required"]);
  const secret = await border({ path: "/v1/issuer-evidence", headers: { "payment-signature": "paid" }, body: { apiKey: "nope" } }); assert.equal(secret.status, 422);
  const paid = await border({ path: "/v1/issuer-evidence", headers: { "payment-signature": "paid" }, body: { ticker: "NVDA" } });
  assert.equal(paid.status, 200); assert.equal(paid.body.receipt.bazaarCatalogEligible, true); assert.equal(paid.body.receipt.bazaarIndexedClaim, false); assert.equal(paid.body.output.ticker, "NVDA");
});

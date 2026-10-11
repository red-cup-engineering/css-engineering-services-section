import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAuthorityCustodyActuator, createEphemeralAuthorityCustodySubstrate } from "./support/ephemeral-authority-custody.mjs";

import { acceptPrincipalOnboardingOffer, formPrincipalBrokerageContract, formPrincipalOnboardingOffer, grantBrokerageAuthority, NORMAL_MARKET_PRICES } from "../services/principal-brokerage-interface/src/principal-contract.mjs";
import { createBrokerageAuthorityCustody } from "@red-cup-engineering/brokerage-authority-custody-service";
import { createAlpacaConnectOAuthBroker } from "@red-cup-engineering/brokerage-authority-custody-service/alpaca-connect-oauth";
import { quoteMeteredCompute, settleMeteredCompute } from "../scripts/metered-payment.mjs";
import { createAlpacaAdapter } from "@red-cup-engineering/pluggable-venue-adapter-service/alpaca";
import { createAlpacaBrokerAdministrator } from "@red-cup-engineering/pluggable-venue-adapter-service/alpaca-broker-admin";
import { normalizeAlpacaSnapshot, reconcileSnapshots } from "@red-cup-engineering/account-evidence-reconciliation-service";
import { formIssuerEvidencePacket } from "../scripts/evidence-packet.mjs";
import { formAggressivePortfolioIntent } from "@red-cup-engineering/alpha-portfolio-order-intent-service";
import { executeAdmittedIntent } from "@red-cup-engineering/brokerage-execution-transport-service";
import { createBrokerageMarketEventRecorder, createBrokerageOutcomeWitnessRecorder, witnessBrokerageOutcome } from "@red-cup-engineering/brokerage-independent-witness-and-books";

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

// brokerage-independent-witness-and-books moved from a WitnessJournal RDF-agent batch
// (ascribe/settlement/document) to a local semantic-record-journal-backed recorder at an
// explicit BROKERAGE_BOOKS_DATA_ROOT; these two cases were updated to that current contract
// (see the package's own test/witness.test.mjs) rather than the superseded RDF-batch shape.
test("independent books append the provider outcome as a semantic record journal entry", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "brokerage-books-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const recorder = createBrokerageOutcomeWitnessRecorder({ BROKERAGE_BOOKS_DATA_ROOT: root }, { now: () => "2026-07-22T22:20:00.000Z" });
  const result = await recorder({ originatingActor: "urn:ame:issuer-research-media-service", inputs: [{ ticker: "NVDA" }], output: { id: "sha256:output", type: "IssuerEvidencePacket" }, externalEvidence: [{ uri: "https://example.invalid/filing", digest: "sha256:filing" }] });
  assert.equal(result.witness.correctnessClaim, "not-unbound"); assert.match(result.graph, /^ni:\/\/\/sha-256;/u);
  assert.equal(result.graph, result.witness.id);
  assert.equal(result.recordReceipt.charge.support, true); assert.equal(result.recordReceipt.charge.refutation, false);
  const second = await recorder({ originatingActor: "urn:ame:issuer-research-media-service", inputs: [{ ticker: "NVDA" }], output: { id: "sha256:output", type: "IssuerEvidencePacket" }, externalEvidence: [{ uri: "https://example.invalid/filing", digest: "sha256:filing" }] });
  assert.equal(second.witness.id, result.witness.id); assert.equal(second.recordReceipt, null);
});

test("independent books append Virtuals boundary events without assertion", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "brokerage-books-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const recorder = createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:virtuals-brokerage-products-border", nodeId: "virtuals-brokerage-products-border" },
    { BROKERAGE_BOOKS_DATA_ROOT: root }, { now: () => "2026-07-22T22:20:00.000Z" });
  const receipt = await recorder({ type: "virtuals-brokerage-delivered", jobId: "42", output: "sha256:output" });
  assert.match(receipt.graph, /^ni:\/\/\/sha-256;/u); assert.equal(receipt.id, receipt.graph);
  assert.equal(receipt.recordReceipt.charge.support, true); assert.equal(receipt.recordReceipt.charge.refutation, false);
  assert.throws(() => createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:brokerage-independent-witness-and-books", nodeId: "self" }, {}), /origin-required/u);
});

// The x402 border test that lived here (createX402BrokerageBorder from
// coinbase-x402-bazaar-border/src/http-border.mjs) was removed on the
// 2026-09-11 founder ruling: one x402 market, market.561.group; no
// per-compute seller keeps a transport, facilitator selection, or
// settlement witness of its own. http-border.mjs and its own transport
// (server.mjs, settlement-witness.mjs) were deleted along with it; the same
// issuer-evidence product it exercised is now market.561.group's own
// catalog entry ("brokerage-control"/"issuer-evidence"), bound directly to
// formIssuerEvidencePacket -- exercised above (see "aggressive intent...")
// and end to end in market-561-group's own test suite
// (apps/market-561-group/test/market-561-group.test.mjs), with the
// remaining provider-composition coverage in
// alpaca-services-section/test/market-runtime.test.mjs.

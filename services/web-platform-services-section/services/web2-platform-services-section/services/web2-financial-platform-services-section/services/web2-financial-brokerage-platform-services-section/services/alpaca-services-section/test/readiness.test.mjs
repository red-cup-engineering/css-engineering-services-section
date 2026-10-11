import assert from "node:assert/strict";
import test from "node:test";
import { assessBrokerageMarketReadiness } from "../src/readiness.mjs";

test("public products can deploy before a Principal grants Alpaca authority while the read product remains unavailable", () => {
  const env = { X402_PAY_TO: "0x0000000000000000000000000000000000000001", CDP_API_KEY_ID: "opaque-id", CDP_API_KEY_SECRET: "opaque-secret",
    WITNESS_JOURNAL_RDF_AGENT: "http://127.0.0.1:19764", BROKERAGE_X402_DATA_ROOT: "/tmp/brokerage-witness", BROKERAGE_X402_ACCOUNT: "eip155:8453:0x0000000000000000000000000000000000000001",
    BROKERAGE_BOOKS_DATA_ROOT: "/tmp/brokerage-books", BROKERAGE_BOOKS_ACCOUNT: "eip155:8453:0x0000000000000000000000000000000000000002",
    VIRTUALS_LITE_API_KEY: "opaque-virtuals-key", BROKERAGE_VIRTUALS_OPERATOR_NAME: "Brokerage Federation", BROKERAGE_VIRTUALS_OPERATOR_WALLET: "0x0000000000000000000000000000000000000003", BROKERAGE_VIRTUALS_STATE_ROOT: "/tmp/brokerage-virtuals",
    BROKERAGE_UNION_ACTIVITYPUB_ORIGIN: "https://brokerage.example", BROKERAGE_UNION_ACTIVITYPUB_IDENTIFIER: "market", BROKERAGE_UNION_ACTIVITYPUB_NAME: "Brokerage Federation",
    BROKERAGE_UNION_A2A_AGENT_CARD: "https://brokerage.example/.well-known/agent-card.json", BROKERAGE_UNION_ACTIVITYPUB_KEYS_PATH: "/tmp/union-keys.json",
    BROKERAGE_UNION_ACTIVITYPUB_STATE_PATH: "/tmp/union-activitypub.jsonl", BROKERAGE_UNION_ACTIVITYPUB_BEARER_TOKEN_FILE: "/tmp/union-token",
    BROKERAGE_UNION_MARKET_STATE_ROOT: "/tmp/union-market", BROKERAGE_UNION_OFFERS_VALID_UNTIL: "2030-01-01T00:00:00.000Z" };
  const publicOnly = assessBrokerageMarketReadiness(env);
  assert.equal(publicOnly.publicMarketReady, true); assert.equal(publicOnly.virtualsMarketReady, true); assert.equal(publicOnly.unionMarketReady, false); assert.equal(publicOnly.alpacaPrincipalReadReady, false); assert.equal(publicOnly.paperReadReady, false); assert.equal(publicOnly.liveReady, false); assert.equal(publicOnly.missing.includes("paperReadProvider"), true);
  const withPrincipalRead = assessBrokerageMarketReadiness(env, { alpacaRead: async () => ({}), consumeUnionGrant: async () => ({}) });
  assert.equal(withPrincipalRead.unionMarketReady, true);
  assert.equal(withPrincipalRead.alpacaPrincipalReadReady, false); assert.equal(withPrincipalRead.paperReadReady, false);
});

test("missing settlement and witness configuration is reported exactly", () => {
  const assessment = assessBrokerageMarketReadiness({});
  assert.equal(assessment.publicMarketReady, false);
  assert.equal(assessment.missing.includes("paperCredentialNamesPresent"), true); assert.equal(assessment.missing.includes("strategyActors"), true); assert.equal(assessment.liveAccountsAuthorized, false);
});

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { AgentCard } from "@a2a-js/sdk";
import {
  createAgentCardSigningConfiguration,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { encodePaymentRequiredHeader } from "@x402/core/http";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

import { observePublicServiceMarketListing } from "../src/public-service-market-listing.mjs";

const AGENT_ORIGIN = "https://agent.561.group";
const AGENT_URL = `${AGENT_ORIGIN}/.well-known/agent-card.json`;
const JWKS_URL = `${AGENT_ORIGIN}/.well-known/jwks.json`;
const RESOURCE_URL = "https://market.561.group/value/btc?q=spot";
const PAY_TO = "0x1111111111111111111111111111111111111111";
const OTHER_PAY_TO = "0x9999999999999999999999999999999999999999";
const ASSET = "0x2222222222222222222222222222222222222222";
const LAW = "ni:///sha-256;yzk4IKBI_kDyxQooUBRko4wojKWz5i9kCnLrwrjl0GM";
const SKILL = "quote-public-value";

function baseCard() {
  return {
    name: "Public Value Service",
    description: "One exact public value service.",
    supportedInterfaces: [{ url: `${AGENT_ORIGIN}/a2a/jsonrpc`, protocolBinding: "JSONRPC", protocolVersion: "1.0", tenant: "" }],
    provider: { url: "https://561.group/", organization: "561 Group" },
    version: "1.0.0",
    protocolVersion: "1.0",
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extensions: [{
        uri: LAW,
        description: "Sovereign circuit",
        required: true,
        params: {
          profile: "org.emsenn.rmn.sovereign-circuit-interface.v1",
          component: { law: LAW },
        },
      }],
      extendedAgentCard: false,
    },
    securitySchemes: {},
    securityRequirements: [],
    defaultInputModes: ["application/rmn+cbor"],
    defaultOutputModes: ["application/rmn+cbor"],
    skills: [{
      id: SKILL,
      name: "Quote public value",
      description: "Quote one bounded public value.",
      tags: ["RMN"],
      examples: ["Quote BTC."],
      inputModes: ["application/rmn+cbor"],
      outputModes: ["application/rmn+cbor"],
      securityRequirements: [],
    }],
    signatures: [],
  };
}

function baseChallenge() {
  return {
    x402Version: 2,
    resource: { url: RESOURCE_URL, description: "one bounded value", serviceName: "561 value", tags: ["data"] },
    accepts: [{
      scheme: "exact",
      network: "eip155:8453",
      amount: "1000",
      asset: ASSET,
      payTo: PAY_TO,
      maxTimeoutSeconds: 60,
    }],
    extensions: declareDiscoveryExtension({
      method: "GET",
      input: { q: "btc" },
      output: { example: { value: 1 } },
    }),
  };
}

function mergeCard(patch = {}) {
  const card = baseCard();
  return { ...card, ...patch };
}

function mergeChallenge(patch = {}) {
  const challenge = baseChallenge();
  return { ...challenge, ...patch };
}

async function fixture({ card = mergeCard(), challenge = mergeChallenge(), mutateSignedCard, cardResponse, resourceResponse } = {}) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signing = createAgentCardSigningConfiguration({
    baseUrl: AGENT_ORIGIN,
    kid: "market-fixture-ed25519",
    privateKey,
    publicJwk: publicKey.export({ format: "jwk" }),
  });
  const normalizedCard = AgentCard.toJSON(AgentCard.fromJSON(card));
  const signedCard = await signing.agentCardSignatureGenerator(normalizedCard);
  mutateSignedCard?.(signedCard);
  const fetchImpl = async (url) => {
    if (url.toString() === AGENT_URL) return cardResponse ?? Response.json(signedCard);
    if (url.toString() === JWKS_URL) return Response.json(signing.agentCardJwks);
    if (url.toString() === RESOURCE_URL) {
      if (resourceResponse !== undefined) return resourceResponse;
      return new Response(null, { status: 402, headers: { "payment-required": encodePaymentRequiredHeader(challenge) } });
    }
    throw new Error(`unexpected fixture URL ${url}`);
  };
  return { fetchImpl, signedCard };
}

function observe(fetchImpl, patch = {}) {
  return observePublicServiceMarketListing({
    agentCardUrl: AGENT_URL,
    resourceUrl: RESOURCE_URL,
    expectedSkillId: SKILL,
    expectedLaw: LAW,
    sellerPolicy: { payTo: PAY_TO.toUpperCase().replace("0X", "0x"), network: "eip155:8453", asset: ASSET.toUpperCase().replace("0X", "0x") },
    fetchImpl,
    ...patch,
  });
}

test("admits one signed A2A and x402 Bazaar listing without paying", async () => {
  const { fetchImpl } = await fixture();
  const listing = await observe(fetchImpl);
  assert.equal(listing.profile, "org.emsenn.x402.public-service-market-listing.v1");
  assert.equal(listing.agent.skill.id, SKILL);
  assert.equal(listing.agent.law, LAW);
  assert.equal(listing.service.acceptance.payTo, PAY_TO);
  assert.equal(listing.sellerPolicy.asset, ASSET);
  assert.equal(listing.verification.agentCardSignature, "verified");
  assert.equal(listing.verification.x402SignedOffers, "not-performed");
  assert.match(listing.listingDigest, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u);
  assert.deepEqual(listing.authority, {
    publicReadOnly: true,
    paymentAttempted: false,
    signingAttempted: false,
    settlementAttempted: false,
    deploymentAttempted: false,
    protectedResourceConsumed: false,
  });
});

test("is deterministic for identical signed identity and challenge evidence", async () => {
  const { fetchImpl } = await fixture();
  const first = await observe(fetchImpl);
  const second = await observe(fetchImpl);
  assert.equal(first.listingDigest, second.listingDigest);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.service.acceptance), true);
  assert.throws(() => { first.service.acceptance.amount = "2"; }, /read only|Cannot assign/u);
});

test("refuses unsigned and signature-mutated Agent Cards", async () => {
  const unsigned = await fixture({ mutateSignedCard: (card) => { card.signatures = []; } });
  await assert.rejects(observe(unsigned.fetchImpl), /no signature/u);
  const mutated = await fixture({ mutateSignedCard: (card) => { card.name = "tampered"; } });
  await assert.rejects(observe(mutated.fetchImpl), /no valid signature/u);
});

test("refuses unsafe Agent Card, interface, and resource URLs before admission", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error("must not fetch"); };
  await assert.rejects(observe(fetchImpl, { agentCardUrl: "http://agent.561.group/.well-known/agent-card.json" }), /credential-free HTTPS/u);
  await assert.rejects(observe(fetchImpl, { agentCardUrl: "https://127.0.0.1/.well-known/agent-card.json" }), /public HTTPS host/u);
  await assert.rejects(observe(fetchImpl, { resourceUrl: "https://[::1]/value" }), /public HTTPS host/u);
  assert.equal(calls, 0);
  const unsafeInterface = await fixture({ card: mergeCard({ supportedInterfaces: [{ url: "http://127.0.0.1/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" }] }) });
  await assert.rejects(observe(unsafeInterface.fetchImpl), /interface\[0\].*credential-free HTTPS/u);
});

test("refuses missing or duplicate skill identities", async () => {
  const missing = await fixture({ card: mergeCard({ skills: [] }) });
  await assert.rejects(observe(missing.fetchImpl), /exactly one matching skill/u);
  const base = baseCard();
  const duplicate = await fixture({ card: mergeCard({ skills: [base.skills[0], structuredClone(base.skills[0])] }) });
  await assert.rejects(observe(duplicate.fetchImpl), /exactly one matching skill/u);
});

test("refuses law drift and duplicate sovereign circuit extensions", async () => {
  const wrongLaw = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const base = baseCard();
  const driftedExtension = structuredClone(base.capabilities.extensions[0]);
  driftedExtension.params.component.law = wrongLaw;
  const drifted = await fixture({ card: mergeCard({ capabilities: { ...base.capabilities, extensions: [driftedExtension] } }) });
  await assert.rejects(observe(drifted.fetchImpl), /law does not match/u);
  const duplicate = await fixture({ card: mergeCard({ capabilities: { ...base.capabilities, extensions: [base.capabilities.extensions[0], structuredClone(base.capabilities.extensions[0])] } }) });
  await assert.rejects(observe(duplicate.fetchImpl), /exactly one sovereign circuit extension/u);
});

test("refuses missing Bazaar metadata and route-template path drift", async () => {
  const missing = await fixture({ challenge: mergeChallenge({ extensions: {} }) });
  await assert.rejects(observe(missing.fetchImpl), /valid Bazaar extension/u);
  const extensions = baseChallenge().extensions;
  extensions.bazaar.routeTemplate = "/wrong/:asset";
  const drifted = await fixture({ challenge: mergeChallenge({ extensions }) });
  await assert.rejects(observe(drifted.fetchImpl), /routeTemplate does not match/u);
});

test("accepts a matching Bazaar route template", async () => {
  const extensions = baseChallenge().extensions;
  extensions.bazaar.routeTemplate = "/value/:asset";
  const { fetchImpl } = await fixture({ challenge: mergeChallenge({ extensions }) });
  const listing = await observe(fetchImpl);
  assert.equal(listing.service.bazaar.routeTemplate, "/value/:asset");
});

test("refuses payout, network, asset, and ambiguous seller-policy matches", async () => {
  const { fetchImpl } = await fixture();
  await assert.rejects(observe(fetchImpl, { sellerPolicy: { payTo: OTHER_PAY_TO, network: "eip155:8453", asset: ASSET } }), /exactly one payment alternative/u);
  await assert.rejects(observe(fetchImpl, { sellerPolicy: { payTo: PAY_TO, network: "eip155:42161", asset: ASSET } }), /exactly one payment alternative/u);
  await assert.rejects(observe(fetchImpl, { sellerPolicy: { payTo: PAY_TO, network: "eip155:8453", asset: OTHER_PAY_TO } }), /exactly one payment alternative/u);
  const challenge = baseChallenge();
  challenge.accepts.push({ ...challenge.accepts[0], scheme: "batch-settlement" });
  const ambiguous = await fixture({ challenge });
  await assert.rejects(observe(ambiguous.fetchImpl), /exactly one payment alternative/u);
});

test("propagates x402 redirect refusal and never treats it as a listing", async () => {
  const { fetchImpl } = await fixture({
    resourceResponse: new Response(null, { status: 302, headers: { location: RESOURCE_URL } }),
  });
  await assert.rejects(observe(fetchImpl), /redirects/u);
});

test("refuses Agent Card redirects and oversized identity responses", async () => {
  const redirected = await fixture({
    cardResponse: new Response(null, { status: 302, headers: { location: AGENT_URL } }),
  });
  await assert.rejects(observe(redirected.fetchImpl), /Agent Card discovery refuses redirects/u);
  const oversized = await fixture({
    cardResponse: new Response("x", { status: 200, headers: { "content-length": "1048577" } }),
  });
  await assert.rejects(observe(oversized.fetchImpl), /exceeds its byte bound/u);
});

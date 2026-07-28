import assert from "node:assert/strict";
import test from "node:test";

import { encodePaymentRequiredHeader } from "@x402/core/http";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

import { observeX402Resource } from "../src/resource-observation.mjs";

const URL = "https://services.561.group/value?q=btc";
const PAY_TO = "0x1111111111111111111111111111111111111111";
const ASSET = "0x2222222222222222222222222222222222222222";

function challenge(overrides = {}) {
  return {
    x402Version: 2,
    resource: { url: URL, description: "one bounded value", serviceName: "561 value", tags: ["data"] },
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
    ...overrides,
  };
}

function responseFor(value, status = 402, extraHeaders = {}) {
  return new Response(null, {
    status,
    headers: {
      ...(value === undefined ? {} : { "payment-required": encodePaymentRequiredHeader(value) }),
      ...extraHeaders,
    },
  });
}

test("observes and normalizes an official x402 v2 Bazaar challenge without paying", async () => {
  let request;
  const observation = await observeX402Resource({
    resourceUrl: URL,
    fetchImpl: async (url, init) => { request = { url, init }; return responseFor(challenge()); },
  });
  assert.equal(request.url, URL);
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.redirect, "manual");
  assert.equal(observation.profile, "org.emsenn.x402.public-resource-observation.v1");
  assert.equal(observation.paymentRequired.x402Version, 2);
  assert.equal(observation.paymentRequired.accepts[0].payTo, PAY_TO);
  assert.equal(observation.catalogResource.serviceName, "561 value");
  assert.equal(observation.bazaar.present, true);
  assert.equal(observation.bazaar.info.input.method, "GET");
  assert.deepEqual(observation.signedOffers, []);
  assert.match(observation.observationDigest, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.deepEqual(observation.authority, {
    publicReadOnly: true,
    paymentAttempted: false,
    signingAttempted: false,
    settlementAttempted: false,
    resourceBodyConsumed: false,
  });
});

test("produces the same semantic digest for the same challenge", async () => {
  const fetchImpl = async () => responseFor(challenge());
  const first = await observeX402Resource({ resourceUrl: URL, fetchImpl });
  const second = await observeX402Resource({ resourceUrl: URL, fetchImpl });
  assert.equal(first.observationDigest, second.observationDigest);
});

test("refuses credential-bearing, mutable-scheme, local, and non-HTTPS resource URLs before fetch", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return responseFor(challenge()); };
  await assert.rejects(observeX402Resource({ resourceUrl: "http://services.561.group/value", fetchImpl }), /credential-free HTTPS/u);
  await assert.rejects(observeX402Resource({ resourceUrl: "https://user:secret@services.561.group/value", fetchImpl }), /credential-free HTTPS/u);
  await assert.rejects(observeX402Resource({ resourceUrl: "https://127.0.0.1/value", fetchImpl }), /public HTTPS host/u);
  await assert.rejects(observeX402Resource({ resourceUrl: "https://[::ffff:127.0.0.1]/value", fetchImpl }), /public HTTPS host/u);
  await assert.rejects(observeX402Resource({ resourceUrl: "https://[fd00::1]/value", fetchImpl }), /public HTTPS host/u);
  await assert.rejects(observeX402Resource({ resourceUrl: `${URL}#fragment`, fetchImpl }), /credential-free HTTPS/u);
  assert.equal(calls, 0);
});

test("refuses redirects, non-402 responses, and missing payment-required headers", async () => {
  await assert.rejects(observeX402Resource({ resourceUrl: URL, fetchImpl: async () => responseFor(undefined, 302, { location: URL }) }), /redirects/u);
  await assert.rejects(observeX402Resource({ resourceUrl: URL, fetchImpl: async () => responseFor(undefined, 200) }), /not 402/u);
  await assert.rejects(observeX402Resource({ resourceUrl: URL, fetchImpl: async () => responseFor(undefined) }), /payment-required header/u);
});

test("refuses legacy, mismatched, empty, and non-EVM challenges", async () => {
  const observe = (value) => observeX402Resource({ resourceUrl: URL, fetchImpl: async () => responseFor(value) });
  const v1 = {
    x402Version: 1,
    accepts: [{ scheme: "exact", network: "base", maxAmountRequired: "1", resource: URL, description: "old", payTo: PAY_TO, maxTimeoutSeconds: 60, asset: ASSET }],
  };
  await assert.rejects(observe(v1), /legacy v1/u);
  await assert.rejects(observe(challenge({ resource: { url: "https://other.561.group/value" } })), /does not match/u);
  await assert.rejects(observe(challenge({ accepts: [] })), /official schema/u);
  await assert.rejects(observe(challenge({ accepts: [{ ...challenge().accepts[0], network: "solana:mainnet" }] })), /EVM CAIP-2/u);
});

test("refuses zero amounts, unknown schemes, invalid recipients, and Bazaar method drift", async () => {
  const observeAccept = (patch) => observeX402Resource({
    resourceUrl: URL,
    fetchImpl: async () => responseFor(challenge({ accepts: [{ ...challenge().accepts[0], ...patch }] })),
  });
  await assert.rejects(observeAccept({ amount: "0" }), /positive uint256/u);
  await assert.rejects(observeAccept({ scheme: "custom" }), /unsupported scheme/u);
  await assert.rejects(observeAccept({ payTo: "some-wallet" }), /public EVM address/u);
  const headExtension = declareDiscoveryExtension({ method: "HEAD", input: {}, output: { example: {} } });
  await assert.rejects(observeX402Resource({
    resourceUrl: URL,
    fetchImpl: async () => responseFor(challenge({ extensions: headExtension })),
  }), /method does not match/u);
});

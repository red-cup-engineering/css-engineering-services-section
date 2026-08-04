import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { encodePaymentSignatureHeader } from "@x402/core/http";
import {
  createExactEvmPaymentBoundary,
  x402PaymentIdentity,
  x402SettlementEvidence,
} from "../src/resource-server.mjs";

const NETWORK = "eip155:84532";
const PAY_TO = "0x0000000000000000000000000000000000000001";
const facilitator = {
  async getSupported() { return { kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }], extensions: [], signers: {} }; },
  async verify() { throw new Error("an unpaid assay must never verify"); },
  async settle() { throw new Error("an unpaid assay must never settle"); },
};

test("provider emits the official x402 v2 exact challenge", async () => {
  const boundary = createExactEvmPaymentBoundary({
    network: NETWORK,
    facilitatorClient: facilitator,
    routes: { "GET /value": { accepts: [{ scheme: "exact", network: NETWORK, price: "$0.001", payTo: PAY_TO }], description: "one value" } },
  });
  const app = express(); app.use(boundary.middleware); app.get("/value", (_request, response) => response.json({ value: true }));
  const server = app.listen(0, "127.0.0.1"); await new Promise((accept) => server.once("listening", accept));
  await new Promise((accept) => setTimeout(accept, 25));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/value`);
    assert.equal(response.status, 402);
    const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
    assert.equal(challenge.x402Version, 2);
    assert.equal(challenge.accepts[0].scheme, "exact");
    assert.equal(challenge.accepts[0].network, NETWORK);
    assert.equal(challenge.accepts[0].payTo.toLowerCase(), PAY_TO);
  } finally { await new Promise((accept) => server.close(accept)); }
});

test("provider refuses implicit networks and non-exact schemes", () => {
  assert.throws(() => createExactEvmPaymentBoundary({ network: "", facilitatorClient: facilitator, routes: { "GET /value": { accepts: { scheme: "exact" } } } }), /CAIP-2/u);
  assert.throws(() => createExactEvmPaymentBoundary({ network: NETWORK, facilitatorClient: facilitator, routes: { "GET /value": { accepts: { scheme: "custom" } } } }), /exact scheme/u);
});

test("identifies the same x402 payment at HTTP and settlement-hook faces", () => {
  const payload = {
    x402Version: 2,
    accepted: {
      scheme: "exact",
      network: NETWORK,
      amount: "12",
      asset: PAY_TO,
      payTo: PAY_TO,
      maxTimeoutSeconds: 300,
      extra: {},
    },
    payload: { signature: "0x1234" },
  };
  assert.equal(
    x402PaymentIdentity(encodePaymentSignatureHeader(payload)),
    x402PaymentIdentity(structuredClone(payload)),
  );
});

test("projects an official settlement callback into prototype-free durable evidence", () => {
  const payload = {
    x402Version: 2,
    accepted: {
      scheme: "exact",
      network: NETWORK,
      amount: "12",
      asset: PAY_TO,
      payTo: PAY_TO,
      maxTimeoutSeconds: 300,
      extra: {},
    },
    payload: { signature: "0x1234" },
  };
  const result = Object.assign(Object.create(null), {
    success: true,
    network: NETWORK,
    transaction: `0x${"ab".repeat(32)}`,
    payer: `0x${"CD".repeat(20)}`,
    amount: "12",
  });
  assert.deepEqual(x402SettlementEvidence({ paymentPayload: payload, result }), {
    type: "X402SettlementEvidence",
    invocation: x402PaymentIdentity(payload),
    success: true,
    network: NETWORK,
    transaction: `0x${"ab".repeat(32)}`,
    payer: `0x${"cd".repeat(20)}`,
    amount: "12",
  });
});

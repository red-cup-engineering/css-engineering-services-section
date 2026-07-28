import assert from "node:assert/strict";
import test from "node:test";

import { createPricedCapabilityBoundary } from "../src/priced-capability-boundary.mjs";

const INVOCATION = `sha256:${"ab".repeat(32)}`;
const SETTLEMENT = Object.freeze({
  type: "X402SettlementEvidence",
  invocation: INVOCATION,
  success: true,
  network: "eip155:5615610",
  transaction: `0x${"cd".repeat(32)}`,
  payer: `0x${"ef".repeat(20)}`,
  amount: "7",
});

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

function harness(overrides = {}) {
  const records = [];
  let settlementHook;
  const boundary = createPricedCapabilityBoundary({
    operation: "perform-one-capability",
    resourcePath: "/x402/capability/invoke",
    offerPath: "/x402/capability/offer",
    resultPath: "/x402/capability/result",
    offer: { kind: "org.emsenn.capability-offer.v3", operation: "perform-one-capability" },
    priceTerms: {
      network: "eip155:5615610",
      amount: "7",
      asset: `0x${"11".repeat(20)}`,
      payTo: `0x${"22".repeat(20)}`,
    },
    admit: async () => ({ admitted: true }),
    append: async (record) => { records.push(record); },
    execute: async ({ intent }) => ({ echoed: intent.request }),
    recoveredRecords: { intents: new Map(), terminals: new Map() },
    paymentIdentity: () => INVOCATION,
    settlementProjection: () => SETTLEMENT,
    paymentBoundaryFactory: ({ afterSettle }) => {
      settlementHook = afterSettle;
      return { middleware: (_request, _response, next) => next() };
    },
    ...overrides,
  });
  return { boundary, records, settle: (...args) => settlementHook(...args) };
}

test("durably retains the identified invocation intent before settlement can proceed", async () => {
  const order = [];
  const { boundary, records } = harness({
    append: async (record) => { order.push("append"); records?.push(record); },
  });
  const request = { body: { value: 1 }, get: () => "payment-header" };
  await boundary.retainIntentHandler(request, response(), () => order.push("next"));
  assert.deepEqual(order, ["append", "next"]);
});

test("executes one settled invocation at most once and durably retains its terminal result", async () => {
  let executions = 0;
  const intents = new Map([[INVOCATION, { invocation: INVOCATION, request: { value: 1 } }]]);
  const records = [];
  const { settle } = harness({
    recoveredRecords: { intents, terminals: new Map() },
    append: async (record) => { records.push(record); },
    execute: async () => { executions += 1; return { value: 2 }; },
  });
  const [first, second] = await Promise.all([settle({}), settle({})]);
  const third = await settle({});
  assert.equal(executions, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(second, third);
  assert.equal(records.length, 1);
  assert.equal(records[0].type, "PricedCapabilityInvocationReceipt");
});

test("retains typed execution refusal after successful settlement", async () => {
  const intents = new Map([[INVOCATION, { invocation: INVOCATION, request: {} }]]);
  const records = [];
  const { settle } = harness({
    recoveredRecords: { intents, terminals: new Map() },
    append: async (record) => { records.push(record); },
    execute: async () => { throw new Error("capability refused"); },
  });
  const terminal = await settle({});
  assert.equal(terminal.type, "PricedCapabilityInvocationRefusal");
  assert.equal(terminal.refusal.reason, "capability refused");
  assert.deepEqual(records, [terminal]);
});

test("projects recovered terminal and pending state without executing it again", () => {
  const pending = `sha256:${"33".repeat(32)}`;
  const terminal = { type: "CustomerTerminal", invocation: INVOCATION };
  const { boundary } = harness({
    recoveredRecords: {
      intents: new Map([[pending, { invocation: pending }]]),
      terminals: new Map([[INVOCATION, terminal]]),
    },
  });
  const terminalResponse = response();
  boundary.resultHandler({ params: { id: INVOCATION.slice(7) } }, terminalResponse);
  assert.equal(terminalResponse.statusCode, 200);
  assert.deepEqual(terminalResponse.body.terminal, terminal);
  const pendingResponse = response();
  boundary.resultHandler({ params: { id: pending.slice(7) } }, pendingResponse);
  assert.equal(pendingResponse.statusCode, 202);
  assert.equal(pendingResponse.body.status, "pending");
});

test("keeps deployment, economic, and protocol bindings injected", () => {
  let observed;
  harness({
    paymentBoundaryFactory: (configuration) => {
      observed = configuration;
      return { middleware: () => {} };
    },
  });
  assert.deepEqual(Object.keys(observed.routes), ["POST /x402/capability/invoke"]);
  const accepted = observed.routes["POST /x402/capability/invoke"].accepts[0];
  assert.equal(accepted.network, "eip155:5615610");
  assert.equal(accepted.price.amount, "7");
});

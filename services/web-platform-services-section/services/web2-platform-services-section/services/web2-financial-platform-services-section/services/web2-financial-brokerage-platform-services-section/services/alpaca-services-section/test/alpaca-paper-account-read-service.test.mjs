import assert from "node:assert/strict";
import test from "node:test";
import { createAlpacaPaperAccountReadService, createPaperFetchTransport } from "../scripts/paper-account-read.mjs";

const at = "2030-01-01T00:00:00.000Z";
const authorization = Object.freeze({
  id: "observe-1", type: "PrincipalPaperAccountObservationAuthorization", revoked: false,
  credentialReference: "credential-1", accountAlias: "alpaca-paper:esther", venue: "alpaca-trading-paper",
  scopes: ["account:read", "positions:read"], validUntil: "2031-01-01T00:00:00.000Z",
});

test("paper reader transport refuses every order-capable operation", async () => {
  const transport = createPaperFetchTransport(async () => new Response(JSON.stringify({}), { headers: { "content-type": "application/json" } }));
  await assert.rejects(transport({ method: "POST", url: "https://paper-api.alpaca.markets/v2/orders" }), /refused/u);
});

test("paper reader records observations without an order effect or credential disclosure", async () => {
  const calls = [];
  const service = await createAlpacaPaperAccountReadService({ ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "key", ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "secret" }, {
    now: () => at,
    authorityCustody: { async store() { return { reference: "credential-1" }; }, async retrieve() {}, async revoke() {} },
    async resolveObservationAuthorization(reference) { return reference === "observe-1" ? authorization : undefined; },
    adapter: {
      async readAccount(request) { calls.push(["account", request]); return { id: "account-read", venueRequestId: "venue-account", payload: { equity: "100" } }; },
      async listPositions(request) { calls.push(["positions", request]); return { id: "positions-read", venueRequestId: "venue-positions", payload: [] }; },
    },
    async recordObservation() { return { id: "book-1" }; },
  });
  const receipt = await service.observeEstherPaperAccount({ authorizationReference: "observe-1", at });
  assert.equal(receipt.orderEffect, false);
  assert.equal(receipt.secretBytesReturned, false);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(([, request]) => request.observationAuthorization.id), ["observe-1", "observe-1"]);
  assert.equal(JSON.stringify(receipt).includes("ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET"), false);
  assert.equal(JSON.stringify(receipt).includes('"secret"'), false);
});

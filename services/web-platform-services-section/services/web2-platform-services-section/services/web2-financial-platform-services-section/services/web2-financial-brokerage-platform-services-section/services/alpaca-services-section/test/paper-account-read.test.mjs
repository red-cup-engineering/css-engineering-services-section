import assert from "node:assert/strict";
import test from "node:test";
import { createAuthorityCustodyActuator, createEphemeralAuthorityCustodySubstrate } from "./support/ephemeral-authority-custody.mjs";
import { formPrincipalPaperAccountObservationAuthorization } from "@red-cup-engineering/principal-brokerage-interface";
import { createAlpacaPaperAccountReadService } from "../scripts/paper-account-read.mjs";

const NOW = "2026-07-22T12:00:00.000Z", UNTIL = "2026-07-22T12:15:00.000Z";
const offer = { type: "PrincipalBrokerageOnboardingOffer", id: "sha256:offer", principal: "urn:principal:esther-davis", venue: "alpaca-trading-paper", sponsored: true, scopes: ["account:read", "positions:read", "orders:paper"], validUntil: "2026-07-23T00:00:00.000Z" };

test("paper account read loads only named paper credentials and returns a scrubbed readonly observation", async () => {
  let authorization, requested = [];
  const authorityCustody = createAuthorityCustodyActuator({ substrate: createEphemeralAuthorityCustodySubstrate(), clock: () => NOW });
  const service = await createAlpacaPaperAccountReadService({ ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "id-secret", ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "secret-value", UNRELATED_SECRET: "never-read" }, { authorityCustody,
    now: () => NOW, resolveObservationAuthorization: async (id) => id === authorization?.id ? authorization : null,
    fetchImpl: async (url, init) => { requested.push({ url, init }); return { status: 200, headers: { get: (name) => name === "content-type" ? "application/json" : "request-1" }, json: async () => url.endsWith("/account") ? { equity: "100", apiSecret: "do-not-leak" } : [{ symbol: "SPY", qty: "1", token: "do-not-leak" }] }; },
    recordObservation: async () => ({ graph: "ni:///sha-256;books" }),
  });
  authorization = formPrincipalPaperAccountObservationAuthorization({ offer, acceptanceReference: "urn:sha256:ab8b93756285ac2a10ecb185460caf2786865a02ab18413f5f45da387894115d", accountAlias: "alpaca-paper:esther", credentialReference: service.credentialReference, now: NOW, validUntil: UNTIL });
  const result = await service.observeEstherPaperAccount({ authorizationReference: authorization.id, at: NOW });
  assert.equal(result.orderEffect, false); assert.equal(JSON.stringify(result).includes("secret-value"), false); assert.equal(JSON.stringify(result).includes("do-not-leak"), false);
  assert.deepEqual(requested.map(({ url, init }) => [url, init.method]), [["https://paper-api.alpaca.markets/v2/account", "GET"], ["https://paper-api.alpaca.markets/v2/positions", "GET"]]);
  await assert.rejects(createAlpacaPaperAccountReadService({}, { resolveObservationAuthorization: async () => null, recordObservation: async () => ({ graph: "x" }) }), /TRADING_KEY/u);
});

test("observation authorization is readonly, capped at fifteen minutes, and revocable at resolution", async () => {
  assert.throws(() => formPrincipalPaperAccountObservationAuthorization({ offer, acceptanceReference: "a", accountAlias: "alpaca-paper:esther", credentialReference: "urn:x", now: NOW, validUntil: "2026-07-22T12:15:00.001Z" }), /lifetime/u);
  const authorization = formPrincipalPaperAccountObservationAuthorization({ offer, acceptanceReference: "a", accountAlias: "alpaca-paper:esther", credentialReference: "urn:x", now: NOW, validUntil: UNTIL });
  assert.deepEqual(authorization.scopes, ["account:read", "positions:read"]); assert.equal(authorization.effect.includes("no-order-authority"), true);
});

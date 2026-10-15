import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_WITNESS_ROOT,
  IDENTITY_SETTLEMENT_PROFILE,
  SEN_NORMALIZATION_PROFILE,
  admitJsonSemanticContent,
  identifyJsonSemanticContent,
  semanticIdOf,
} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";

import { formPrincipalMandate } from "../src/contract-kernel.mjs";

const mandateInput = Object.freeze({
  principal: "urn:leader:emsenn",
  venue: "alpaca-trading-paper",
  accountReference: "urn:brokerage-account:paper",
  capital: { amount: 1000, currency: "USD" },
  risk: {
    maximumLossAmount: 100,
    maximumOrderNotional: 250,
    maximumAggregateNotional: 500,
    concentrationLimit: 0.25,
    leverageLimit: 1,
    shorting: false,
    options: false,
  },
  scopes: ["orders:intent", "account:read"],
  validUntil: "2030-01-01T00:00:00.000Z",
});

test("contract output crosses the typed v2 identity boundary and is admitted by its receiver", () => {
  const mandate = formPrincipalMandate(mandateInput);
  const { id, ...body } = mandate;
  const identity = identifyJsonSemanticContent({
    objectKind: "brokerage-control.principal-mandate",
    value: body,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });

  assert.equal(id, identity.token);
  assert.match(id, /^ni:\/\/\/sha-256;/u);
  assert.equal(identity.envelope.objectKind, "brokerage-control.principal-mandate");
  assert.equal(identity.envelope.normalizationProfile, SEN_NORMALIZATION_PROFILE);
  assert.equal(identity.envelope.settlementProfile, IDENTITY_SETTLEMENT_PROFILE);

  const admitted = admitJsonSemanticContent({
    bytes: identity.bytes,
    token: identity.token,
    objectKind: "brokerage-control.principal-mandate",
  });
  assert.deepEqual(admitted.value, body);
});

test("object kind is an identity input, never inferred from carrier shape", () => {
  const value = { type: "PrincipalBrokerageMandate", claim: "same carrier" };
  const mandateId = semanticIdOf("brokerage-control.principal-mandate")(value);
  const offerId = semanticIdOf("brokerage-control.paid-api-offer")(value);
  assert.notEqual(mandateId, offerId);
  assert.throws(() => semanticIdOf(undefined), /semantic-object-kind-required/u);
});

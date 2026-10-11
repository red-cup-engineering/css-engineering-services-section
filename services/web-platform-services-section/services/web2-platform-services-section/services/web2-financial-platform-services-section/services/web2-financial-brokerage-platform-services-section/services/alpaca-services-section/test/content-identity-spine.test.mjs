import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_SETTLEMENT_PROFILE,
  RMN_NORMALIZATION_PROFILE,
  admitJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

import { formPrincipalMandate } from "../src/contract-kernel.mjs";
import { identifyRelationalContent, relationalId } from "../src/relational-id.mjs";

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
  const identity = identifyRelationalContent(body, {
    objectKind: "brokerage-control.principal-mandate",
  });

  assert.equal(id, identity.token);
  assert.match(id, /^ni:\/\/\/sha-256;/u);
  assert.equal(identity.envelope.objectKind, "brokerage-control.principal-mandate");
  assert.equal(identity.envelope.normalizationProfile, RMN_NORMALIZATION_PROFILE);
  assert.equal(identity.envelope.settlementProfile, IDENTITY_SETTLEMENT_PROFILE);

  const admitted = admitJsonSemanticContent({
    bytes: identity.bytes,
    token: identity.token,
    objectKind: "brokerage-control.principal-mandate",
  });
  assert.deepEqual(admitted.value, body);
});

test("object kind and profiles are identity inputs, never inferred settlement from carrier shape", () => {
  const value = { type: "PrincipalBrokerageMandate", claim: "same carrier" };
  const mandateId = relationalId(value, { objectKind: "brokerage-control.principal-mandate" });
  const offerId = relationalId(value, { objectKind: "brokerage-control.paid-api-offer" });
  assert.notEqual(mandateId, offerId);
  assert.throws(() => relationalId(value), /semantic-object-kind-required/u);
  assert.throws(
    () => relationalId(value, {
      objectKind: "brokerage-control.principal-mandate",
      settlementProfile: "urn:foreign:settlement",
    }),
    /settlement-profile-unsupported/u,
  );
});

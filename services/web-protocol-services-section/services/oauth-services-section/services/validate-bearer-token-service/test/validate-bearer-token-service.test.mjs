import assert from "node:assert/strict";
import test from "node:test";

import { validateBearerToken } from "../src/validate-bearer-token-service.mjs";

test("returns identity claims for a live token", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "person@example.com", expires_at: Date.now() + 60_000 }]]);
  assert.deepEqual(validateBearerToken("tok-1", tokens), { client_id: "client_1", email: "person@example.com" });
});

test("returns null for an unknown token", () => {
  assert.equal(validateBearerToken("nope", new Map()), null);
});

test("returns null for an expired token", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "person@example.com", expires_at: Date.now() - 1 }]]);
  assert.equal(validateBearerToken("tok-1", tokens), null);
});

test("honors an injected `now` for deterministic expiry testing", () => {
  const tokens = new Map([["tok-1", { client_id: "client_1", email: "person@example.com", expires_at: 1000 }]]);
  assert.equal(validateBearerToken("tok-1", tokens, 1001), null);
  assert.deepEqual(validateBearerToken("tok-1", tokens, 500), { client_id: "client_1", email: "person@example.com" });
});

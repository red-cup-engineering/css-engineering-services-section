import assert from "node:assert/strict";
import test from "node:test";

import { OAuthError } from "../src/oauth-error.mjs";

test("carries code and description, and formats them into message", () => {
  const err = new OAuthError("invalid_grant", "code invalid or expired");
  assert.equal(err.code, "invalid_grant");
  assert.equal(err.description, "code invalid or expired");
  assert.equal(err.message, "invalid_grant: code invalid or expired");
  assert.ok(err instanceof Error);
});

test("description defaults to empty string", () => {
  const err = new OAuthError("server_error");
  assert.equal(err.description, "");
  assert.equal(err.message, "server_error: ");
});

test("two errors constructed from separately-imported references are the same class (identity)", async () => {
  // Regression guard for the exact bug this shared module exists to prevent:
  // re-importing the same specifier must not produce a second class identity.
  const { OAuthError: OAuthErrorAgain } = await import("../src/oauth-error.mjs");
  assert.equal(OAuthErrorAgain, OAuthError);
  assert.ok(new OAuthErrorAgain("invalid_client") instanceof OAuthError);
});

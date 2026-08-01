import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { mintBearerTokenRecord, redeemAuthorizationCode } from "../src/redeem-authorization-code-service.mjs";
import { OAuthError } from "../node_modules/@red-cup-engineering/oauth-services-section/src/oauth-error.mjs";

function pkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
  return { verifier, challenge };
}

test("redeems a valid code into a bearer token record", () => {
  const { verifier, challenge } = pkcePair();
  const record = { client_id: "client_1", redirect_uri: "https://app.example/cb", code_challenge: challenge, email: "person@example.com", expires_at: Date.now() + 60_000 };
  const minted = redeemAuthorizationCode({ record, clientId: "client_1", codeVerifier: verifier, redirectUri: "https://app.example/cb" });
  assert.ok(minted.accessToken.length > 0);
  assert.ok(minted.refreshToken.length > 0);
  assert.equal(minted.response.token_type, "Bearer");
  assert.equal(minted.response.expires_in, 3600);
  assert.equal(minted.tokenRecord.email, "person@example.com");
  assert.equal(minted.refreshRecord.client_id, "client_1");
});

test("refuses a missing or expired record with invalid_grant", () => {
  assert.throws(
    () => redeemAuthorizationCode({ record: undefined, clientId: "c", codeVerifier: "v", redirectUri: "r" }),
    (err) => err instanceof OAuthError && err.code === "invalid_grant",
  );
  const { verifier, challenge } = pkcePair();
  const expired = { client_id: "c", redirect_uri: "r", code_challenge: challenge, email: "e", expires_at: Date.now() - 1 };
  assert.throws(
    () => redeemAuthorizationCode({ record: expired, clientId: "c", codeVerifier: verifier, redirectUri: "r" }),
    (err) => err instanceof OAuthError && err.code === "invalid_grant",
  );
});

test("refuses a client_id or redirect_uri mismatch with invalid_grant", () => {
  const { verifier, challenge } = pkcePair();
  const record = { client_id: "client_1", redirect_uri: "https://app.example/cb", code_challenge: challenge, email: "e", expires_at: Date.now() + 60_000 };
  assert.throws(
    () => redeemAuthorizationCode({ record, clientId: "client_2", codeVerifier: verifier, redirectUri: "https://app.example/cb" }),
    (err) => err instanceof OAuthError && err.code === "invalid_grant",
  );
  assert.throws(
    () => redeemAuthorizationCode({ record, clientId: "client_1", codeVerifier: verifier, redirectUri: "https://other.example/cb" }),
    (err) => err instanceof OAuthError && err.code === "invalid_grant",
  );
});

test("refuses a PKCE verifier that does not hash to the stored challenge", () => {
  const { challenge } = pkcePair();
  const record = { client_id: "client_1", redirect_uri: "https://app.example/cb", code_challenge: challenge, email: "e", expires_at: Date.now() + 60_000 };
  assert.throws(
    () => redeemAuthorizationCode({ record, clientId: "client_1", codeVerifier: "wrong-verifier", redirectUri: "https://app.example/cb" }),
    (err) => err instanceof OAuthError && err.code === "invalid_grant",
  );
});

test("mintBearerTokenRecord mints distinct access and refresh tokens with the given identity", () => {
  const minted = mintBearerTokenRecord("client_9", "someone@example.com");
  assert.notEqual(minted.accessToken, minted.refreshToken);
  assert.equal(minted.tokenRecord.client_id, "client_9");
  assert.equal(minted.refreshRecord.email, "someone@example.com");
  assert.ok(minted.refreshRecord.expires_at > minted.tokenRecord.expires_at);
});

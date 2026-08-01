import assert from "node:assert/strict";
import test from "node:test";

import { mintAuthorizationRequest } from "../src/mint-authorization-request-service.mjs";
import { OAuthError } from "../node_modules/@red-cup-engineering/oauth-services-section/src/oauth-error.mjs";

const client = { client_id: "client_abc", redirect_uris: ["https://app.example/cb"] };

test("mints a pending record keyed by a fresh state token", () => {
  const { state, record } = mintAuthorizationRequest({
    client,
    redirectUri: "https://app.example/cb",
    codeChallenge: "challenge-value",
    codeChallengeMethod: "S256",
    state: "client-state",
  });
  assert.ok(state.length > 0);
  assert.equal(record.client_id, "client_abc");
  assert.equal(record.redirect_uri, "https://app.example/cb");
  assert.equal(record.code_challenge, "challenge-value");
  assert.equal(record.state, "client-state");
  assert.ok(record.expires_at > Date.now());
});

test("refuses an unknown client with invalid_client", () => {
  assert.throws(
    () => mintAuthorizationRequest({ client: undefined, redirectUri: "https://app.example/cb", codeChallenge: "c", codeChallengeMethod: "S256", state: undefined }),
    (err) => err instanceof OAuthError && err.code === "invalid_client",
  );
});

test("refuses an unregistered redirect_uri with invalid_request", () => {
  assert.throws(
    () => mintAuthorizationRequest({ client, redirectUri: "https://evil.example/cb", codeChallenge: "c", codeChallengeMethod: "S256", state: undefined }),
    (err) => err instanceof OAuthError && err.code === "invalid_request",
  );
});

test("refuses a non-S256 PKCE method with invalid_request", () => {
  assert.throws(
    () => mintAuthorizationRequest({ client, redirectUri: "https://app.example/cb", codeChallenge: "c", codeChallengeMethod: "plain", state: undefined }),
    (err) => err instanceof OAuthError && err.code === "invalid_request",
  );
});

test("two requests for the same client mint distinct state tokens", () => {
  const one = mintAuthorizationRequest({ client, redirectUri: "https://app.example/cb", codeChallenge: "c", codeChallengeMethod: "S256", state: undefined });
  const two = mintAuthorizationRequest({ client, redirectUri: "https://app.example/cb", codeChallenge: "c", codeChallengeMethod: "S256", state: undefined });
  assert.notEqual(one.state, two.state);
});

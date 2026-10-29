import assert from "node:assert/strict";
import test from "node:test";

import { canonical } from "../src/records.mjs";
import { GoogleOAuthRefreshError, obtainGoogleAccessToken } from "../src/google-oauth-refresh.mjs";

test("a supplied access token performs no OAuth request", async () => {
  let called = false;
  const result = await obtainGoogleAccessToken({ accessToken: "access-secret", fetchImpl: async () => { called = true; } });
  assert.equal(result.accessToken, "access-secret");
  assert.equal(result.observation.tokenEndpointRequests, 0);
  assert.equal(called, false);
  assert.equal(canonical(result.observation).includes("access-secret"), false);
});

test("refresh credentials use the fixed Google token endpoint once without leaking credentials", async () => {
  let request;
  const result = await obtainGoogleAccessToken({
    clientId: "client-id", clientSecret: "client-secret", refreshToken: "refresh-secret",
    fetchImpl: async (url, init) => {
      request = { url, method: init.method, contentType: init.headers["content-type"], body: String(init.body) };
      return new Response(JSON.stringify({ access_token: "fresh-access-secret", expires_in: 3600, token_type: "Bearer" }),
        { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(request.url, "https://oauth2.googleapis.com/token");
  assert.equal(request.method, "POST");
  assert.equal(request.contentType, "application/x-www-form-urlencoded");
  assert.match(request.body, /grant_type=refresh_token/u);
  assert.equal(result.accessToken, "fresh-access-secret");
  assert.deepEqual(result.observation, { source: "oauth-refresh-token", tokenEndpointRequests: 1,
    expiresInSeconds: 3600, credentialMaterialRecorded: false });
  assert.equal(canonical(result.observation).includes("secret"), false);
});

test("OAuth refusal exposes status and digest but not response or credential bytes", async () => {
  await assert.rejects(async () => obtainGoogleAccessToken({
    clientId: "client-id", clientSecret: "client-secret", refreshToken: "refresh-secret",
    fetchImpl: async () => new Response(JSON.stringify({ error: "invalid_grant", error_description: "refresh-secret rejected" }),
      { status: 400, statusText: "Bad Request" }),
  }), (error) => {
    assert.equal(error instanceof GoogleOAuthRefreshError, true);
    assert.equal(error.code, "google-oauth-refresh-refused");
    assert.equal(error.evidence.status, 400);
    assert.match(error.evidence.bodyDigest, /^sha256:[a-f0-9]{64}$/u);
    assert.equal(canonical(error.evidence).includes("refresh-secret"), false);
    return true;
  });
});

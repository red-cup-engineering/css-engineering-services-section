import assert from "node:assert/strict";
import test from "node:test";

import { exchangeGoogleCallback } from "../src/exchange-google-callback-service.mjs";
import { OAuthError } from "../node_modules/@red-cup-engineering/oauth-services-section/src/oauth-error.mjs";

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function idToken(payload) {
  return `${base64url({ alg: "none" })}.${base64url(payload)}.`;
}

function withMockedFetch(response, run) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  return run().finally(() => { globalThis.fetch = original; });
}

test("exchanges a google code for verified identity claims", async () => {
  const response = { ok: true, json: async () => ({ id_token: idToken({ email: "person@example.com", email_verified: true }) }) };
  await withMockedFetch(response, async () => {
    const identity = await exchangeGoogleCallback("google-code", { googleClientId: "id", googleClientSecret: "secret", publicBaseUrl: "https://ops.561.group" });
    assert.deepEqual(identity, { email: "person@example.com", emailVerified: true });
  });
});

test("treats a missing email_verified claim as verified", async () => {
  const response = { ok: true, json: async () => ({ id_token: idToken({ email: "person@example.com" }) }) };
  await withMockedFetch(response, async () => {
    const identity = await exchangeGoogleCallback("code", { googleClientId: "id", googleClientSecret: "secret", publicBaseUrl: "https://a.example" });
    assert.equal(identity.emailVerified, true);
  });
});

test("treats email_verified: false and the string 'false' as unverified", async () => {
  const response = { ok: true, json: async () => ({ id_token: idToken({ email: "person@example.com", email_verified: false }) }) };
  await withMockedFetch(response, async () => {
    const identity = await exchangeGoogleCallback("code", { googleClientId: "id", googleClientSecret: "secret", publicBaseUrl: "https://a.example" });
    assert.equal(identity.emailVerified, false);
  });
});

test("throws server_error when the token endpoint responds not-ok", async () => {
  await withMockedFetch({ ok: false, json: async () => ({}) }, async () => {
    await assert.rejects(
      () => exchangeGoogleCallback("code", { googleClientId: "id", googleClientSecret: "secret", publicBaseUrl: "https://a.example" }),
      (err) => err instanceof OAuthError && err.code === "server_error" && err.description === "Google token exchange failed",
    );
  });
});

test("throws server_error when there is no id_token or no email claim in it", async () => {
  await withMockedFetch({ ok: true, json: async () => ({}) }, async () => {
    await assert.rejects(
      () => exchangeGoogleCallback("code", { googleClientId: "id", googleClientSecret: "secret", publicBaseUrl: "https://a.example" }),
      (err) => err instanceof OAuthError && err.code === "server_error" && err.description === "no email in Google response",
    );
  });
  const noEmailToken = { ok: true, json: async () => ({ id_token: idToken({ sub: "123" }) }) };
  await withMockedFetch(noEmailToken, async () => {
    await assert.rejects(
      () => exchangeGoogleCallback("code", { googleClientId: "id", googleClientSecret: "secret", publicBaseUrl: "https://a.example" }),
      (err) => err instanceof OAuthError && err.code === "server_error",
    );
  });
});

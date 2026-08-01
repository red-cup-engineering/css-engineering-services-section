import assert from "node:assert/strict";
import test from "node:test";

import { relayToGoogleConsent } from "../src/relay-to-google-consent-service.mjs";

test("builds the accounts.google.com consent URL with the expected fixed parameters", () => {
  const url = new URL(relayToGoogleConsent({ state: "abc123", googleClientId: "google-client-id", publicBaseUrl: "https://ops.561.group" }));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), "google-client-id");
  assert.equal(url.searchParams.get("redirect_uri"), "https://ops.561.group/oauth/google/callback");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email");
  assert.equal(url.searchParams.get("state"), "abc123");
  assert.equal(url.searchParams.get("access_type"), "online");
});

test("carries the exact state token through unmodified", () => {
  const url = new URL(relayToGoogleConsent({ state: "different-state-token", googleClientId: "x", publicBaseUrl: "https://a.example" }));
  assert.equal(url.searchParams.get("state"), "different-state-token");
});

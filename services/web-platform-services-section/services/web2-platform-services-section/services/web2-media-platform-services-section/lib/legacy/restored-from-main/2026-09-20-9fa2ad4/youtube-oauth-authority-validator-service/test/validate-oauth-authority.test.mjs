import assert from "node:assert/strict";
import test from "node:test";
import { validateOAuthAuthority } from "../src/validate-oauth-authority.mjs";

const CHANNEL = "UCaaaaaaaaaaaaaaaaaaaaaa";
const REQUIRED_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
]);
const env = Object.freeze({
  CLIENT_ID: "client-id",
  CLIENT_SECRET: "client-secret",
  REFRESH_TOKEN: "refresh-token",
});

function baseInput(overrides = {}) {
  return {
    env,
    expectedChannelId: CHANNEL,
    clientIdEnvName: "CLIENT_ID",
    clientSecretEnvName: "CLIENT_SECRET",
    refreshTokenEnvName: "REFRESH_TOKEN",
    requiredScopes: REQUIRED_SCOPES,
    ...overrides,
  };
}

function fake(options = {}) {
  let calls = 0;
  return {
    calls: () => calls,
    fetch: async (url) => {
      calls++;
      if (String(url).includes("oauth2.googleapis.com")) {
        if (options.status) return new Response("nope", { status: options.status });
        return new Response(JSON.stringify({ access_token: "SENTINEL", scope: options.scope ?? REQUIRED_SCOPES.join(" ") }));
      }
      return new Response(JSON.stringify({ items: [{ id: options.id ?? CHANNEL }] }));
    },
  };
}

test("valid grant confirms the channel and never leaks the token", async () => {
  const f = fake();
  const result = await validateOAuthAuthority(baseInput({ fetchImpl: f.fetch }));
  assert.deepEqual(result, { classification: "valid", channel: CHANNEL, declaredScopes: REQUIRED_SCOPES, tokenScopes: [...REQUIRED_SCOPES] });
  assert.equal(f.calls(), 2);
  assert.equal(JSON.stringify(result).includes("SENTINEL"), false);
});

test("a malformed expected channel id is refused before any network call", async () => {
  const f = fake();
  const result = await validateOAuthAuthority(baseInput({ expectedChannelId: "not-a-channel", fetchImpl: f.fetch }));
  assert.deepEqual(result, { classification: "invalid", reason: "channel-contract" });
  assert.equal(f.calls(), 0);
});

test("missing credentials are refused before any network call", async () => {
  const f = fake();
  const result = await validateOAuthAuthority(baseInput({ env: {}, fetchImpl: f.fetch }));
  assert.deepEqual(result, { classification: "invalid", reason: "missing-credential" });
  assert.equal(f.calls(), 0);
});

test("a rejected token exchange is refused without leaking", async () => {
  const f = fake({ status: 400 });
  const result = await validateOAuthAuthority(baseInput({ fetchImpl: f.fetch }));
  assert.deepEqual(result, { classification: "invalid", reason: "token-rejected" });
  assert.equal(JSON.stringify(result).includes("SENTINEL"), false);
});

test("a granted scope set missing a required scope is a scope-contract mismatch", async () => {
  const f = fake({ scope: REQUIRED_SCOPES[0] });
  const result = await validateOAuthAuthority(baseInput({ fetchImpl: f.fetch }));
  assert.deepEqual(result, { classification: "invalid", reason: "scope-contract-mismatch" });
});

test("a channel identity mismatch is refused without leaking", async () => {
  const f = fake({ id: "UCbbbbbbbbbbbbbbbbbbbbbb" });
  const result = await validateOAuthAuthority(baseInput({ fetchImpl: f.fetch }));
  assert.deepEqual(result, { classification: "invalid", reason: "channel-mismatch" });
  assert.equal(JSON.stringify(result).includes("SENTINEL"), false);
});

test("a network failure classifies as provider-unavailable", async () => {
  const result = await validateOAuthAuthority(baseInput({ fetchImpl: async () => { throw new Error("network down"); } }));
  assert.deepEqual(result, { classification: "invalid", reason: "provider-unavailable" });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshAccessToken, authorizedFetch, resolveChannelSecrets, RUN_REQUIRED_SCOPES } from "../src/google-oauth.mjs";

test("refreshAccessToken exchanges a refresh token for an access token", async () => {
  const fetchImpl = async (url, init) => {
    assert.equal(url, "https://oauth2.googleapis.com/token");
    assert.equal(init.method, "POST");
    return { ok: true, json: async () => ({ access_token: "at-1", scope: "a b" }) };
  };
  const token = await refreshAccessToken({ clientId: "id", clientSecret: "secret", refreshToken: "rt" }, { fetchImpl });
  assert.equal(token, "at-1");
});

test("refreshAccessToken throws when a required scope is missing", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ access_token: "at-1", scope: "a" }) });
  await assert.rejects(
    refreshAccessToken({ clientId: "id", clientSecret: "secret", refreshToken: "rt" }, { fetchImpl, requiredScopes: ["b"] }),
    /required scope/,
  );
});

test("refreshAccessToken throws on incomplete credentials", async () => {
  await assert.rejects(refreshAccessToken({ clientId: "id" }, {}), TypeError);
});

test("refreshAccessToken passes RUN_REQUIRED_SCOPES against a token granting this channel's real three scopes", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ access_token: "at-1", scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/yt-analytics.readonly" }) });
  const token = await refreshAccessToken({ clientId: "id", clientSecret: "secret", refreshToken: "rt" }, { fetchImpl, requiredScopes: RUN_REQUIRED_SCOPES });
  assert.equal(token, "at-1");
});

test("refreshAccessToken refuses RUN_REQUIRED_SCOPES against a token lacking youtube.upload, naming the missing scope", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ access_token: "at-1", scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly" }) });
  await assert.rejects(
    refreshAccessToken({ clientId: "id", clientSecret: "secret", refreshToken: "rt" }, { fetchImpl, requiredScopes: RUN_REQUIRED_SCOPES }),
    /youtube\.upload/,
  );
});

test("authorizedFetch injects a bearer header and refuses a foreign host", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true }; };
  const call = authorizedFetch("token-1", fetchImpl);
  await call("https://www.googleapis.com/youtube/v3/channels");
  assert.equal(calls[0].init.headers.get("authorization"), "Bearer token-1");
  await assert.rejects(async () => call("https://evil.example.com/steal"), TypeError);
});

test("authorizedFetch refuses a caller-supplied authorization header", async () => {
  const call = authorizedFetch("token-1", async () => ({ ok: true }));
  await assert.rejects(async () => call("https://www.googleapis.com/x", { headers: { authorization: "Bearer other" } }), TypeError);
});

test("resolveChannelSecrets reads the three named env vars", () => {
  const secrets = { oauthClientIdName: "ID", oauthClientSecretName: "SECRET", refreshTokenName: "REFRESH" };
  const resolved = resolveChannelSecrets(secrets, { ID: "id-1", SECRET: "secret-1", REFRESH: "refresh-1" });
  assert.deepEqual(resolved, { clientId: "id-1", clientSecret: "secret-1", refreshToken: "refresh-1" });
});

test("resolveChannelSecrets lists every missing secret name", () => {
  const secrets = { oauthClientIdName: "ID", oauthClientSecretName: "SECRET", refreshTokenName: "REFRESH" };
  assert.throws(() => resolveChannelSecrets(secrets, {}), /ID, SECRET, REFRESH/);
});

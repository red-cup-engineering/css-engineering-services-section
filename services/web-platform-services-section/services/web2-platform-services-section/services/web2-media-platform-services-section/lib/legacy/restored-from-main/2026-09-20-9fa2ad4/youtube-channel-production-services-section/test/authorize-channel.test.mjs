import { test } from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile as readFixture } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  authorizeChannel, buildConsentUrl, exchangeCodeForTokens, receiveAuthorizationCode,
  verifyAuthorizedIdentity, writeRefreshTokenFile, REQUIRED_SCOPES,
} from "../scripts/authorize-channel.mjs";

const spec = JSON.parse(await readFixture(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));

function fakeServer(port) {
  let handler;
  const server = {
    listening: false,
    once() {},
    listen(_port, _host, callback) { server.listening = true; queueMicrotask(callback); },
    address() { return { port }; },
    close() { server.listening = false; },
    closeAllConnections() {},
  };
  const createServer = (requestHandler) => { handler = requestHandler; return server; };
  return { createServer, deliver: (req, res) => handler(req, res) };
}

function fakeRes() {
  const res = { statusCode: undefined, body: undefined, writeHead(code) { res.statusCode = code; }, end(body) { res.body = body; } };
  return res;
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => JSON.stringify(body), json: async () => body };
}

test("buildConsentUrl carries every required scope and PKCE parameter", () => {
  const url = new URL(buildConsentUrl({ clientId: "id-1", redirectUri: "http://127.0.0.1:9999", scopes: REQUIRED_SCOPES, state: "s-1", challenge: "c-1" }));
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), "id-1");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:9999");
  assert.equal(url.searchParams.get("scope"), REQUIRED_SCOPES.join(" "));
  assert.equal(url.searchParams.get("state"), "s-1");
  assert.equal(url.searchParams.get("code_challenge"), "c-1");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("receiveAuthorizationCode resolves once the redirect carries the matching state and code", async () => {
  const { createServer, deliver } = fakeServer(41111);
  let observedRedirectUri;
  const received = receiveAuthorizationCode({
    createServer, state: "state-1",
    onListening: (redirectUri) => { observedRedirectUri = redirectUri; },
  });
  await new Promise((resolve) => queueMicrotask(resolve));
  const res = fakeRes();
  deliver({ url: "/?code=code-1&state=state-1" }, res);
  const result = await received;
  assert.equal(result.code, "code-1");
  assert.equal(result.redirectUri, observedRedirectUri);
  assert.equal(res.statusCode, 200);
});

test("receiveAuthorizationCode rejects on a state mismatch", async () => {
  const { createServer, deliver } = fakeServer(41112);
  const received = receiveAuthorizationCode({ createServer, state: "state-1", onListening: () => {} });
  await new Promise((resolve) => queueMicrotask(resolve));
  deliver({ url: "/?code=code-1&state=wrong" }, fakeRes());
  await assert.rejects(received, /state mismatch/);
});

test("receiveAuthorizationCode rejects when Google reports an error", async () => {
  const { createServer, deliver } = fakeServer(41113);
  const received = receiveAuthorizationCode({ createServer, state: "state-1", onListening: () => {} });
  await new Promise((resolve) => queueMicrotask(resolve));
  deliver({ url: "/?error=access_denied&state=state-1" }, fakeRes());
  await assert.rejects(received, /OAuth refused: access_denied/);
});

test("receiveAuthorizationCode times out when no redirect arrives", async () => {
  const { createServer } = fakeServer(41114);
  await assert.rejects(receiveAuthorizationCode({ createServer, state: "state-1", timeoutMs: 5, onListening: () => {} }), /timed out/);
});

test("exchangeCodeForTokens posts the PKCE verifier and returns the granted tokens", async () => {
  const fetchImpl = async (url, init) => {
    assert.equal(url, "https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body);
    assert.equal(body.get("code"), "code-1");
    assert.equal(body.get("code_verifier"), "verifier-1");
    assert.equal(body.get("grant_type"), "authorization_code");
    return jsonResponse({ access_token: "at-1", refresh_token: "rt-1", scope: "a" });
  };
  const tokens = await exchangeCodeForTokens({ code: "code-1", redirectUri: "http://127.0.0.1:1", verifier: "verifier-1", clientId: "id", clientSecret: "secret", fetchImpl });
  assert.equal(tokens.refresh_token, "rt-1");
});

test("exchangeCodeForTokens throws when the grant carries no refresh token", async () => {
  const fetchImpl = async () => jsonResponse({ access_token: "at-1" });
  await assert.rejects(exchangeCodeForTokens({ code: "c", redirectUri: "r", verifier: "v", clientId: "i", clientSecret: "s", fetchImpl }), /incomplete credentials/);
});

test("verifyAuthorizedIdentity accepts a matching channel id", async () => {
  const fetchImpl = async () => jsonResponse({ items: [{ id: spec.youtubeChannelId, snippet: { title: "Fixture Channel" } }] });
  const channel = await verifyAuthorizedIdentity({ accessToken: "at-1", expectedChannelId: spec.youtubeChannelId, fetchImpl });
  assert.equal(channel.id, spec.youtubeChannelId);
});

test("verifyAuthorizedIdentity refuses and names the wrongly-picked channel", async () => {
  const fetchImpl = async () => jsonResponse({ items: [{ id: "UCwrongwrongwrongwrongwrong", snippet: { title: "Someone Else's Channel" } }] });
  await assert.rejects(
    verifyAuthorizedIdentity({ accessToken: "at-1", expectedChannelId: spec.youtubeChannelId, fetchImpl }),
    /Someone Else's Channel.*UCwrongwrongwrongwrongwrong/s,
  );
});

test("writeRefreshTokenFile writes only to disk, mode 0600, and never to stdout", async () => {
  const dir = await mkdtemp(join(tmpdir(), "authorize-channel-test-"));
  try {
    const outPath = join(dir, "refresh-token");
    const originalWrite = process.stdout.write;
    let stdoutCalls = 0;
    process.stdout.write = (...args) => { stdoutCalls += 1; return originalWrite.apply(process.stdout, args); };
    try {
      await writeRefreshTokenFile({ outPath, refreshToken: "super-secret-refresh-token" });
    } finally {
      process.stdout.write = originalWrite;
    }
    assert.equal(stdoutCalls, 0);
    const contents = await readFile(outPath, "utf8");
    assert.equal(contents, "super-secret-refresh-token\n");
    const stats = await stat(outPath);
    assert.equal(stats.mode & 0o777, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("authorizeChannel runs the full flow and returns no token field", async () => {
  const dir = await mkdtemp(join(tmpdir(), "authorize-channel-test-"));
  try {
    const outPath = join(dir, "refresh-token");
    const { createServer, deliver } = fakeServer(41115);
    const environment = { FIXTURE_OAUTH_CLIENT_ID: "id-1", FIXTURE_OAUTH_CLIENT_SECRET: "secret-1" };
    const fetchImpl = async (url) => {
      const target = new URL(url);
      if (target.href === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "at-1", refresh_token: "rt-1", scope: "a" });
      if (target.pathname === "/youtube/v3/channels") return jsonResponse({ items: [{ id: spec.youtubeChannelId, snippet: { title: "Fixture Channel" } }] });
      throw new Error(`unhandled fake google request: ${target.href}`);
    };
    let consentUrl;
    const result = await authorizeChannel({
      spec, out: outPath, environment, fetchImpl, createServer,
      requestAuthorization: (url) => {
        consentUrl = url;
        queueMicrotask(() => deliver({ url: `/?code=code-1&state=${new URL(url).searchParams.get("state")}` }, fakeRes()));
      },
    });
    assert.equal(result.channelId, spec.youtubeChannelId);
    assert.equal(result.channelTitle, "Fixture Channel");
    assert.equal(result.outPath, outPath);
    assert.equal(Object.hasOwn(result, "refreshToken"), false);
    assert.match(consentUrl, /youtube\.upload/);
    const contents = await readFile(outPath, "utf8");
    assert.equal(contents, "rt-1\n");
    await chmod(outPath, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("authorizeChannel refuses a spec with no youtubeChannelId to verify against", async () => {
  const { title: _title, youtubeChannelId: _youtubeChannelId, ...withoutChannelId } = spec;
  await assert.rejects(authorizeChannel({ spec: { ...withoutChannelId, title: spec.title }, out: "/dev/null" }), /youtubeChannelId/);
});

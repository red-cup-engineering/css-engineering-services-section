#!/usr/bin/env node
/**
 * @module authorize-channel
 * Loopback OAuth consent flow for one channel spec: prints the consent
 * URL, receives the redirect, exchanges the code, verifies the
 * authorized identity against `spec.youtubeChannelId`, and writes the
 * refresh token to `--out` (mode 0600) -- never to stdout.
 */
import { createHash, randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { createServer as nodeCreateServer } from "node:http";
import { observeAuthorizedChannel } from "@red-cup-engineering/youtube-services-section";
import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { authorizedFetch } from "../src/google-oauth.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

/** The scopes this section's production stages need. */
export const REQUIRED_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
]);

/**
 * Builds the Google OAuth consent URL for a PKCE authorization-code
 * request against a loopback redirect.
 * @param {{clientId: string, redirectUri: string, scopes: string[], state: string, challenge: string}} options
 * @returns {string}
 */
export function buildConsentUrl({ clientId, redirectUri, scopes, state, challenge }) {
  return `${AUTHORIZATION_ENDPOINT}?${new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: scopes.join(" "),
    access_type: "offline", include_granted_scopes: "true", prompt: "select_account consent",
    state, code_challenge: challenge, code_challenge_method: "S256",
  })}`;
}

/**
 * Listens on an ephemeral 127.0.0.1 port for the OAuth redirect, then
 * resolves the authorization code once a request carries the matching
 * `state`. Calls `onListening(redirectUri)` synchronously once bound.
 * @param {{createServer?: typeof nodeCreateServer, state: string, timeoutMs?: number, onListening: (redirectUri: string) => void}} options
 * @returns {Promise<{code: string, redirectUri: string}>}
 * @throws {Error} on a state mismatch, an OAuth-reported error, a missing code, or a timeout
 */
export function receiveAuthorizationCode({ createServer = nodeCreateServer, state, timeoutMs = 300_000, onListening }) {
  return new Promise((resolvePromise, reject) => {
    let settled = false;
    let redirectUri;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (server.listening) { server.close(); server.closeAllConnections?.(); }
      fn(value);
    };
    const server = createServer((req, res) => {
      if (settled || !redirectUri) { res.writeHead(410); res.end("Expired OAuth listener."); return; }
      const url = new URL(req.url, redirectUri);
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (returnedState !== state) {
        res.writeHead(400); res.end("Invalid state.");
        finish(reject, new Error("OAuth state mismatch"));
      } else if (error) {
        res.writeHead(400); res.end("Authorization refused.");
        finish(reject, new Error(`OAuth refused: ${error}`));
      } else if (code) {
        res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" });
        res.end("Authorized. You may close this window.");
        finish(resolvePromise, { code, redirectUri });
      } else {
        res.writeHead(400); res.end("Missing code.");
        finish(reject, new TypeError("OAuth callback carried no code"));
      }
    });
    const timer = setTimeout(() => finish(reject, new Error("OAuth loopback timed out")), timeoutMs);
    server.once("error", (error) => finish(reject, error));
    server.listen(0, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      onListening(redirectUri);
    });
  });
}

/**
 * Exchanges an authorization code (with its PKCE verifier) for tokens.
 * @param {{code: string, redirectUri: string, verifier: string, clientId: string, clientSecret: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{access_token: string, refresh_token: string, scope?: string}>}
 * @throws {Error} on a failed exchange or an incomplete grant
 */
export async function exchangeCodeForTokens({ code, redirectUri, verifier, clientId, clientSecret, fetchImpl = fetch }) {
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code_verifier: verifier, grant_type: "authorization_code" }),
  });
  if (!response.ok) throw new Error(`token exchange failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const tokens = await response.json();
  if (!tokens.access_token || !tokens.refresh_token) throw new TypeError("token exchange returned incomplete credentials (request offline access with prompt=consent)");
  return tokens;
}

/**
 * Confirms the identity a human actually picked in Google's account
 * chooser is the channel this program was told to authorize.
 * @param {{accessToken: string, expectedChannelId: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{id: string, title: string}>}
 * @throws {Error} naming the wrongly-picked channel when identities diverge
 */
export async function verifyAuthorizedIdentity({ accessToken, expectedChannelId, fetchImpl = fetch }) {
  const call = authorizedFetch(accessToken, fetchImpl);
  const channel = await observeAuthorizedChannel({ authorizedFetch: call });
  if (channel.id !== expectedChannelId) {
    throw new Error(`Google's account chooser authorized "${channel.title}" (${channel.id}), not the configured channel ${expectedChannelId} -- rerun and pick the correct channel`);
  }
  return channel;
}

/**
 * Writes a refresh token to disk, mode 0600, and only there -- never
 * returned to a caller or written to stdout.
 * @param {{outPath: string, refreshToken: string}} options
 * @returns {Promise<string>} outPath
 */
export async function writeRefreshTokenFile({ outPath, refreshToken }) {
  await writeFile(outPath, `${refreshToken}\n`, { mode: 0o600 });
  await chmod(outPath, 0o600);
  return outPath;
}

function requiredEnv(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value === "") throw new TypeError(`authorize-channel requires environment variable ${name}`);
  return value;
}

/**
 * Runs the full loopback consent flow for one channel spec: builds the
 * consent URL, waits for the redirect, exchanges the code, verifies the
 * authorized identity against `spec.youtubeChannelId`, and writes the
 * refresh token to `out`. The return value never carries the token.
 * @param {{spec: object, out: string, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, createServer?: typeof nodeCreateServer, timeoutMs?: number, scopes?: string[], requestAuthorization?: (url: string, redirectUri: string) => void}} options
 * @returns {Promise<{channelId: string, channelTitle: string, outPath: string}>}
 * @throws {TypeError} when the spec carries no `youtubeChannelId` to verify against, or a required secret env var is absent
 */
export async function authorizeChannel({
  spec, out, environment = process.env, fetchImpl = fetch, createServer = nodeCreateServer,
  timeoutMs = 300_000, scopes = REQUIRED_SCOPES,
  requestAuthorization = (url) => console.error(`Authorize in your browser:\n\n${url}\n`),
} = {}) {
  const validSpec = validateChannelSpec(spec);
  if (!validSpec.youtubeChannelId) throw new TypeError(`authorize-channel requires spec ${validSpec.id} to declare youtubeChannelId, so the authorized identity can be verified`);
  if (!out) throw new TypeError("authorize-channel requires --out, the file the refresh token is written to");
  const clientId = requiredEnv(environment, validSpec.secrets.oauthClientIdName);
  const clientSecret = requiredEnv(environment, validSpec.secrets.oauthClientSecretName);
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  const { code, redirectUri } = await receiveAuthorizationCode({
    createServer, state, timeoutMs,
    onListening: (uri) => requestAuthorization(buildConsentUrl({ clientId, redirectUri: uri, scopes, state, challenge }), uri),
  });
  const tokens = await exchangeCodeForTokens({ code, redirectUri, verifier, clientId, clientSecret, fetchImpl });
  const channel = await verifyAuthorizedIdentity({ accessToken: tokens.access_token, expectedChannelId: validSpec.youtubeChannelId, fetchImpl });
  const outPath = await writeRefreshTokenFile({ outPath: out, refreshToken: tokens.refresh_token });
  return { channelId: channel.id, channelTitle: channel.title, outPath };
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const out = argument("--out", argv);
  if (!specPath || !out) throw new Error("usage: authorize-channel.mjs --spec <path> --out <path>");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const result = await authorizeChannel({ spec, out });
  return `authorized ${result.channelTitle} (${result.channelId}); refresh token written to ${result.outPath}\n`;
}

runMain(main, { moduleUrl: import.meta.url, formatResult: (result) => result, exitCode: 1 });

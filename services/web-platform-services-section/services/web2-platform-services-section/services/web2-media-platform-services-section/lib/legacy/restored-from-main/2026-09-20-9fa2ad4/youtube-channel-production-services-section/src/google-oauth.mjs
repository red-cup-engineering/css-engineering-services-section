/**
 * @module google-oauth
 * The one Google OAuth refresh-token exchange and bounded authorized-fetch
 * capability this section needs -- the piece each of the five prior
 * channel packages duplicated locally (`refreshAccessToken`/
 * `authorizedFetch` in each channel's own `private-draft-pilot.mjs`).
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_API_HOST = "www.googleapis.com";

/**
 * OAuth scopes the automated production run path (`publishChannelVideo`
 * in `scripts/publish-video.mjs`: channel identity, `videos.insert` with
 * `status.publishAt` in the same call, `videos.list` polling, and
 * `thumbnails.set`) actually needs -- never the full mutating `youtube`
 * scope `videos.update` requires, which the run path never calls. The
 * analytics stage (`scripts/collect-analytics.mjs`) checks its own
 * `yt-analytics.readonly` scope separately.
 */
export const RUN_REQUIRED_SCOPES = Object.freeze([
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
]);

/**
 * Exchanges a stored refresh token for a short-lived access token.
 * @param {{clientId: string, clientSecret: string, refreshToken: string}} credentials
 * @param {{fetchImpl?: typeof fetch, requiredScopes?: string[]}} [options]
 * @returns {Promise<string>} the access token
 * @throws {TypeError} on incomplete credentials, a failed exchange, or a missing required scope
 */
export async function refreshAccessToken({ clientId, clientSecret, refreshToken } = {}, { fetchImpl = fetch, requiredScopes = [] } = {}) {
  if (![clientId, clientSecret, refreshToken].every((value) => typeof value === "string" && value)) throw new TypeError("refreshAccessToken requires complete OAuth credentials");
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST", redirect: "error",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error(`OAuth refresh failed ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const value = await response.json();
  if (!value.access_token) throw new TypeError("OAuth refresh returned no access token");
  const granted = new Set(String(value.scope ?? "").split(/\s+/u).filter(Boolean));
  const missing = requiredScopes.filter((scope) => !granted.has(scope));
  if (missing.length) throw new TypeError(`OAuth refresh lacks required scope(s): ${missing.join(", ")}`);
  return value.access_token;
}

/**
 * Wraps an access token as a bounded fetch capability: only plain HTTPS
 * requests to `www.googleapis.com` may pass, and a caller may never
 * supply its own `authorization` header.
 * @param {string} accessToken
 * @param {typeof fetch} [fetchImpl]
 * @returns {(url: string, init?: object) => Promise<Response>}
 */
export function authorizedFetch(accessToken, fetchImpl = fetch) {
  return (url, init = {}) => {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.hostname !== GOOGLE_API_HOST || target.username || target.password) {
      throw new TypeError("channel capability refuses a foreign carrier");
    }
    const headers = new Headers(init.headers);
    if (headers.has("authorization")) throw new TypeError("caller may not supply channel authorization");
    headers.set("authorization", `Bearer ${accessToken}`);
    return fetchImpl(target.href, { ...init, headers });
  };
}

/**
 * Resolves a channel's three OAuth secret names against an environment,
 * refusing cleanly (rather than mid-upload) when any is absent.
 * @param {{oauthClientIdName: string, oauthClientSecretName: string, refreshTokenName: string}} secrets
 * @param {NodeJS.ProcessEnv} environment
 * @returns {{clientId: string, clientSecret: string, refreshToken: string}}
 * @throws {TypeError} listing every missing secret name
 */
export function resolveChannelSecrets(secrets, environment = process.env) {
  const names = { clientId: secrets.oauthClientIdName, clientSecret: secrets.oauthClientSecretName, refreshToken: secrets.refreshTokenName };
  const missing = Object.entries(names).filter(([, envName]) => typeof environment[envName] !== "string" || environment[envName] === "").map(([, envName]) => envName);
  if (missing.length) throw new TypeError(`channel production secrets are absent: ${missing.join(", ")}`);
  return { clientId: environment[names.clientId], clientSecret: environment[names.clientSecret], refreshToken: environment[names.refreshToken] };
}

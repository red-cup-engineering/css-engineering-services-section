/**
 * Validate one Google OAuth refresh-token grant against a required scope set and confirm it
 * authorizes the expected YouTube channel — without ever surfacing the access token, refresh
 * token, or client secret in its result.
 *
 * Every caller supplies its own credential env-var names, expected channel id, and required
 * scopes; this module owns only the wire protocol (refresh-token exchange, then
 * `channels?mine=true` identity confirmation) and the shared refusal taxonomy, so a channel's
 * own config (its channel id, its env var names, its scope list) never has to fork the protocol
 * to vary.
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CHANNEL_ENDPOINT = "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true";
/** A real YouTube channel id is always exactly `UC` plus 22 base64url characters (24 total). */
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/u;

function invalid(reason) {
  return { classification: "invalid", reason };
}

/**
 * @param {object} input
 * @param {Record<string, string | undefined>} input.env
 * @param {string} input.expectedChannelId
 * @param {string} input.clientIdEnvName
 * @param {string} input.clientSecretEnvName
 * @param {string} input.refreshTokenEnvName
 * @param {readonly string[]} input.requiredScopes
 * @param {typeof fetch} [input.fetchImpl]
 * @returns {Promise<
 *   | { classification: "valid", channel: string, declaredScopes: readonly string[], tokenScopes: readonly string[] | null }
 *   | { classification: "invalid", reason: "channel-contract" | "missing-credential" | "token-rejected" | "scope-contract-mismatch" | "channel-rejected" | "channel-mismatch" | "provider-unavailable" }
 * >}
 */
export async function validateOAuthAuthority({
  env,
  expectedChannelId,
  clientIdEnvName,
  clientSecretEnvName,
  refreshTokenEnvName,
  requiredScopes,
  fetchImpl = fetch,
}) {
  if (typeof expectedChannelId !== "string" || !CHANNEL_ID_RE.test(expectedChannelId)) return invalid("channel-contract");
  const requiredNames = [clientIdEnvName, clientSecretEnvName, refreshTokenEnvName];
  if (!env || requiredNames.some((name) => typeof env[name] !== "string" || env[name].length === 0)) return invalid("missing-credential");
  try {
    const tokenResponse = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env[clientIdEnvName],
        client_secret: env[clientSecretEnvName],
        refresh_token: env[refreshTokenEnvName],
        grant_type: "refresh_token",
      }),
    });
    if (!tokenResponse.ok) return invalid("token-rejected");
    const token = await tokenResponse.json();
    if (typeof token?.access_token !== "string" || token.access_token.length === 0) return invalid("token-rejected");
    const tokenScopes = String(token.scope ?? "").split(/\s+/u).filter(Boolean);
    if (tokenScopes.length > 0 && requiredScopes.some((scope) => !tokenScopes.includes(scope))) return invalid("scope-contract-mismatch");
    const channelResponse = await fetchImpl(CHANNEL_ENDPOINT, {
      method: "GET",
      headers: { authorization: `Bearer ${token.access_token}`, accept: "application/json" },
      redirect: "error",
    });
    if (!channelResponse.ok) return invalid("channel-rejected");
    const identity = await channelResponse.json();
    if (!Array.isArray(identity?.items) || identity.items.length !== 1 || identity.items[0]?.id !== expectedChannelId) return invalid("channel-mismatch");
    return {
      classification: "valid",
      channel: expectedChannelId,
      declaredScopes: Object.freeze([...requiredScopes]),
      tokenScopes: tokenScopes.length > 0 ? Object.freeze(tokenScopes) : null,
    };
  } catch {
    return invalid("provider-unavailable");
  }
}

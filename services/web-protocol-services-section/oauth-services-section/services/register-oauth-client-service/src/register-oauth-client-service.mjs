// registerOAuthClient — client metadata -> client record (RFC 7591).
//
// Moved verbatim from OAuthServer.registerClient() in
// organizing-with-the-web/src/oauth-google/oauth.mts (the `randomToken` helper
// and the body of the method). The original method also inserted the record
// into `this.clients` and persisted it to disk; here that is left to the
// caller (state in, state out) — this function only performs the
// transformation, body -> minted client record.

import crypto from "node:crypto";

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * @param {Record<string, unknown>} body the RFC 7591 registration request body
 * @returns {{
 *   client_id: string,
 *   client_secret: string,
 *   redirect_uris: string[],
 *   client_name: string | undefined,
 *   grant_types: string[],
 *   response_types: string[],
 *   token_endpoint_auth_method: string,
 *   client_id_issued_at: number,
 *   client_secret_expires_at: number,
 * }}
 */
export function registerOAuthClient(body) {
  const clientId = `client_${randomToken(12)}`;
  const now = Math.floor(Date.now() / 1000);
  const client = {
    client_id: clientId,
    client_secret: randomToken(24),
    redirect_uris: Array.isArray(body["redirect_uris"])
      ? body["redirect_uris"].map((u) => String(u))
      : [],
    client_name: typeof body["client_name"] === "string" ? body["client_name"] : undefined,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
  return { ...client, client_id_issued_at: now, client_secret_expires_at: 0 };
}

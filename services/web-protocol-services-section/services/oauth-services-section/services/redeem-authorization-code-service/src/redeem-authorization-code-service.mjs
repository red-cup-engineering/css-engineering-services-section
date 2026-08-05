// redeemAuthorizationCode — code + PKCE verifier + pending record -> bearer
// token record. mintBearerTokenRecord — the shared token-minting primitive
// both this redemption and refresh-token rotation reduce to.
//
// Moved from OAuthServer.exchangeCode() and the private mintTokens() helper in
// organizing-with-the-web/src/oauth-google/oauth.mts, plus the private
// verifyPkce() helper it depended on. The class also has rotateRefreshToken(),
// which shares mintTokens() but was not given its own seat in this section (the
// task's fixed service list has one for redeeming a code, none for rotating a
// refresh token) — that method's own validation stays a thin composition in
// oauth.mts, reusing mintBearerTokenRecord exported here rather than
// duplicating it. See the oauth-google index.mts rewrite for how the two compose.

import crypto from "node:crypto";

import { OAuthError } from "@red-cup-engineering/oauth-services-section";

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function verifyPkce(verifier, challenge) {
  const hash = crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
  return hash === challenge;
}

/**
 * @param {{
 *   record: { client_id: string, redirect_uri: string, code_challenge: string, email: string, expires_at: number } | undefined,
 *   clientId: string,
 *   codeVerifier: string,
 *   redirectUri: string,
 *   now?: number,
 * }} params
 */
export function redeemAuthorizationCode(params) {
  const { record, clientId, codeVerifier, redirectUri, now = Date.now() } = params;
  if (!record || record.expires_at < now) {
    throw new OAuthError("invalid_grant", "code invalid or expired");
  }
  if (record.client_id !== clientId) throw new OAuthError("invalid_grant", "client_id mismatch");
  if (record.redirect_uri !== redirectUri) throw new OAuthError("invalid_grant", "redirect_uri mismatch");
  if (!verifyPkce(codeVerifier, record.code_challenge)) {
    throw new OAuthError("invalid_grant", "PKCE verification failed");
  }
  return mintBearerTokenRecord(record.client_id, record.email);
}

/**
 * @param {string} clientId
 * @param {string} email
 * @param {number} [now]
 * @returns {{
 *   accessToken: string, refreshToken: string,
 *   tokenRecord: { client_id: string, email: string, expires_at: number },
 *   refreshRecord: { client_id: string, email: string, expires_at: number },
 *   response: { access_token: string, refresh_token: string, token_type: string, expires_in: number },
 * }}
 */
export function mintBearerTokenRecord(clientId, email, now = Date.now()) {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);
  return {
    accessToken,
    refreshToken,
    tokenRecord: { client_id: clientId, email, expires_at: now + 3_600_000 },
    refreshRecord: { client_id: clientId, email, expires_at: now + 2_592_000_000 },
    response: { access_token: accessToken, refresh_token: refreshToken, token_type: "Bearer", expires_in: 3600 },
  };
}

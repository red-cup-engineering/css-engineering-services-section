// exchangeGoogleCallback — google callback code + google client config ->
// identity claims.
//
// Moved from the middle of OAuthServer.completeAuthorization() in
// organizing-with-the-web/src/oauth-google/oauth.mts: the POST to
// oauth2.googleapis.com/token, the "Google token exchange failed" and "no email
// in Google response" errors, and the private extractIdentity() helper that
// decodes the id_token payload. Left OUT of this service (they stay in the
// composition layer, oauth.mts): the pending-state Map lookup/deletion before
// this runs, and — after this returns — the emailVerified/admit checks (moved
// to judge-principal-admission-service) and this server's own authorization-code
// minting, which is state (a Map insert) the composition layer owns.

import { OAuthError } from "@red-cup-engineering/oauth-services-section";

/** @typedef {{ email: string, emailVerified: boolean }} Identity */

/** @returns {Identity | null} */
function extractIdentity(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf-8"));
    if (typeof payload["email"] !== "string") return null;
    // Google sends email_verified as a boolean or the string "true"; treat a
    // missing claim as verified (Google only omits it for legacy tokens).
    const raw = payload["email_verified"];
    const emailVerified = raw === undefined || raw === true || raw === "true";
    return { email: payload["email"], emailVerified };
  } catch {
    return null;
  }
}

/**
 * @param {string} googleCode
 * @param {{ googleClientId: string, googleClientSecret: string, publicBaseUrl: string }} config
 * @returns {Promise<Identity>}
 */
export async function exchangeGoogleCallback(googleCode, config) {
  const { googleClientId, googleClientSecret, publicBaseUrl } = config;
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: googleCode,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: `${publicBaseUrl}/oauth/google/callback`,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!tokenResp.ok) throw new OAuthError("server_error", "Google token exchange failed");

  const data = await tokenResp.json();
  const identity = data.id_token ? extractIdentity(data.id_token) : null;
  if (!identity) throw new OAuthError("server_error", "no email in Google response");
  return identity;
}

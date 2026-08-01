// mintAuthorizationRequest — client record + redirect-uri + PKCE challenge ->
// pending authorization record.
//
// Moved from the first two-thirds of OAuthServer.startAuthorization() in
// organizing-with-the-web/src/oauth-google/oauth.mts: the client_id/redirect_uri/
// PKCE-method validation and the pending-record shape (client_id, redirect_uri,
// code_challenge, state, expires_at), keyed by a freshly minted state token. The
// original method also looked `params.client_id` up in `this.clients` (a Map) and
// then, in the same breath, built the redirect to Google — those are left to the
// caller: the Map lookup because it is a state read the caller owns, and the
// Google redirect because it is a distinct transformation, now
// relay-to-google-consent-service in the sibling google-oauth-services-section.

import crypto from "node:crypto";

import { OAuthError } from "@red-cup-engineering/oauth-services-section";

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/**
 * @param {{
 *   client: { client_id: string, redirect_uris: string[] } | undefined,
 *   redirectUri: string,
 *   codeChallenge: string,
 *   codeChallengeMethod: string,
 *   state: string | undefined,
 * }} params
 * @returns {{ state: string, record: {
 *   client_id: string, redirect_uri: string, code_challenge: string,
 *   state: string | undefined, expires_at: number,
 * } }}
 */
export function mintAuthorizationRequest(params) {
  const { client, redirectUri, codeChallenge, codeChallengeMethod, state } = params;
  if (!client) {
    throw new OAuthError("invalid_client", "unknown client_id");
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    throw new OAuthError("invalid_request", "redirect_uri not registered");
  }
  if (codeChallengeMethod !== "S256") {
    throw new OAuthError("invalid_request", "only S256 PKCE is supported");
  }

  const authorizationState = randomToken(24);
  return {
    state: authorizationState,
    record: {
      client_id: client.client_id,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      state,
      expires_at: Date.now() + 600_000,
    },
  };
}

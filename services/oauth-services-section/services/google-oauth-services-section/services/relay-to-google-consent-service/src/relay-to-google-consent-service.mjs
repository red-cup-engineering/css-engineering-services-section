// relayToGoogleConsent — pending authorization + google client config -> consent
// redirect URL.
//
// Moved verbatim from the tail of OAuthServer.startAuthorization() in
// organizing-with-the-web/src/oauth-google/oauth.mts: the accounts.google.com
// URL-building block, once mint-authorization-request-service has already
// validated the client/redirect_uri/PKCE method and minted the pending record's
// state token.

/**
 * @param {{ state: string, googleClientId: string, publicBaseUrl: string }} params
 * @returns {string}
 */
export function relayToGoogleConsent(params) {
  const { state, googleClientId, publicBaseUrl } = params;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleClientId);
  url.searchParams.set("redirect_uri", `${publicBaseUrl}/oauth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  return url.toString();
}

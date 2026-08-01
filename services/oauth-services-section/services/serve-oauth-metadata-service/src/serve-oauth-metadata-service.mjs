// oauthAuthorizationServerMetadata — publicBaseUrl -> RFC 8414 document.
// protectedResourceMetadata — resourceUrl + authorizationServer -> RFC 9728 document.
//
// oauthAuthorizationServerMetadata is moved from OAuthServer.metadata() in
// organizing-with-the-web/src/oauth-google/oauth.mts (the `this.config.publicBaseUrl`
// read becomes a parameter). protectedResourceMetadata is moved verbatim from
// organizing-with-the-web/src/oauth-google/index.mts, where it was already a
// free function with no class dependency.

/**
 * @param {string} publicBaseUrl
 * @returns {Record<string, unknown>}
 */
export function oauthAuthorizationServerMetadata(publicBaseUrl) {
  const base = publicBaseUrl;
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    revocation_endpoint: `${base}/oauth/revoke`,
    registration_endpoint: `${base}/oauth/register`,
    scopes_supported: ["openid"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  };
}

/**
 * @param {string} resourceUrl
 * @param {string} authorizationServer
 * @returns {Record<string, unknown>}
 */
export function protectedResourceMetadata(resourceUrl, authorizationServer) {
  return {
    resource: resourceUrl,
    authorization_servers: [authorizationServer.replace(/\/$/, "")],
  };
}

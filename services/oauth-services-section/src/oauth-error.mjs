// OAuthError — the one RFC 6749 error shape every service in oauth-services-section
// throws. Moved verbatim (byte-for-byte) from
// organizing-with-the-web/src/oauth-google/oauth.mts, where it was defined inline
// in the monolith.
//
// It lives here, at the section root, rather than inside any one atomic service,
// because more than one service throws it (mint-authorization-request-service,
// redeem-authorization-code-service, exchange-google-callback-service) and the
// transport layer (oauth-app.mts) tells errors apart with `instanceof OAuthError`.
// If each service defined its own copy of this class, `instanceof` would fail
// across service boundaries even though the shape is identical — a different
// class per module has a different identity in JS. One canonical export, symlinked
// into every consumer, keeps that identity check true.

export class OAuthError extends Error {
  code;
  description;
  constructor(code, description = "") {
    super(`${code}: ${description}`);
    this.code = code;
    this.description = description;
  }
}

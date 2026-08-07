// validateBearerToken — token + token state -> identity claims | null.
//
// Moved verbatim from OAuthServer.validateToken() in
// organizing-with-the-web/src/oauth-google/oauth.mts. The class's private
// `tokens` Map becomes an explicit parameter (state in, state out): the caller
// still owns the store, this function only performs the lookup-and-shape
// transformation.

/**
 * @param {string} token
 * @param {Map<string, { client_id: string, email: string, expires_at: number }>} tokens
 * @param {number} [now]
 * @returns {{ client_id: string, email: string } | null}
 */
export function validateBearerToken(token, tokens, now = Date.now()) {
  const record = tokens.get(token);
  if (!record || record.expires_at < now) return null;
  return { client_id: record.client_id, email: record.email };
}

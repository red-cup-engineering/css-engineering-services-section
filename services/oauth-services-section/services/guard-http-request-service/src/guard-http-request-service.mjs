// guardHttpRequest — request headers + validate fn + judge fn -> decision.
//
// This is NOT lifted from the oauth-google monolith — it has no OAuthServer
// method of its own. It is extracted from the SHAPE of the guard() closure at
// lib/.../bare-cedar-fog.561.group/src/server.mts lines 35-42:
//
//   function guard(inner: Handler): Handler { return async (ctx: Context) => {
//     const authorization = ctx.req.headers.authorization;
//     const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : undefined;
//     const claims = token ? oauth.validateToken(token) : null;
//     const status = !token ? 401 : claims?.email === allowedEmail ? 200 : 403;
//     ...
//   }; }
//
// That closure hard-codes two things this die takes as parameters instead:
// `oauth.validateToken` (the validate die — see validate-bearer-token-service)
// and `claims?.email === allowedEmail` (the judge die — see
// judge-principal-admission-service, whose resolveAdmissionPolicy produces
// exactly this predicate shape). What's left, once both are parameters, is the
// header-parsing and status-computation shape common to every site that guards
// a resource this way (bare-cedar-fog.561.group, and the aagaard.561.group
// legacy fork's own inlined guard()) — this service is that shape, made pure,
// with the site-specific WWW-Authenticate realm/resource_metadata left to the
// transport layer that renders `challenge` into a header.

/**
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {(token: string) => unknown} validate token -> identity claims | null
 * @param {(claims: unknown) => boolean} judge claims -> admitted?
 * @returns {{ status: 200, challenge: undefined, claims: unknown } | { status: 401 | 403, challenge: string, claims: null }}
 */
export function guardHttpRequest(headers, validate, judge) {
  const authorization = headers?.authorization ?? headers?.Authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) return { status: 401, challenge: "bearer token required", claims: null };

  const claims = validate(token);
  if (!judge(claims)) return { status: 403, challenge: "principal not admitted", claims: null };

  return { status: 200, challenge: undefined, claims };
}

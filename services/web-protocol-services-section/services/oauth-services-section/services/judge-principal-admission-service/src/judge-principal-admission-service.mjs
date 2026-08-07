// resolveAdmissionPolicy — config -> policy die (email -> boolean).
// judgePrincipalAdmission — identity claims + policy die -> admitted | refused.
//
// resolveAdmissionPolicy is moved verbatim from the ternary chain in the
// OAuthServer constructor in organizing-with-the-web/src/oauth-google/oauth.mts
// that computed `this.admit` — the allowedEmail check the task calls out,
// extracted as its own policy die rather than left inline.
//
// judgePrincipalAdmission is moved from the two admission guards inside
// OAuthServer.completeAuthorization() (`if (!identity.emailVerified) throw ...`
// and `if (!this.admit(identity.email)) throw ...`), reshaped from throwing into
// a pure admitted/refused result — the OAuthError conversion (both refusals map
// to the same "access_denied" code in the original) is left to the caller, since
// throwing is a control-flow choice the composition layer makes, not a fact
// about admission itself.

/**
 * @param {{ admitEmail?: (email: string) => boolean, allowedEmail?: string }} config
 * @returns {(email: string) => boolean}
 */
export function resolveAdmissionPolicy(config) {
  const allowedEmail = config.allowedEmail;
  return config.admitEmail
    ? config.admitEmail
    : allowedEmail !== undefined
      ? (email) => email.toLowerCase() === allowedEmail.toLowerCase()
      : () => true;
}

/**
 * @param {{ email: string, emailVerified: boolean }} identity
 * @param {(email: string) => boolean} admit
 * @returns {{ admitted: true, email: string } | { admitted: false, reason: string }}
 */
export function judgePrincipalAdmission(identity, admit) {
  if (!identity.emailVerified) return { admitted: false, reason: "email not verified" };
  if (!admit(identity.email)) return { admitted: false, reason: "account not authorized" };
  return { admitted: true, email: identity.email };
}

/**
 * Cookie representation codecs.
 *
 * Three encode/decode pairs are exported here:
 *
 * - cookie request headers, between records and header text
 * - `Set-Cookie` response fields, between cookie records and field text
 * - signed cookie values, between plain values and `value.signature` text
 *
 * These pairs are representation retractions over the grammar they accept:
 * parsing after serialization recovers the semantic value, while parsing alone
 * normalizes the wire form or rejects what does not inhabit the cookie grammar.
 * Transport is not represented here; attaching these texts to request and
 * response objects is the adapter's job.
 *
 * @packageDocumentation
 */

export { parseCookieHeader, serializeCookieHeader } from "./cookie-header.mjs";

export { parseSetCookie, serializeSetCookie } from "./set-cookie.mjs";
export type { CookieOptions, CookiePriority, SameSite, SetCookie } from "./set-cookie.mjs";

export { signCookieValue, unsignCookieValue } from "./signed-value.mjs";

export { assertCookieName, isCookieName } from "./grammar.mjs";

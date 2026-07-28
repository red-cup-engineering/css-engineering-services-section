// content-type.mts — the Content-Type field (RFC 9110 §8.3).
//
// Semantic value: a media type with its parameters. Wire form: the
// field text. The pair is a RETRACTION: parseContentType lowercases
// the type and parameter names and forgets quoting style, so
// parseContentType ∘ serializeContentType = id on parsed values.

import { firstHeader, quoteHeaderValue, splitHeaderParameters, unquoteHeaderValue, type HeaderValue } from "./header-value.mjs";

/**
 * Parsed Content-Type value.
 *
 * `type` is the lowercased media type. Parameter names are lowercased and
 * parameter values are unquoted; quoting style and original case are wire-form
 * details and are not retained.
 */
export type ContentType = Readonly<{
  type: string;
  params: Readonly<Record<string, string>>;
}>;

/**
 * Parse a Content-Type field value into a normalized media type record.
 *
 * Repeated field values use the first line. Missing, empty, or structurally
 * empty values return `null`. This parser is permissive about parameter values
 * and is meant to read representation metadata, not to authorize uploads.
 */
export function parseContentType(value: HeaderValue): ContentType | null {
  const raw = firstHeader(value)?.trim();
  if (!raw) return null;
  const parts = splitHeaderParameters(raw);
  const type = (parts.shift() ?? "").trim().toLowerCase();
  if (!type) return null;
  const params: Record<string, string> = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    if (!key) continue;
    params[key] = unquoteHeaderValue(part.slice(eq + 1).trim());
  }
  return Object.freeze({ type, params: Object.freeze(params) });
}

const TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/**
 * Serialize a normalized Content-Type value.
 *
 * Parameter values that are valid HTTP tokens are emitted bare; other values
 * are quoted with the shared header quoting helper. Parsing the result returns
 * the same normalized `ContentType` value.
 */
export function serializeContentType(contentType: ContentType): string {
  const params = Object.entries(contentType.params)
    .map(([key, value]) => `${key}=${TOKEN_RE.test(value) ? value : quoteHeaderValue(value)}`);
  return [contentType.type, ...params].join("; ");
}
